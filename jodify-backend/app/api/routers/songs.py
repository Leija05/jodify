import asyncio
from datetime import datetime
import re
import time
from typing import Annotated
import urllib.parse

import httpx

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pymongo import ReturnDocument
from starlette.requests import Request

from ...core.database import col, sid
from ...models.schemas import (
    CheckNameRequest,
    DeleteSongsRequest,
    LikesDeltaRequest,
    RegisterBatchSongsRequest,
    RegisterSongRequest,
    UpdateSongRequest,
)
from ...services.audio_streaming import delete_audio, serve_audio, serve_cover, store_audio
from ..dependencies import require_admin

router = APIRouter(prefix="/api/songs", tags=["songs"])

_SONGS_CACHE: dict = {"timestamp": 0.0, "data": []}
_TOP_CACHE: dict = {"timestamp": 0.0, "limit": 0, "data": []}
CACHE_TTL_SECONDS = 30.0
TOP_CACHE_TTL_SECONDS = 60.0


def invalidate_songs_cache():
    _SONGS_CACHE["timestamp"] = 0.0
    _TOP_CACHE["timestamp"] = 0.0


async def async_fetch_cover_url(artist: str, title: str, client: httpx.AsyncClient | None = None) -> str | None:
    """Busca carátula oficial en alta resolución (600x600) en la API de iTunes."""
    clean_artist = (artist or "").split(",")[0].strip()
    clean_title = re.sub(r"\(.*?\)|\[.*?\]", "", title or "").strip()
    q = f"{clean_artist} {clean_title}".strip()
    if not q:
        return None
    url = f"https://itunes.apple.com/search?term={urllib.parse.quote_plus(q)}&media=music&entity=song&limit=1"
    try:
        if client:
            resp = await client.get(url, timeout=3.5)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results and results[0].get("artworkUrl100"):
                    return results[0]["artworkUrl100"].replace("100x100bb", "600x600bb")
        else:
            async with httpx.AsyncClient(timeout=4.0) as c:
                resp = await c.get(url)
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if results and results[0].get("artworkUrl100"):
                        return results[0]["artworkUrl100"].replace("100x100bb", "600x600bb")
    except Exception:
        pass
    return None


def song_view(doc: dict) -> dict:
    song_id = sid(doc.get("_id"))
    raw_name = (doc.get("name") or "").strip()
    raw_artist = (doc.get("artist") or "").strip()

    clean_artist = raw_artist if raw_artist and raw_artist.lower() != raw_name.lower() else None
    clean_name = raw_name

    if not clean_artist:
        match = re.match(r"^(.*?)\s*[-–—]\s*(.+)$", raw_name)
        if match:
            clean_artist = match.group(1).strip()
            clean_name = match.group(2).strip()

    return {
        "id": song_id,
        "name": clean_name or raw_name,
        "url": f"/songs/{song_id}/audio" if doc.get("audio_file_id") else (doc.get("url") or doc.get("stream_url") or ""),
        "likes": doc.get("likes", 0),
        "added_by": doc.get("added_by"),
        "created_at": doc.get("created_at"),
        "duration": doc.get("duration"),
        "artist": clean_artist,
        "album": doc.get("album"),
        "category": doc.get("category"),
        "genre": doc.get("genre"),
        "lyrics": doc.get("lyrics"),
        "cover_url": f"/songs/{song_id}/cover" if doc.get("cover_file_id") else (doc.get("cover_url") or None),
        "play_count": doc.get("play_count", 0),
        "youtube_id": doc.get("youtube_id"),
        "source": doc.get("source") or ("youtube" if doc.get("youtube_id") else "local"),
    }


@router.get("")
async def list_songs(
    limit: int = Query(1000, ge=1, le=1000),
    cursor: str | None = Query(None, description="Cursor ObjectId para paginación eficiente"),
) -> list[dict]:
    now = time.time()
    if cursor is None and limit >= 500:
        if now - _SONGS_CACHE["timestamp"] < CACHE_TTL_SECONDS and _SONGS_CACHE["data"]:
            return _SONGS_CACHE["data"]

    query = {}
    if cursor:
        try:
            query["_id"] = {"$lt": ObjectId(cursor)}
        except Exception:
            pass

    mongo_cursor = col("songs").find(query).sort("created_at", -1)
    results = [song_view(doc) for doc in await mongo_cursor.to_list(limit)]

    if cursor is None and limit >= 500:
        _SONGS_CACHE["timestamp"] = now
        _SONGS_CACHE["data"] = results

    return results


@router.get("/check")
async def check_name(name: str) -> dict:
    doc = await col("songs").find_one({"name": name}, {"_id": 1})
    return {"exists": doc is not None}


@router.post("/check")
async def check_name_body(body: CheckNameRequest) -> dict:
    return await check_name(body.name)


@router.post("/register", response_model=None)
async def register_song(body: RegisterSongRequest) -> dict:
    name_clean = (body.name or "").strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="El nombre de la canción es obligatorio")

    query: dict = {}
    if body.youtube_id:
        query = {"youtube_id": body.youtube_id}
    else:
        query = {"name": name_clean}
        if body.artist:
            query["artist"] = body.artist.strip()

    existing = await col("songs").find_one(query)
    if existing:
        song_doc = existing
        song_id = sid(existing["_id"])
        # Incrementar likes si corresponde
        await col("songs").update_one({"_id": existing["_id"]}, {"$inc": {"likes": 1}})
        song_doc["likes"] = song_doc.get("likes", 0) + 1
    else:
        song_doc = {
            "name": name_clean,
            "artist": (body.artist or "").strip(),
            "album": (body.album or "Enlace Web").strip(),
            "url": body.url or "",
            "youtube_id": body.youtube_id,
            "cover_url": body.cover_url,
            "duration": body.duration,
            "added_by": body.added_by or "Enlace Web",
            "created_at": datetime.now().isoformat(),
            "likes": 1,
            "play_count": 0,
            "source": "youtube" if body.youtube_id else "web",
        }
        res = await col("songs").insert_one(song_doc)
        song_doc["_id"] = res.inserted_id
        song_id = sid(res.inserted_id)

    invalidate_songs_cache()

    if body.liked_by:
        try:
            await col("likes").insert_one({
                "username": body.liked_by,
                "song_id": song_id,
                "created_at": datetime.now().isoformat(),
            })
        except Exception:
            pass

    return song_view(song_doc)


@router.post("/register-batch", response_model=None)
async def register_songs_batch(body: RegisterBatchSongsRequest) -> dict:
    if not body.songs:
        return {
            "success": True,
            "added_count": 0,
            "skipped_count": 0,
            "added": [],
            "skipped": [],
        }

    added = []
    skipped = []

    # 1. Consulta masiva de canciones existentes en una sola operación a la base de datos
    yt_ids = [s.youtube_id.strip() for s in body.songs if s.youtube_id and s.youtube_id.strip()]
    names = [s.name.strip() for s in body.songs if s.name and s.name.strip()]

    or_clauses = []
    if yt_ids:
        or_clauses.append({"youtube_id": {"$in": yt_ids}})
    if names:
        or_clauses.append({"name": {"$in": names}})

    existing_docs = []
    if or_clauses:
        cursor = col("songs").find({"$or": or_clauses})
        existing_docs = await cursor.to_list(length=len(body.songs) * 2)

    # 2. Indexación en memoria para búsqueda O(1)
    existing_by_yt = {d["youtube_id"]: d for d in existing_docs if d.get("youtube_id")}
    existing_by_name_artist = {
        (d.get("name", "").strip().lower(), (d.get("artist") or "").strip().lower()): d
        for d in existing_docs if d.get("name")
    }
    existing_by_name = {
        d.get("name", "").strip().lower(): d
        for d in existing_docs if d.get("name")
    }

    # Detectar carátulas compartidas de playlist dentro del lote recibido
    # Si una carátula aparece repetida para 2 o más canciones o es un mosaico de Spotify (ab67706c),
    # es una foto de playlist y NO debe asignarse a las canciones individuales.
    raw_covers_count: dict[str, int] = {}
    for s_req in body.songs:
        c = (s_req.cover_url or "").strip()
        if c:
            raw_covers_count[c] = raw_covers_count.get(c, 0) + 1

    playlist_covers = {c for c, count in raw_covers_count.items() if count >= 2 or "ab67706c" in c}

    seen_in_batch = set()
    to_insert_docs = []
    existing_to_bump = []
    now_iso = datetime.now().isoformat()

    for s_req in body.songs:
        name_clean = (s_req.name or "").strip()
        if not name_clean:
            continue

        yt_id = (s_req.youtube_id or "").strip() or None
        artist_clean = (s_req.artist or "").strip()

        # Deduplicar dentro del mismo lote
        batch_key = yt_id if yt_id else f"{name_clean.lower()}|{artist_clean.lower()}"
        if batch_key in seen_in_batch:
            continue
        seen_in_batch.add(batch_key)

        existing = None
        if yt_id and yt_id in existing_by_yt:
            existing = existing_by_yt[yt_id]
        elif (name_clean.lower(), artist_clean.lower()) in existing_by_name_artist:
            existing = existing_by_name_artist[(name_clean.lower(), artist_clean.lower())]
        elif not artist_clean and name_clean.lower() in existing_by_name:
            existing = existing_by_name[name_clean.lower()]

        if existing:
            if body.skip_duplicates:
                skipped.append(song_view(existing))
            else:
                existing_to_bump.append(existing)
            continue

        song_cover = s_req.cover_url
        if song_cover and song_cover in playlist_covers:
            # Descartar carátula compartida de playlist para la canción individual
            song_cover = None

        if not song_cover and yt_id:
            song_cover = f"https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg"

        doc = {
            "name": name_clean,
            "artist": artist_clean,
            "album": (s_req.album or "Playlist Import").strip(),
            "url": s_req.url or "",
            "youtube_id": yt_id,
            "cover_url": song_cover,
            "duration": s_req.duration,
            "added_by": s_req.added_by or "Playlist Import",
            "created_at": now_iso,
            "likes": 1,
            "play_count": 0,
            "source": "youtube" if yt_id else "web",
            "_liked_by": s_req.liked_by,
        }
        to_insert_docs.append(doc)

    # 3. Enriquecer carátulas individuales originales para canciones del lote que perdieron la de playlist o no tienen
    songs_needing_art = [d for d in to_insert_docs if not d.get("cover_url") or "ab67706c" in str(d.get("cover_url"))]
    if songs_needing_art:
        sem_enrich = asyncio.Semaphore(12)
        async with httpx.AsyncClient(timeout=4.0) as client:
            async def _resolve_doc_art(d_item: dict):
                async with sem_enrich:
                    art = await async_fetch_cover_url(d_item.get("artist", ""), d_item.get("name", ""), client=client)
                    if art:
                        d_item["cover_url"] = art
                    elif d_item.get("youtube_id") and not d_item.get("cover_url"):
                        d_item["cover_url"] = f"https://i.ytimg.com/vi/{d_item['youtube_id']}/hqdefault.jpg"

            await asyncio.gather(*[_resolve_doc_art(d) for d in songs_needing_art], return_exceptions=True)

    # 4. Inserción masiva en bloque (insert_many) en MongoDB
    if to_insert_docs:
        res = await col("songs").insert_many(to_insert_docs, ordered=False)
        likes_to_insert = []
        for doc, inserted_id in zip(to_insert_docs, res.inserted_ids):
            doc["_id"] = inserted_id
            added.append(song_view(doc))
            l_by = doc.pop("_liked_by", None)
            if l_by:
                likes_to_insert.append({
                    "username": l_by,
                    "song_id": str(inserted_id),
                    "created_at": now_iso,
                })
        if likes_to_insert:
            try:
                await col("likes").insert_many(likes_to_insert, ordered=False)
            except Exception:
                pass

    # 4. Actualización masiva de likes si no se omiten duplicados
    if existing_to_bump:
        bump_ids = [ex["_id"] for ex in existing_to_bump]
        await col("songs").update_many({"_id": {"$in": bump_ids}}, {"$inc": {"likes": 1}})
        for ex in existing_to_bump:
            ex["likes"] = ex.get("likes", 0) + 1
            added.append(song_view(ex))

    # 5. Sincronizar likes para canciones preexistentes si venían marcadas con liked_by
    existing_likes_to_add = []
    for s_req in body.songs:
        if s_req.liked_by:
            n_clean = (s_req.name or "").strip().lower()
            a_clean = (s_req.artist or "").strip().lower()
            y_clean = (s_req.youtube_id or "").strip()
            target_match = None
            if y_clean and y_clean in existing_by_yt:
                target_match = existing_by_yt[y_clean]
            elif (n_clean, a_clean) in existing_by_name_artist:
                target_match = existing_by_name_artist[(n_clean, a_clean)]
            elif not a_clean and n_clean in existing_by_name:
                target_match = existing_by_name[n_clean]
            if target_match:
                existing_likes_to_add.append({
                    "username": s_req.liked_by,
                    "song_id": str(target_match["_id"]),
                    "created_at": now_iso,
                })
    if existing_likes_to_add:
        try:
            await col("likes").insert_many(existing_likes_to_add, ordered=False)
        except Exception:
            pass

    if added:
        invalidate_songs_cache()

    return {
        "success": True,
        "added_count": len(added),
        "skipped_count": len(skipped),
        "added": added,
        "skipped": skipped,
    }


@router.post("/upload", response_model=None)
async def upload_song(
    file: UploadFile = File(...),
    name: str | None = Form(None),
    cover: UploadFile | None = File(None),
    album: str | None = Form(None),
    lyrics: str | None = Form(None),
    artist: str | None = Form(None),
    _admin: Annotated[dict, Depends(require_admin)] = None,
) -> dict:
    raw_name = (name or file.filename or "cancion").strip()
    if not name and raw_name.lower().endswith((".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".opus")):
        raw_name = raw_name.rsplit(".", 1)[0]
    if not raw_name or len(raw_name) < 2:
        raise HTTPException(status_code=400, detail="El nombre de la canción no puede estar vacío")
    exists = await col("songs").find_one({"name": raw_name})
    if exists:
        raise HTTPException(status_code=409, detail=f"Ya existe una canción llamada «{raw_name}»")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    if len(content) > 200 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo supera los 200 MB")

    fid = await store_audio(file.filename or raw_name, file.content_type or "audio/mpeg", content)

    doc = {
        "name": raw_name,
        "url": "",
        "likes": 0,
        "added_by": None,
        "created_at": datetime.now().isoformat(),
        "audio_file_id": fid,
    }
    album_clean = (album or "").strip()
    if album_clean:
        doc["album"] = album_clean
    lyrics_clean = (lyrics or "").strip()
    if lyrics_clean:
        doc["lyrics"] = lyrics_clean
    artist_clean = (artist or "").strip()
    if not artist_clean:
        match = re.match(r"^(.*?)\s*[-–—]\s*(.+)$", raw_name)
        if match:
            doc["artist"] = match.group(1).strip()
            doc["name"] = match.group(2).strip()
    elif artist_clean.lower() != raw_name.lower():
        doc["artist"] = artist_clean
    if cover is not None:
        cover_bytes = await cover.read()
        if cover_bytes:
            cover_fid = await store_audio(
                cover.filename or "cover.jpg", cover.content_type or "image/jpeg", cover_bytes
            )
            doc["cover_file_id"] = cover_fid

    try:
        result = await col("songs").insert_one(doc)
        doc["_id"] = result.inserted_id
        invalidate_songs_cache()
        return song_view(doc)
    except Exception:
        await delete_audio(fid)
        if "cover_file_id" in doc:
            await delete_audio(doc["cover_file_id"])
        raise


@router.delete("", status_code=204)
async def delete_songs(body: DeleteSongsRequest, _admin: Annotated[dict, Depends(require_admin)]) -> None:
    raw_ids = [str(raw).strip() for raw in body.ids if str(raw).strip()]
    if not raw_ids:
        return

    obj_ids = []
    str_ids = []
    for r in raw_ids:
        str_ids.append(r)
        try:
            obj_ids.append(ObjectId(r))
        except Exception:
            pass

    or_clauses = []
    if obj_ids:
        or_clauses.append({"_id": {"$in": obj_ids}})
    if str_ids:
        or_clauses.append({"id": {"$in": str_ids}})
        or_clauses.append({"youtube_id": {"$in": str_ids}})

    if not or_clauses:
        return

    songs = await col("songs").find({"$or": or_clauses}).to_list(2000)
    for song in songs:
        fid = song.get("audio_file_id")
        if isinstance(fid, ObjectId):
            await delete_audio(fid)
        cov_fid = song.get("cover_file_id")
        if isinstance(cov_fid, ObjectId):
            await delete_audio(cov_fid)

    matched_ids = [s["_id"] for s in songs]
    all_id_strings = list({str(s["_id"]) for s in songs} | set(str_ids))

    if matched_ids:
        await col("songs").delete_many({"_id": {"$in": matched_ids}})
    await col("likes").delete_many({"song_id": {"$in": all_id_strings}})
    await col("downloads").delete_many({"song_id": {"$in": all_id_strings}})
    await col("history").delete_many({"song_id": {"$in": all_id_strings}})
    invalidate_songs_cache()


@router.post("/{song_id}/likes")
async def update_likes(song_id: str, body: LikesDeltaRequest) -> dict:
    filter_q: dict
    try:
        filter_q = {"_id": ObjectId(song_id)}
    except Exception:
        filter_q = {"id": int(song_id) if song_id.isdigit() else song_id}

    delta = max(-1, min(1, body.delta))
    updated = await col("songs").find_one_and_update(
        filter_q,
        {"$inc": {"likes": delta}},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        return {"likes": max(0, 1 if delta > 0 else 0)}
    invalidate_songs_cache()
    return {"likes": max(0, updated.get("likes", 0))}


@router.get("/{song_id}/audio")
async def stream_audio(song_id: str, request: Request):
    return await serve_audio(song_id, request)


@router.api_route("/{song_id}/audio", methods=["HEAD"])
async def head_audio(song_id: str):
    return await serve_audio(song_id, None)


@router.get("/{song_id}/cover")
async def stream_cover(song_id: str):
    return await serve_cover(song_id)


@router.get("/top")
async def top_songs(limit: int = Query(10, ge=1, le=50)) -> list[dict]:
    now = time.time()
    if _TOP_CACHE["data"] and _TOP_CACHE["limit"] >= limit and (now - _TOP_CACHE["timestamp"] < TOP_CACHE_TTL_SECONDS):
        return _TOP_CACHE["data"][:limit]

    pipeline = [
        {"$group": {"_id": "$song_id", "song_name": {"$first": "$song_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    rows = await col("history").aggregate(pipeline).to_list(limit)
    res = [
        {
            "song_id": str(r["_id"]),
            "song_name": r.get("song_name") or "Anónima",
            "count": r["count"],
        }
        for r in rows
    ]
    _TOP_CACHE["timestamp"] = now
    _TOP_CACHE["limit"] = limit
    _TOP_CACHE["data"] = res
    return res


@router.get("/{song_id}")
async def get_song_by_id(song_id: str) -> dict:
    try:
        oid = ObjectId(song_id)
        doc = await col("songs").find_one({"_id": oid})
    except Exception:
        doc = await col("songs").find_one({"_id": song_id})
    if not doc:
        # Fallback por youtube_id si el id proporcionado es un ID de video
        doc = await col("songs").find_one({"youtube_id": song_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Canción no encontrada")
    return song_view(doc)


@router.patch("/{song_id}", response_model=None)
async def update_song(
    song_id: str, body: UpdateSongRequest, _admin: Annotated[dict, Depends(require_admin)] = None
) -> dict:
    try:
        oid = ObjectId(song_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Canción no encontrada") from exc

    update: dict[str, str] = {}
    for field in ("name", "artist", "album", "lyrics"):
        value = getattr(body, field, None)
        if value is not None:
            update[field] = str(value).strip()
    if not update:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    if "name" in update and (not update["name"] or len(update["name"]) < 2):
        raise HTTPException(status_code=400, detail="El nombre de la canción no puede estar vacío")

    updated = await col("songs").find_one_and_update(
        {"_id": oid},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Canción no encontrada")
    invalidate_songs_cache()
    return song_view(updated)


@router.post("/sync", response_model=None)
async def sync_seed_songs(_admin: Annotated[dict, Depends(require_admin)]) -> dict:
    from ...services.seeding import seed_audio

    created = await seed_audio()
    return {"created": created}


async def repair_duplicate_covers_in_db() -> dict:
    """Escanea la base de datos de canciones, detecta aquellas que recibieron la foto de una playlist
    (mosaico ab67706c o carátula idéntica compartida entre artistas diferentes) y restaura su carátula original."""
    cursor = col("songs").find({}, {"name": 1, "artist": 1, "album": 1, "cover_url": 1, "youtube_id": 1})
    all_songs = await cursor.to_list(length=5000)

    cover_groups: dict[str, list[dict]] = {}
    for s in all_songs:
        c = s.get("cover_url")
        if c:
            cover_groups.setdefault(c, []).append(s)

    songs_to_repair = []
    for s in all_songs:
        c = (s.get("cover_url") or "").strip()
        # 1. Carátula de mosaico de playlist de Spotify
        if "ab67706c" in c:
            songs_to_repair.append(s)
            continue
        # 2. Carátula compartida entre canciones de diferentes artistas (playlist importada)
        if c and len(cover_groups.get(c, [])) > 1:
            artists_sharing = {
                (x.get("artist") or "").strip().lower()
                for x in cover_groups[c]
                if (x.get("artist") or "").strip()
            }
            if len(artists_sharing) > 1:
                songs_to_repair.append(s)
                continue
        # 3. Canciones sin carátula
        if not c:
            songs_to_repair.append(s)

    if not songs_to_repair:
        return {"ok": True, "repaired_count": 0, "total_examined": len(all_songs), "songs": []}

    sem = asyncio.Semaphore(12)
    repaired_records = []

    async with httpx.AsyncClient(timeout=6.0) as client:
        async def _fix_single(s_doc: dict):
            s_id = s_doc["_id"]
            artist = s_doc.get("artist") or ""
            name = s_doc.get("name") or ""
            yt_id = s_doc.get("youtube_id")

            real_cover = None
            async with sem:
                real_cover = await async_fetch_cover_url(artist, name, client=client)

            if not real_cover and yt_id:
                real_cover = f"https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg"

            if real_cover and real_cover != s_doc.get("cover_url"):
                await col("songs").update_one({"_id": s_id}, {"$set": {"cover_url": real_cover}})
                repaired_records.append({
                    "id": str(s_id),
                    "name": name,
                    "artist": artist,
                    "old_cover": s_doc.get("cover_url"),
                    "new_cover": real_cover,
                })

        await asyncio.gather(*[_fix_single(s) for s in songs_to_repair], return_exceptions=True)

    if repaired_records:
        invalidate_songs_cache()

    return {
        "ok": True,
        "repaired_count": len(repaired_records),
        "total_examined": len(all_songs),
        "songs": repaired_records,
    }


@router.post("/repair-covers", response_model=None)
async def repair_covers_endpoint() -> dict:
    """Repara y restaura las carátulas originales de canciones que tienen fotos de playlist repetidas."""
    return await repair_duplicate_covers_in_db()
