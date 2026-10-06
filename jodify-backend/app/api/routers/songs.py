from datetime import datetime
import re
import time
from typing import Annotated

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

        doc = {
            "name": name_clean,
            "artist": artist_clean,
            "album": (s_req.album or "Playlist Import").strip(),
            "url": s_req.url or "",
            "youtube_id": yt_id,
            "cover_url": s_req.cover_url,
            "duration": s_req.duration,
            "added_by": s_req.added_by or "Playlist Import",
            "created_at": now_iso,
            "likes": 1,
            "play_count": 0,
            "source": "youtube" if yt_id else "web",
            "_liked_by": s_req.liked_by,
        }
        to_insert_docs.append(doc)

    # 3. Inserción masiva en bloque (insert_many) en MongoDB
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
    ids = []
    for raw in body.ids:
        try:
            ids.append(ObjectId(str(raw)))
        except Exception:
            continue
    if not ids:
        return
    songs = await col("songs").find({"_id": {"$in": ids}}).to_list(1000)
    for song in songs:
        fid = song.get("audio_file_id")
        if isinstance(fid, ObjectId):
            await delete_audio(fid)
    await col("likes").delete_many({"song_id": {"$in": [str(i) for i in ids]}})
    await col("downloads").delete_many({"song_id": {"$in": [str(i) for i in ids]}})
    await col("history").delete_many({"song_id": {"$in": [str(i) for i in ids]}})
    await col("songs").delete_many({"_id": {"$in": ids}})
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
