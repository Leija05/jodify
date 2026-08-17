from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ...core.database import col, sid
from ...models.schemas import CountsRequest, HistoryRequest, LikeRequest

router = APIRouter(prefix="/api", tags=["social"])


@router.get("/likes")
async def list_likes(username: str) -> list:
    cursor = col("likes").find({"username": username}, {"song_id": 1, "_id": 0})
    return [doc["song_id"] for doc in await cursor.to_list(1000)]


@router.post("/likes", status_code=201)
async def add_like(body: LikeRequest) -> None:
    try:
        await col("likes").insert_one(
            {"username": body.username, "song_id": str(body.song_id), "created_at": datetime.now().isoformat()}
        )
    except Exception as exc:
        if "E11000" in str(exc):
            raise HTTPException(status_code=409, detail="Ya está en favoritos") from exc
        raise


@router.delete("/likes", status_code=204)
async def remove_like(username: str, song_id: str) -> None:
    await col("likes").delete_one({"username": username, "song_id": song_id})


@router.get("/likes/has")
async def has_like(username: str, song_id: str) -> dict:
    doc = await col("likes").find_one({"username": username, "song_id": song_id}, {"_id": 1})
    return {"has": doc is not None}


@router.get("/likes/counts")
async def like_counts(usernames: str) -> dict:
    names = [u for u in usernames.split(",") if u]
    counts = {name: 0 for name in names}
    if names:
        rows = await col("likes").find({"username": {"$in": names}}, {"username": 1}).to_list(5000)
        for row in rows:
            name = row.get("username")
            if name in counts:
                counts[name] += 1
    return counts


@router.get("/downloads")
async def list_downloads(username: str) -> list:
    cursor = col("downloads").find({"username": username}, {"song_id": 1, "_id": 0})
    return [doc["song_id"] for doc in await cursor.to_list(1000)]


@router.post("/downloads", status_code=201)
async def add_download(body: LikeRequest) -> None:
    try:
        await col("downloads").insert_one(
            {"username": body.username, "song_id": str(body.song_id), "created_at": datetime.now().isoformat()}
        )
    except Exception as exc:
        if "E11000" in str(exc):
            raise HTTPException(status_code=409, detail="Ya está descargada") from exc
        raise


@router.delete("/downloads", status_code=204)
async def remove_download(username: str, song_id: str) -> None:
    await col("downloads").delete_one({"username": username, "song_id": song_id})


@router.get("/downloads/counts")
async def download_counts(usernames: str) -> dict:
    names = [u for u in usernames.split(",") if u]
    counts = {name: 0 for name in names}
    if names:
        rows = await col("downloads").find({"username": {"$in": names}}, {"username": 1}).to_list(5000)
        for row in rows:
            name = row.get("username")
            if name in counts:
                counts[name] += 1
    return counts


@router.post("/history", status_code=201)
async def insert_history(body: HistoryRequest) -> None:
    await col("history").insert_one(
        {
            "username": body.username,
            "song_id": str(body.song_id) if body.song_id is not None else None,
            "song_name": body.song_name,
            "played_at": datetime.now().isoformat(),
        }
    )
