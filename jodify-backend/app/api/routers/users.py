from datetime import datetime
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from ...core.database import col, sid
from ...models.schemas import DiscordRequest, HeartbeatRequest, NowPlayingRequest
from ..dependencies import require_admin

router = APIRouter(prefix="/api/users", tags=["users"])


def user_view(doc: dict) -> dict:
    return {
        "id": sid(doc.get("_id")),
        "username": doc.get("username", ""),
        "role": doc.get("role", "user"),
        "is_online": doc.get("is_online", 0),
        "last_seen": doc.get("last_seen"),
        "discord_id": doc.get("discord_id"),
        "current_song_id": doc.get("current_song_id"),
        "current_song_name": doc.get("current_song_name"),
        "listening_since": doc.get("listening_since"),
        "created_at": doc.get("created_at"),
    }


@router.get("")
async def list_users() -> list[dict]:
    cursor = col("users").find({}, {"salt": 0, "password_hash": 0}).sort("is_online", -1)
    return [user_view(doc) for doc in await cursor.to_list(500)]


@router.get("/{username}")
async def get_profile(username: str) -> dict:
    doc = await col("users").find_one({"username": username}, {"salt": 0, "password_hash": 0})
    if doc is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user_view(doc)


@router.get("/{username}/stats")
async def listening_stats(username: str) -> dict:
    liked = await col("likes").count_documents({"username": username})
    played = await col("history").count_documents({"username": username})
    downloaded = await col("downloads").count_documents({"username": username})
    return {"liked": liked, "played": played, "downloaded": downloaded}


@router.get("/{username}/top-songs")
async def top_songs(username: str, limit: int = Query(5, ge=1, le=50)) -> list[dict]:
    cursor = col("history").find({"username": username}, {"song_name": 1}).sort("played_at", -1).limit(250)
    counts: dict[str, int] = {}
    async for row in cursor:
        name = row.get("song_name")
        if name:
            counts[name] = counts.get(name, 0) + 1
    return [
        {"song_name": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    ]


@router.get("/{username}/history")
async def history(username: str, limit: int = Query(50, ge=1, le=200)) -> list[dict]:
    cursor = (
        col("history")
        .find({"username": username}, {"song_id": 1, "song_name": 1, "played_at": 1, "_id": 0})
        .sort("played_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(limit)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, _admin: Annotated[dict, Depends(require_admin)]) -> None:
    if str(_admin.get("_id")) == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    try:
        result = await col("users").delete_one({"_id": ObjectId(user_id)})
    except Exception as exc:
        raise HTTPException(status_code=400, detail="ID de usuario inválido") from exc
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")


@router.post("/{username}/heartbeat")
async def heartbeat(username: str, body: HeartbeatRequest) -> None:
    await col("users").update_one(
        {"username": username},
        {"$set": {"is_online": 1 if body.online else 0, "last_seen": datetime.now().isoformat()}},
    )


@router.put("/{username}/discord")
async def set_discord(username: str, body: DiscordRequest) -> None:
    await col("users").update_one({"username": username}, {"$set": {"discord_id": body.discord_id}})


@router.put("/{username}/now-playing")
async def now_playing(username: str, body: NowPlayingRequest) -> None:
    await col("users").update_one(
        {"username": username},
        {
            "$set": {
                "current_song_id": body.song_id,
                "current_song_name": body.song_name,
                "listening_since": datetime.now().isoformat() if body.song_id is not None else None,
            }
        },
    )
