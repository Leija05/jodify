"""LRU Audio Streaming Cache y Asynchronous Import Worker Queue.
Reduce el uso de CPU y llamadas redundantes a yt-dlp manteniendo URLs resueltas y metadatos de flujo en memoria con política LRU y expiración TTL.
"""

import asyncio
from collections import OrderedDict
import logging
import time
from typing import Any
import uuid

logger = logging.getLogger("jodify.stream_cache")


class LRUAudioStreamCache:
    """Caché LRU con TTL para flujos de audio y headers de streaming.
    Normaliza identificadores de YouTube (video ID) para maximizar la tasa de aciertos
    incluso si los usuarios acceden mediante formatos distintos (youtu.be, youtube.com, etc.).
    """

    def __init__(self, capacity: int = 1000, default_ttl: float = 14400.0):
        self.capacity = capacity
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, tuple[str, float, dict[str, str], dict[str, Any]]] = OrderedDict()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    @staticmethod
    def normalize_key(url: str) -> str:
        """Normaliza una URL de streaming para compartir caché."""
        clean = url.strip()
        # Si es un ID directo o enlace de YouTube
        import re
        if re.fullmatch(r"[a-zA-Z0-9_-]{11}", clean):
            return f"yt:{clean}"
        m = re.search(r"(?:youtu\.be\/|v\/|watch\?v=|embed\/)([a-zA-Z0-9_-]{11})", clean)
        if m:
            return f"yt:{m.group(1)}"
        return clean

    def get(self, url: str) -> tuple[str, dict[str, str], dict[str, Any]] | None:
        key = self.normalize_key(url)
        now = time.time()
        if key not in self._cache:
            self._misses += 1
            return None

        stream_url, exp, headers, meta = self._cache[key]
        if now > exp:
            # Entrada expirada
            self._cache.pop(key, None)
            self._misses += 1
            return None

        # Mover al frente de la cola LRU
        self._cache.move_to_end(key)
        self._hits += 1
        return stream_url, headers, meta

    def put(
        self,
        url: str,
        stream_url: str,
        headers: dict[str, str] | None = None,
        meta: dict[str, Any] | None = None,
        ttl: float | None = None,
    ) -> None:
        key = self.normalize_key(url)
        now = time.time()
        effective_ttl = ttl if ttl is not None else self.default_ttl
        exp = now + effective_ttl

        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (stream_url, exp, headers or {}, meta or {})

        if len(self._cache) > self.capacity:
            self._cache.popitem(last=False)
            self._evictions += 1

    def invalidate(self, url: str) -> bool:
        key = self.normalize_key(url)
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def clear(self) -> None:
        self._cache.clear()

    def get_stats(self) -> dict[str, Any]:
        total_queries = self._hits + self._misses
        hit_ratio = (self._hits / total_queries * 100) if total_queries > 0 else 0.0
        return {
            "size": len(self._cache),
            "capacity": self.capacity,
            "hits": self._hits,
            "misses": self._misses,
            "evictions": self._evictions,
            "hit_ratio_percent": round(hit_ratio, 2),
            "default_ttl_seconds": self.default_ttl,
        }


# Instancia singleton global para el backend
global_stream_cache = LRUAudioStreamCache(capacity=1000, default_ttl=14400.0)


# ==============================================================================
# COLA ASÍNCRONA PARA IMPORTACIONES MASIVAS (100+ TEMAS)
# ==============================================================================

class ImportTaskStatus:
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AsyncImportManager:
    """Gestiona tareas de importación masiva en segundo plano con control de concurrencia y seguimiento de progreso."""

    def __init__(self, max_concurrent_workers: int = 3):
        self.tasks: dict[str, dict[str, Any]] = {}
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.max_workers = max_concurrent_workers
        self._worker_tasks: list[asyncio.Task] = []
        self._started = False

    def ensure_started(self) -> None:
        if not self._started:
            self._started = True
            for i in range(self.max_workers):
                task = asyncio.create_task(self._worker_loop(i))
                self._worker_tasks.append(task)
            logger.info(f"Iniciados {self.max_workers} workers asíncronos para importación masiva.")

    def create_task(self, items: list[dict[str, Any]], created_by: str = "Usuario") -> str:
        self.ensure_started()
        task_id = f"imp_{uuid.uuid4().hex[:12]}"
        now = time.time()
        self.tasks[task_id] = {
            "task_id": task_id,
            "status": ImportTaskStatus.QUEUED,
            "total": len(items),
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "progress_percent": 0.0,
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
            "items_to_process": items,
            "imported_tracks": [],
            "errors": [],
        }
        self.queue.put_nowait(task_id)
        return task_id

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        task = self.tasks.get(task_id)
        if not task:
            return None
        # Devolver una vista limpia sin el arreglo crudo items_to_process
        return {
            "task_id": task["task_id"],
            "status": task["status"],
            "total": task["total"],
            "processed": task["processed"],
            "successful": task["successful"],
            "failed": task["failed"],
            "progress_percent": task["progress_percent"],
            "created_by": task["created_by"],
            "created_at": task["created_at"],
            "updated_at": task["updated_at"],
            "imported_count": len(task["imported_tracks"]),
            "errors_count": len(task["errors"]),
            "errors": task["errors"][:10],
        }

    async def _worker_loop(self, worker_id: int) -> None:
        from .link_resolver import _search_youtube_video_id
        from ..core.database import col
        from datetime import datetime

        while True:
            try:
                task_id = await self.queue.get()
                task = self.tasks.get(task_id)
                if not task:
                    self.queue.task_done()
                    continue

                task["status"] = ImportTaskStatus.PROCESSING
                task["updated_at"] = time.time()

                items = task.pop("items_to_process", [])
                total = max(1, len(items))

                for index, item in enumerate(items, 1):
                    title = (item.get("title") or item.get("name") or "Canción").strip()
                    artist = (item.get("artist") or item.get("uploader") or "Varios").strip()
                    url = item.get("url") or item.get("webpage_url") or ""
                    yt_id = item.get("youtube_id")

                    try:
                        # Si no tiene youtube_id, resolverlo de manera rápida
                        if not yt_id and not url.startswith("http"):
                            query = f"{artist} {title}".strip()
                            yt_id = await _search_youtube_video_id(query)
                            if yt_id:
                                url = f"https://www.youtube.com/watch?v={yt_id}"

                        # Guardar o registrar en biblioteca si es necesario
                        imported_entry = {
                            "title": title,
                            "artist": artist,
                            "url": url,
                            "youtube_id": yt_id,
                            "imported_at": datetime.now().isoformat(),
                        }
                        task["imported_tracks"].append(imported_entry)
                        task["successful"] += 1

                    except Exception as exc:
                        task["failed"] += 1
                        task["errors"].append({"title": title, "artist": artist, "error": str(exc)})

                    task["processed"] = index
                    task["progress_percent"] = round((index / total) * 100, 1)
                    task["updated_at"] = time.time()

                    # Pequeña pausa de cortesía para no saturar CPU/red
                    await asyncio.sleep(0.08)

                task["status"] = ImportTaskStatus.COMPLETED
                task["updated_at"] = time.time()
                self.queue.task_done()

            except asyncio.CancelledError:
                break
            except Exception as err:
                logger.error(f"Error inesperado en worker {worker_id}: {err}")
                await asyncio.sleep(1.0)


# Instancia singleton global para el gestor de tareas de importación
global_import_manager = AsyncImportManager(max_concurrent_workers=3)
