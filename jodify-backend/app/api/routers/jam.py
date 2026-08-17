import asyncio
import json
import random
import string
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from starlette.requests import Request

from ...core.database import col, sid
from ...models.schemas import CreateSessionRequest, JamEventRequest, PlaybackRequest, UpsertMemberRequest
from ...services.jam_hub import jam_hub

router = APIRouter(prefix="/api/jam", tags=["jam"])

CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_code() -> str:
    return "".join(random.choice(CODE_CHARS) for _ in range(4))


def session_view(doc: dict) -> dict:
    return {
        "id": sid(doc.get("_id")),
        "code": doc.get("code", ""),
        "host_username": doc.get("host_username", ""),
        "is_active": doc.get("is_active", False),
        "current_song_id": doc.get("current_song_id"),
        "current_time": doc.get("current_time", 0),
        "is_playing": doc.get("is_playing", False),
        "updated_at": doc.get("updated_at", ""),
    }


async def _session_doc(session_id: str) -> dict:
    try:
        oid = ObjectId(session_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Sesión de Jam no encontrada") from exc
    doc = await col("jam_sessions").find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Sesión de Jam no encontrada")
    return doc


@router.post("/sessions")
async def create_session(body: CreateSessionRequest) -> dict:
    for _ in range(5):
        code = generate_code()
        try:
            result = await col("jam_sessions").insert_one(
                {
                    "code": code,
                    "host_username": body.username,
                    "is_active": True,
                    "current_song_id": None,
                    "current_time": 0,
                    "is_playing": False,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                }
            )
            return {"code": code, "sessionId": sid(result.inserted_id)}
        except Exception as exc:
            if "E11000" not in str(exc):
                raise
    raise HTTPException(status_code=500, detail="No se pudo generar un código de Jam, inténtalo de nuevo")


@router.get("/sessions/active")
async def active_session(code: str) -> dict | None:
    doc = await col("jam_sessions").find_one({"code": code, "is_active": True})
    if doc is None:
        return None
    return session_view(doc)


@router.get("/sessions/history")
async def session_history(limit: int = 30) -> list[dict]:
    """Historial de sesiones JAM con sus miembros (activas e inactivas)."""
    cursor = col("jam_sessions").find({}).sort("updated_at", -1).limit(limit)
    sessions = []
    async for doc in cursor:
        session_id = sid(doc.get("_id"))
        members = []
        async for member in col("jam_members").find({"jam_id": session_id}).sort([("is_host", -1), ("username", 1)]):
            members.append(
                {
                    "username": member.get("username", ""),
                    "is_host": member.get("is_host", False),
                    "active": member.get("active", True),
                    "last_seen": member.get("last_seen", ""),
                }
            )
        sessions.append(
            {
                "id": session_id,
                "code": doc.get("code", ""),
                "host_username": doc.get("host_username", ""),
                "is_active": doc.get("is_active", False),
                "current_song_id": doc.get("current_song_id"),
                "current_time": doc.get("current_time", 0),
                "is_playing": doc.get("is_playing", False),
                "created_at": doc.get("created_at", ""),
                "updated_at": doc.get("updated_at", ""),
                "members": members,
            }
        )
    return sessions


@router.get("/sessions/{session_id}")
async def session_state(session_id: str) -> dict:
    return session_view(await _session_doc(session_id))


@router.post("/sessions/{session_id}/close", status_code=204)
async def close_session(session_id: str) -> None:
    await col("jam_sessions").update_one({"_id": (await _session_doc(session_id))["_id"]}, {"$set": {"is_active": False}})


@router.post("/sessions/{session_id}/playback")
async def persist_playback(session_id: str, body: PlaybackRequest) -> None:
    await col("jam_sessions").update_one(
        {"_id": (await _session_doc(session_id))["_id"]},
        {"$set": {"current_song_id": body.song_id, "current_time": body.time, "is_playing": body.is_playing, "updated_at": datetime.now().isoformat()}},
    )


@router.post("/sessions/{session_id}/members/upsert")
async def upsert_member(session_id: str, body: UpsertMemberRequest) -> None:
    await col("jam_members").update_one(
        {"jam_id": session_id, "username": body.username},
        {"$set": {"is_host": body.is_host, "active": True, "last_seen": datetime.now().isoformat()}},
        upsert=True,
    )


@router.post("/sessions/{session_id}/members/inactive", status_code=204)
async def mark_member_inactive(session_id: str, username: str) -> None:
    await col("jam_members").update_one(
        {"jam_id": session_id, "username": username},
        {"$set": {"active": False, "last_seen": datetime.now().isoformat()}},
    )


@router.get("/sessions/{session_id}/members")
async def members(session_id: str) -> list[dict]:
    cursor = col("jam_members").find({"jam_id": session_id, "active": True}).sort([("is_host", -1), ("username", 1)])
    rows = []
    async for doc in cursor:
        rows.append(
            {
                "id": sid(doc.get("_id")),
                "jam_id": doc.get("jam_id"),
                "username": doc.get("username", ""),
                "is_host": doc.get("is_host", False),
                "active": doc.get("active", True),
                "last_seen": doc.get("last_seen", ""),
            }
        )
    return rows


@router.post("/sessions/{session_id}/events", status_code=204)
async def publish_event(session_id: str, body: JamEventRequest) -> None:
    await _session_doc(session_id)
    await jam_hub.publish(session_id, body.event, body.payload)


@router.get("/sessions/{session_id}/events/stream")
async def event_stream(session_id: str, request: Request) -> StreamingResponse:
    await _session_doc(session_id)
    queue = jam_hub.subscribe(session_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            jam_hub.unsubscribe(session_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )