import asyncio
from datetime import datetime
import io
import logging
import os
import tempfile
from typing import Annotated, Any

import time
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, StreamingResponse
import httpx
from pydantic import BaseModel, Field
import yt_dlp

from ...core.database import col, sid
from ...services.audio_streaming import serve_audio, store_audio
from ...services.link_resolver import is_direct_audio_url, resolve_link
from ..dependencies import OptionalUser, require_admin

logger = logging.getLogger("jodify.links_router")

router = APIRouter(prefix="/api/links", tags=["links"])


class ResolveLinkRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=1500)


class SuggestSongRequest(BaseModel):
    url: str
    title: str
    artist: str | None = None
    album: str | None = None
    duration: float | None = None
    thumbnail: str | None = None
    stream_url: str | None = None
    notes: str | None = None


def suggestion_view(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": sid(doc.get("_id")),
        "url": doc.get("url"),
        "title": doc.get("title"),
        "artist": doc.get("artist"),
        "album": doc.get("album"),
        "duration": doc.get("duration"),
        "thumbnail": doc.get("thumbnail"),
        "stream_url": doc.get("stream_url"),
        "notes": doc.get("notes"),
        "suggested_by": doc.get("suggested_by", "Anónimo"),
        "created_at": doc.get("created_at"),
        "status": doc.get("status", "pending"),
    }


@router.post("/resolve")
async def resolve_music_link(body: ResolveLinkRequest) -> dict[str, Any]:
    try:
        result = await resolve_link(body.url)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error resolviendo enlace {body.url}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/suggest")
async def suggest_song(
    body: SuggestSongRequest,
    current_user: OptionalUser = None,
) -> dict[str, Any]:
    username = current_user.get("username") if current_user else "Anónimo"
    doc = {
        "url": body.url.strip(),
        "title": body.title.strip(),
        "artist": (body.artist or "Desconocido").strip(),
        "album": (body.album or "").strip(),
        "duration": body.duration,
        "thumbnail": body.thumbnail,
        "stream_url": body.stream_url,
        "notes": (body.notes or "").strip(),
        "suggested_by": username,
        "created_at": datetime.now().isoformat(),
        "status": "pending",
    }
    result = await col("song_suggestions").insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"success": True, "suggestion": suggestion_view(doc)}


@router.get("/suggestions")
async def get_suggestions(
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    query: dict[str, Any] = {}
    if status:
        query["status"] = status
    cursor = col("song_suggestions").find(query).sort("created_at", -1).limit(limit)
    return [suggestion_view(d) for d in await cursor.to_list(limit)]


@router.delete("/suggestions/{suggestion_id}", status_code=204)
async def delete_suggestion(
    suggestion_id: str,
    _admin: Annotated[dict, Depends(require_admin)],
) -> None:
    try:
        oid = ObjectId(suggestion_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    res = await col("song_suggestions").delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sugerencia no encontrada")


def _download_song_sync(url: str, output_path: str) -> tuple[str, str | None]:
    ydl_opts: dict[str, Any] = {
        "format": "bestaudio/best",
        "outtmpl": output_path + ".%(ext)s",
        "writethumbnail": True,
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "mweb"],
            }
        },
        "http_headers": {
            "User-Agent": "com.google.android.youtube/19.29.35 (Linux; U; Android 14; en_US; Pixel 7 Pro Build/UQ1A.240105.004) gzip",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
    }
    cookie_path = os.environ.get("YOUTUBE_COOKIES_PATH") or os.environ.get("COOKIES_FILE")
    if cookie_path and os.path.exists(cookie_path):
        ydl_opts["cookiefile"] = cookie_path

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        # Buscar thumbnail descargada si existe
        thumb_file = None
        base, _ = os.path.splitext(filename)
        for ext in (".jpg", ".png", ".webp", ".jpeg"):
            if os.path.exists(base + ext):
                thumb_file = base + ext
                break
        return filename, thumb_file


