from datetime import datetime

from fastapi import APIRouter, Query

from ...core.database import col, sid
from ...models.schemas import LogRequest
from ...services import events

router = APIRouter(prefix="/api/logs", tags=["logs"])


async def add_log_doc(event_type: str, message: str, admin_user: str | None = None) -> None:
    """Inserta un log y lo emite en vivo por el stream del dev."""
    doc = {
        "event_type": event_type,
        "message": message,
        "admin_user": admin_user,
        "created_at": datetime.now().isoformat(),
    }
    await col("logs").insert_one(doc)
    await events.publish({"type": "log", "event_type": event_type, "message": message, "admin_user": admin_user, "ts": doc["created_at"]})


@router.get("")
async def fetch_logs(limit: int = Query(50, ge=1, le=500)) -> list[dict]:
    cursor = col("logs").find({}).sort("created_at", -1).limit(limit)
    rows = []
    async for doc in cursor:
        rows.append(
            {
                "id": sid(doc.get("_id")),
                "event_type": doc.get("event_type", ""),
                "message": doc.get("message", ""),
                "admin_user": doc.get("admin_user"),
                "created_at": doc.get("created_at", ""),
            }
        )
    return rows


@router.post("", status_code=201)
async def add_log(body: LogRequest) -> None:
    await add_log_doc(body.event_type, body.message, body.admin_user)
