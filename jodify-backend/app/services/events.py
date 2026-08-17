"""Broadcaster de eventos en memoria para la consola live del dev (SSE)."""

import asyncio
import logging
from collections import deque
from typing import AsyncIterator

logger = logging.getLogger("jodify.events")

_MAX_RING = 300
_ring: deque[dict] = deque(maxlen=_MAX_RING)
_waiters: set[asyncio.Queue[dict]] = set()
_lock = asyncio.Lock()


async def publish(event: dict) -> None:
    event = {**event, "ts": event.get("ts") or __import__("datetime").datetime.now().isoformat()}
    async with _lock:
        _ring.append(event)
        for queue in list(_waiters):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass


async def recent(limit: int = 100) -> list[dict]:
    async with _lock:
        return list(_ring)[-limit:]


async def subscribe() -> AsyncIterator[dict]:
    queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=256)
    async with _lock:
        _waiters.add(queue)
    try:
        while True:
            try:
                yield await asyncio.wait_for(queue.get(), timeout=15)
            except asyncio.TimeoutError:
                yield {"type": "ping"}
    finally:
        async with _lock:
            _waiters.discard(queue)