@router.post("/suggestions/{suggestion_id}/approve")
async def approve_and_add_to_database(
    suggestion_id: str,
    _admin: Annotated[dict, Depends(require_admin)],
) -> dict[str, Any]:
    """Descarga el audio del enlace sugerido y lo agrega directamente a MongoDB GridFS y canciones."""
    try:
        oid = ObjectId(suggestion_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    sug = await col("song_suggestions").find_one({"_id": oid})
    if not sug:
        raise HTTPException(status_code=404, detail="Sugerencia no encontrada")

    target_url = sug.get("url")
    title = sug.get("title") or "Canción Sugerida"
    artist = sug.get("artist") or "Desconocido"

    loop = asyncio.get_running_loop()
    temp_dir = tempfile.mkdtemp()
    base_target = os.path.join(temp_dir, "audio")

    try:
        # Descarga el audio usando yt-dlp con clientes android/ios
        downloaded_file, thumb_file = await loop.run_in_executor(
            None, _download_song_sync, target_url, base_target
        )

        with open(downloaded_file, "rb") as f:
            audio_bytes = f.read()

        filename = os.path.basename(downloaded_file)
        audio_fid = await store_audio(filename, "audio/mpeg", audio_bytes)

        cover_fid = None
        if thumb_file and os.path.exists(thumb_file):
            with open(thumb_file, "rb") as cf:
                cover_bytes = cf.read()
            cover_fid = await store_audio("cover.jpg", "image/jpeg", cover_bytes)
        elif sug.get("thumbnail"):
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(sug["thumbnail"])
                    if resp.status_code == 200:
                        cover_fid = await store_audio("cover.jpg", "image/jpeg", resp.content)
            except Exception:
                pass

        # Crear documento de canción en la DB
        song_doc = {
            "name": title,
            "artist": artist,
            "album": sug.get("album") or "Sugerencias de la Comunidad",
            "url": "",
            "likes": 1,
            "added_by": sug.get("suggested_by") or _admin.get("username"),
            "created_at": datetime.now().isoformat(),
            "audio_file_id": audio_fid,
            "play_count": 0,
        }
        if cover_fid:
            song_doc["cover_file_id"] = cover_fid

        ins = await col("songs").insert_one(song_doc)
        song_doc["_id"] = ins.inserted_id

        # Marcar sugerencia aprobada
        await col("song_suggestions").update_one(
            {"_id": oid},
            {"$set": {"status": "approved", "approved_at": datetime.now().isoformat()}}
        )

        # Import local para vista de canción
        from .songs import invalidate_songs_cache, song_view
        invalidate_songs_cache()

        return {"success": True, "song": song_view(song_doc)}

    except Exception as e:
        logger.error(f"Error aprobando sugerencia: {e}")
        raise HTTPException(status_code=500, detail=f"Error al descargar y guardar en la base de datos: {str(e)}")
    finally:
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


_STREAM_CACHE: dict[str, tuple[str, float, dict[str, str]]] = {}


def _get_raw_stream_url(url: str) -> tuple[str, dict[str, str]]:
    now = time.time()
    if url in _STREAM_CACHE:
        cached_url, exp, cached_headers = _STREAM_CACHE[url]
        if now < exp:
            return cached_url, cached_headers

    is_search = url.startswith("ytsearch")
    ydl_opts: dict[str, Any] = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": False if is_search else True,
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "mweb"],
            }
        },
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
    }
    cookie_path = os.environ.get("YOUTUBE_COOKIES_PATH") or os.environ.get("COOKIES_FILE")
    if cookie_path and os.path.exists(cookie_path):
        ydl_opts["cookiefile"] = cookie_path

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        target_info = info
        if "entries" in info and info["entries"]:
            target_info = info["entries"][0] or info

        stream_url = target_info.get("url")
        if not stream_url and "formats" in target_info:
            audio_formats = [
                f for f in target_info["formats"]
                if f.get("acodec") != "none" and (f.get("vcodec") == "none" or "audio" in f.get("format", "").lower())
            ]
            if audio_formats:
                stream_url = audio_formats[-1].get("url")
            elif target_info["formats"]:
                stream_url = target_info["formats"][-1].get("url")

        if not stream_url:
            raise ValueError("No se pudo obtener el flujo de audio del enlace")

        raw_headers = target_info.get("http_headers") or info.get("http_headers") or {}
        headers_dict = {str(k): str(v) for k, v in raw_headers.items()}
        _STREAM_CACHE[url] = (stream_url, now + 3600, headers_dict)
        return stream_url, headers_dict


