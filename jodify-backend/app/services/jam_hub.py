"""Hub de eventos en memoria para JAM: sustituye a Supabase Realtime con SSE."""

import asyncio
from collections import defaultdict
from typing import Any


class JamHub:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)

    def subscribe(self, session_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers[session_id].add(queue)
        return queue

    def unsubscribe(self, session_id: str, queue: asyncio.Queue) -> None:
        self._subscribers[session_id].discard(queue)
        if not self._subscribers[session_id]:
            self._subscribers.pop(session_id, None)

    async def publish(self, session_id: str, event: str, payload: dict[str, Any]) -> None:
        message = {"event": event, "payload": payload}
        for queue in list(self._subscribers.get(session_id, ())):
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            queue.put_nowait(message)


jam_hub = JamHub()
