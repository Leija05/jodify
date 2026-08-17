from datetime import datetime
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pymongo import ReturnDocument
from starlette.requests import Request

from ...core.database import col, sid
from ...models.schemas import CheckNameRequest, DeleteSongsRequest, LikesDeltaRequest
from ...services.audio_streaming import delete_audio, serve_audio, store_audio
from ..dependencies import require_admin

router = APIRouter(prefix="/api/songs", tags=["songs"])


def song_view(doc: dict) -> dict:
    song_id = sid(doc.get("_id"))
    return {
        "id": song_id,
        "name": doc.get("name", ""),
        "url": f"/api/songs/{song_id}/audio",
        "likes": doc.get("likes", 0),
        "added_by": doc.get("added_by"),
        "created_at": doc.get("created_at"),
        "duration": doc.get("duration"),
        "artist": doc.get("artist"),
        "category": doc.get("category"),
        "genre": doc.get("genre"),
        "cover_url": doc.get("cover_url"),
        "play_count": doc.get("play_count", 0),
    }


@router.get("")
async def list_songs() -> list[dict]:
    cursor = col("songs").find({}).sort("created_at", -1)
    return [song_view(doc) for doc in await cursor.to_list(1000)]


@router.get("/check")
async def check_name(name: str) -> dict:
    doc = await col("songs").find_one({"name": name}, {"_id": 1})
    return {"exists": doc is not None}


@router.post("/check")
async def check_name_body(body: CheckNameRequest) -> dict:
    return await check_name(body.name)


@router.post("/upload", response_model=None)
async def upload_song(file: UploadFile = File(...), _admin: Annotated[dict, Depends(require_admin)] = None) -> dict:
    name = file.filename or "cancion"
    if name.lower().endswith((".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".opus")):
        name = name.rsplit(".", 1)[0]
    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="El nombre de la canción no puede estar vacío")
    exists = await col("songs").find_one({"name": name})
    if exists:
        raise HTTPException(status_code=409, detail=f"Ya existe una canción llamada «{name}»")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    if len(content) > 200 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo supera los 200 MB")

    fid = await store_audio(file.filename or name, file.content_type or "audio/mpeg", content)

    try:
        doc = {
            "name": name,
            "url": "",
            "likes": 0,
            "added_by": None,
            "created_at": datetime.now().isoformat(),
            "audio_file_id": fid,
        }
        result = await col("songs").insert_one(doc)
        doc["_id"] = result.inserted_id
        return song_view(doc)
    except Exception:
        await delete_audio(fid)
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


@router.post("/{song_id}/likes")
async def update_likes(song_id: str, body: LikesDeltaRequest) -> dict:
    try:
        oid = ObjectId(song_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Canción no encontrada") from exc
    delta = max(-1, min(1, body.delta))
    updated = await col("songs").find_one_and_update(
        {"_id": oid},
        {"$inc": {"likes": delta}},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Canción no encontrada")
    return {"likes": max(0, updated.get("likes", 0))}


@router.get("/{song_id}/audio")
async def stream_audio(song_id: str, request: Request):
    return await serve_audio(song_id, request)


@router.api_route("/{song_id}/audio", methods=["HEAD"])
async def head_audio(song_id: str):
    return await serve_audio(song_id, None)


@router.get("/top")
async def top_songs(limit: int = Query(10, ge=1, le=50)) -> list[dict]:
    pipeline = [
        {"$group": {"_id": "$song_id", "song_name": {"$first": "$song_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    rows = await col("history").aggregate(pipeline).to_list(limit)
    return [
        {
            "song_id": str(r["_id"]),
            "song_name": r.get("song_name") or "Anónima",
            "count": r["count"],
        }
        for r in rows
    ]


@router.post("/sync", response_model=None)
async def sync_seed_songs(_admin: Annotated[dict, Depends(require_admin)]) -> dict:
    from ...services.seeding import seed_audio

    created = await seed_audio()
    return {"created": created}
