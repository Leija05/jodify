from datetime import datetime

from fastapi import APIRouter, Query

from ...core.database import col, sid
from ...models.schemas import LogRequest

router = APIRouter(prefix="/api/logs", tags=["logs"])


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
    await col("logs").insert_one(
        {
            "event_type": body.event_type,
            "message": body.message,
            "admin_user": body.admin_user,
            "created_at": datetime.now().isoformat(),
        }
    )
