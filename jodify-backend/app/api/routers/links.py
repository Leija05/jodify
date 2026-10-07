import asyncio
from datetime import datetime
import io
import logging
import os
import tempfile
from typing import Annotated, Any

import time
import re
import urllib.parse
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, StreamingResponse
import httpx
from pydantic import BaseModel, Field
import yt_dlp

from ...core.database import col, sid
from ...services.audio_streaming import serve_audio, store_audio
from ...services.link_resolver import is_direct_audio_url, resolve_link
from ...services.stream_cache import global_stream_cache, global_import_manager
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
    youtube_id: str | None = None
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
        "youtube_id": doc.get("youtube_id"),
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
        "youtube_id": (body.youtube_id or "").strip() or None,
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
    }
    cookie_path = os.environ.get("YOUTUBE_COOKIES_PATH") or os.environ.get("COOKIES_FILE")
    if not cookie_path or not os.path.exists(cookie_path):
        cookie_text = os.environ.get("YOUTUBE_COOKIES_TEXT") or os.environ.get("YOUTUBE_COOKIES")
        if cookie_text:
            try:
                tmp_dir = tempfile.gettempdir()
                tmp_cookie_file = os.path.join(tmp_dir, "jodify_yt_cookies.txt")
                with open(tmp_cookie_file, "w", encoding="utf-8") as f:
                    f.write(cookie_text.replace("\\r\\n", "\n").replace("\\n", "\n"))
                cookie_path = tmp_cookie_file
            except Exception:
                pass
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
    """Aprueba la canción sugerida guardando su enlace y metadatos globalmente en la base de datos sin descarga en el servidor."""
    try:
        oid = ObjectId(suggestion_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    sug = await col("song_suggestions").find_one({"_id": oid})
    if not sug:
        raise HTTPException(status_code=404, detail="Sugerencia no encontrada")

    target_url = (sug.get("url") or "").strip()
    stream_url = (sug.get("stream_url") or "").strip()
    title = (sug.get("title") or "Canción Sugerida").strip()
    artist = (sug.get("artist") or "Desconocido").strip()
    album = (sug.get("album") or "Sugerencias de la Comunidad").strip()
    duration = sug.get("duration")
    thumbnail = sug.get("thumbnail")

    from ...services.link_resolver import extract_youtube_id, is_spotify_url, _search_youtube_video_id

    # 1. Determinar identificador de YouTube si es posible
    yt_id = (sug.get("youtube_id") or "").strip() or None
    is_spotify = is_spotify_url(target_url) or is_spotify_url(stream_url)

    if not yt_id and not is_spotify:
        yt_id = extract_youtube_id(target_url) or extract_youtube_id(stream_url)

    # Si es de Spotify o no tiene yt_id directo, buscar en YouTube por Artista y Título
    if not yt_id or is_spotify:
        try:
            matched_yt = await _search_youtube_video_id(f"{artist} {title}")
            if matched_yt:
                yt_id = matched_yt
        except Exception as exc:
            logger.warning(f"No se pudo resolver youtube_id para sugerencia: {exc}")

    cover_url = thumbnail or (f"https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg" if yt_id else None)
    effective_url = f"https://www.youtube.com/watch?v={yt_id}" if yt_id else (stream_url or target_url)
    source = "youtube" if yt_id else ("spotify" if is_spotify else "web")

    # 2. Comprobar si ya existe en la biblioteca global de canciones
    existing_query: dict[str, Any] = {}
    if yt_id:
        existing_query = {"youtube_id": yt_id}
    else:
        existing_query = {"name": title, "artist": artist}

    existing_song = await col("songs").find_one(existing_query)
    if existing_song:
        song_doc = existing_song
        await col("songs").update_one({"_id": existing_song["_id"]}, {"$inc": {"likes": 1}})
        song_doc["likes"] = song_doc.get("likes", 0) + 1
    else:
        # Crear documento de canción global en la base de datos
        song_doc = {
            "name": title,
            "artist": artist,
            "album": album,
            "url": effective_url,
            "youtube_id": yt_id,
            "cover_url": cover_url,
            "duration": duration,
            "likes": 1,
            "added_by": sug.get("suggested_by") or _admin.get("username") or "Comunidad",
            "created_at": datetime.now().isoformat(),
            "play_count": 0,
            "source": source,
        }
        ins = await col("songs").insert_one(song_doc)
        song_doc["_id"] = ins.inserted_id

    # 3. Marcar sugerencia como aprobada
    await col("song_suggestions").update_one(
        {"_id": oid},
        {"$set": {"status": "approved", "approved_at": datetime.now().isoformat()}}
    )

    # 4. Invalidar caché global de canciones para que aparezca en toda la app de inmediato
    from .songs import invalidate_songs_cache, song_view
    invalidate_songs_cache()

    return {"success": True, "song": song_view(song_doc)}


# Reemplazado por global_stream_cache (LRUAudioStreamCache con TTL de 4 horas y normalización)


def _select_progressive_audio(target_info: dict[str, Any]) -> str | None:
    formats = target_info.get("formats", [])
    if not formats:
        return target_info.get("url")

    # 1. Pistas de solo audio progresivas (Opus, AAC) sin HLS (.m3u8)
    audio_only = [
        f for f in formats
        if f.get("acodec") != "none"
        and f.get("vcodec") in (None, "none")
        and "m3u8" not in f.get("protocol", "")
        and not f.get("url", "").endswith(".m3u8")
        and f.get("url")
    ]
    if audio_only:
        return audio_only[-1]["url"]

    # 2. Pistas combinadas (ej: mp4 formato 18) sin m3u8
    any_audio = [
        f for f in formats
        if f.get("acodec") != "none"
        and "m3u8" not in f.get("protocol", "")
        and not f.get("url", "").endswith(".m3u8")
        and f.get("url")
    ]
    if any_audio:
        # Preferir formatos específicos de audio/video livianos (ej. formato 18 sobre streams de video pesado)
        for f in any_audio:
            if str(f.get("format_id")) in ("18", "139", "140", "251", "250", "249"):
                return f["url"]
        return any_audio[-1]["url"]

    # 3. Fallback a URL directa si no es m3u8
    for f in reversed(formats):
        if f.get("url") and not f.get("url", "").endswith(".m3u8"):
            return f["url"]

    return target_info.get("url")


def _get_raw_stream_url(url: str) -> tuple[str, dict[str, str]]:
    cached = global_stream_cache.get(url)
    if cached is not None:
        cached_url, cached_headers, _ = cached
        return cached_url, cached_headers

    now = time.time()

    is_search = url.startswith("ytsearch")
    cookie_path = os.environ.get("YOUTUBE_COOKIES_PATH") or os.environ.get("COOKIES_FILE")
    if not cookie_path or not os.path.exists(cookie_path):
        cookie_text = os.environ.get("YOUTUBE_COOKIES_TEXT") or os.environ.get("YOUTUBE_COOKIES")
        if cookie_text:
            try:
                tmp_dir = tempfile.gettempdir()
                tmp_cookie_file = os.path.join(tmp_dir, "jodify_yt_cookies.txt")
                with open(tmp_cookie_file, "w", encoding="utf-8") as f:
                    f.write(cookie_text.replace("\\r\\n", "\n").replace("\\n", "\n"))
                cookie_path = tmp_cookie_file
            except Exception as e:
                logger.warning(f"No se pudo guardar YOUTUBE_COOKIES_TEXT temporal: {e}")

    configs = [
        # Estrategia 1: Cliente estándar (con cookies tiene acceso inmediato a 100% de formatos Opus y AAC)
        {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": False if is_search else True,
            "socket_timeout": 8,
        },
        # Estrategia 2: Android + Web
        {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": False if is_search else True,
            "socket_timeout": 8,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "web"],
                }
            },
        },
        # Estrategia 3: MWeb
        {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": False if is_search else True,
            "socket_timeout": 8,
            "extractor_args": {
                "youtube": {
                    "player_client": ["mweb"],
                }
            },
        },
        # Estrategia 4: VisionOS
        {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": False if is_search else True,
            "socket_timeout": 8,
            "extractor_args": {
                "youtube": {
                    "player_client": ["visionos"],
                }
            },
        },
    ]

    last_error: Exception | None = None
    for ydl_opts in configs:
        if cookie_path and os.path.exists(cookie_path):
            ydl_opts["cookiefile"] = cookie_path

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                target_info = info
                if "entries" in info and info["entries"]:
                    target_info = info["entries"][0] or info

                stream_url = _select_progressive_audio(target_info)
                if stream_url:
                    raw_headers = target_info.get("http_headers") or info.get("http_headers") or {}
                    headers_dict = {str(k): str(v) for k, v in raw_headers.items()}
                    global_stream_cache.put(url, stream_url, headers=headers_dict, ttl=14400.0)
                    return stream_url, headers_dict
        except Exception as exc:
            last_error = exc
            err_str = str(exc).lower()
            if "confirm you’re not a bot" in err_str or "confirm you're not a bot" in err_str:
                logger.warning(f"[YouTube Stream] YouTube antibot activo en estrategia para {url}: {exc}")
            continue

    raise ValueError(f"No se pudo obtener el flujo de audio del enlace: {last_error}")