@router.get("/stream")
async def stream_audio_link(
    url: str = Query(...),
    request: Request = None,
):
    """Transmite audio de YouTube, SoundCloud o enlaces web directamente al reproductor con soporte de Range."""
    if is_direct_audio_url(url):
        return RedirectResponse(url)

    loop = asyncio.get_running_loop()
    try:
        raw_stream_url, upstream_headers = await loop.run_in_executor(None, _get_raw_stream_url, url)
    except Exception as exc:
        logger.error(f"Error extrayendo stream para {url}: {exc}")
        raise HTTPException(status_code=400, detail=f"No se pudo obtener el flujo de audio: {str(exc)}")

    client_headers: dict[str, str] = dict(upstream_headers)
    if request:
        range_header = request.headers.get("range")
        if range_header:
            client_headers["range"] = range_header

    try:
        client = httpx.AsyncClient(follow_redirects=True, timeout=30.0)
        req = client.build_request("GET", raw_stream_url, headers=client_headers)
        resp = await client.send(req, stream=True)

        if resp.status_code >= 400:
            # Cache bust si el URL expiró o fue rechazado y reintentar una vez
            _STREAM_CACHE.pop(url, None)
            await resp.aclose()
            await client.aclose()

            raw_stream_url, upstream_headers = await loop.run_in_executor(None, _get_raw_stream_url, url)
            client = httpx.AsyncClient(follow_redirects=True, timeout=30.0)
            client_headers = dict(upstream_headers)
            if request and (range_header := request.headers.get("range")):
                client_headers["range"] = range_header
            req = client.build_request("GET", raw_stream_url, headers=client_headers)
            resp = await client.send(req, stream=True)

        async def stream_generator():
            try:
                async for chunk in resp.aiter_bytes(chunk_size=64 * 1024):
                    yield chunk
            finally:
                await resp.aclose()
                await client.aclose()

        response_headers: dict[str, str] = {
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        }
        for h in ("content-type", "content-length", "content-range"):
            if val := resp.headers.get(h):
                response_headers[h] = val

        return StreamingResponse(
            stream_generator(),
            status_code=resp.status_code,
            headers=response_headers,
        )
    except Exception as exc:
        logger.error(f"Error transmitiendo stream para {url}: {exc}")
        raise HTTPException(status_code=500, detail="Error al transmitir el audio")


@router.get("/download-proxy")
async def download_proxy(
    url: str = Query(...),
    filename: str = Query("song.mp3"),
):
    """Proxy para descargar audio libremente sin bloqueos de navegador."""
    try:
        # Si es un enlace directo de audio
        if is_direct_audio_url(url):
            async def stream_audio_url():
                async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
                    async with client.stream("GET", url) as resp:
                        async for chunk in resp.aiter_bytes():
                            yield chunk

            safe_filename = filename.replace('"', "").replace("'", "")
            headers = {
                "Content-Disposition": f'attachment; filename="{safe_filename}"',
                "Content-Type": "audio/mpeg",
            }
            return StreamingResponse(stream_audio_url(), headers=headers)

        # Para YouTube u otras fuentes, descargar con yt-dlp y streamear
        loop = asyncio.get_running_loop()
        temp_dir = tempfile.mkdtemp()
        base_target = os.path.join(temp_dir, "audio")

        try:
            downloaded_file, _ = await loop.run_in_executor(
                None, _download_song_sync, url, base_target
            )

            def file_iterator():
                try:
                    with open(downloaded_file, "rb") as f:
                        while True:
                            chunk = f.read(64 * 1024)
                            if not chunk:
                                break
                            yield chunk
                finally:
                    import shutil
                    shutil.rmtree(temp_dir, ignore_errors=True)

            safe_filename = filename.replace('"', "").replace("'", "")
            if not safe_filename.endswith(".mp3"):
                safe_filename += ".mp3"
            headers = {
                "Content-Disposition": f'attachment; filename="{safe_filename}"',
                "Content-Type": "audio/mpeg",
            }
            return StreamingResponse(file_iterator(), headers=headers)

        except Exception as e:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise e

    except Exception as e:
        logger.error(f"Error en descarga de {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Error en descarga: {str(e)}")