@router.get("/match-track")
async def match_track(
    artist: str = Query(""),
    title: str = Query(...),
    exclude_id: str | None = Query(None),
) -> dict[str, Any]:
    """Busca en YouTube por Artista y Título en ~100ms y devuelve el youtube_id y url para reproducción instantánea."""
    from ...services.link_resolver import _search_youtube_video_id
    query = f"{artist.strip()} {title.strip()}".strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query vacía")

    yt_id = await _search_youtube_video_id(query, exclude_id=exclude_id)
    if not yt_id:
        clean_title = re.sub(r"[\(\[\{].*?[\)\]\}]", "", title).strip()
        yt_id = await _search_youtube_video_id(f"{artist.strip()} {clean_title}".strip(), exclude_id=exclude_id)

    if not yt_id:
        raise HTTPException(status_code=404, detail="No se encontró video en YouTube para este tema")

    return {
        "success": True,
        "youtube_id": yt_id,
        "url": f"https://www.youtube.com/watch?v={yt_id}",
    }


@router.get("/cache-stats")
async def get_stream_cache_stats() -> dict[str, Any]:
    """Estadísticas de la caché LRU de streaming (hits, misses, tamaño y memoria)."""
    return {
        "success": True,
        "stats": global_stream_cache.get_stats(),
    }


class ImportQueueRequest(BaseModel):
    items: list[dict[str, Any]] = Field(..., min_items=1, max_items=500)


@router.post("/import-queue")
async def create_import_queue_task(
    body: ImportQueueRequest,
    current_user: OptionalUser = None,
) -> dict[str, Any]:
    """Crea una tarea en segundo plano para procesar e importar listas masivas (100+ temas) sin bloquear HTTP."""
    username = current_user.get("username") if current_user else "Usuario"
    task_id = global_import_manager.create_task(body.items, created_by=username)
    return {
        "success": True,
        "task_id": task_id,
        "total": len(body.items),
        "status": "queued",
        "message": f"Tarea de importación iniciada en segundo plano para {len(body.items)} canciones",
    }


@router.get("/import-queue/{task_id}")
async def get_import_queue_task(task_id: str) -> dict[str, Any]:
    """Consulta el progreso y estado en tiempo real de una tarea de importación masiva."""
    task = global_import_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea de importación no encontrada")
    return {
        "success": True,
        "task": task,
    }


@router.get("/stream")
async def stream_audio_link(
    url: str = Query(...),
    request: Request = None,
):
    """Transmite audio de YouTube, SoundCloud o enlaces web directamente al reproductor con soporte de Range."""
    if is_direct_audio_url(url):
        return RedirectResponse(url)

    # Si la URL es una búsqueda de YouTube o proviene de Spotify
    from ...services.link_resolver import _search_youtube_video_id
    if "youtube.com/results" in url or "search_query=" in url:
        m = re.search(r"search_query=([^&]+)", url)
        if m:
            query = urllib.parse.unquote_plus(m.group(1)).replace("+", " ")
            matched_id = await _search_youtube_video_id(query)
            if matched_id:
                url = f"https://www.youtube.com/watch?v={matched_id}"
            else:
                url = f"ytsearch1:{query}"

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
            global_stream_cache.invalidate(url)
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
        import urllib.parse
        import re

        clean_url = url.strip()
        # Desempaquetar URLs anidadas tipo /api/links/download-proxy?url=...
        while "download-proxy" in clean_url and "url=" in clean_url:
            m = re.search(r"url=([^&]+)", clean_url)
            if m:
                clean_url = urllib.parse.unquote(m.group(1)).strip()
            else:
                break

        clean_url = urllib.parse.unquote(clean_url).strip()
        if clean_url.startswith("/"):
            if "url=" in clean_url:
                m = re.search(r"url=([^&]+)", clean_url)
                if m:
                    clean_url = urllib.parse.unquote(m.group(1)).strip()

        # Si es un enlace directo de audio
        if is_direct_audio_url(clean_url):
            async def stream_audio_url():
                async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
                    async with client.stream("GET", clean_url) as resp:
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
                None, _download_song_sync, clean_url, base_target
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
