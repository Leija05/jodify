"""GridFS: almacenamiento y streaming de APKs para actualizaciones directas desde la base de datos."""

import hashlib
import inspect
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from starlette.requests import Request
import gridfs
from gridfs import GridFSBucket

from ..core import database as dbmod
from ..core.config import MONGO_DB

APK_CHUNK_SIZE = 1024 * 1024  # 1MB por chunk para APKs para descarga rápida y eficiente

_UPLOAD_CHUNK_PARAM = (
    "chunk_size_bytes" if "chunk_size_bytes" in inspect.signature(GridFSBucket.upload_from_stream).parameters else "chunk_size"
)


def _apk_bucket() -> AsyncIOMotorGridFSBucket:
    client = dbmod.client
    if client is None:
        raise RuntimeError("MongoDB no inicializado")
    return AsyncIOMotorGridFSBucket(client[MONGO_DB], bucket_name=dbmod.APK_BUCKET)


async def store_apk(filename: str, file_obj) -> tuple[ObjectId, int, str]:
    """
    Lee el archivo APK, calcula su SHA256 y tamaño, y lo guarda en GridFS bucket 'apk_releases'.
    Retorna (file_id, size_bytes, sha256_hash).
    """
    bucket = _apk_bucket()
    hasher = hashlib.sha256()
    total_size = 0

    # Wrapper async generator para subir calculando hash y tamaño
    upload_kwargs = {_UPLOAD_CHUNK_PARAM: APK_CHUNK_SIZE}
    
    # Motor GridFS upload_from_stream acepta un stream o le podemos pasar el archivo
    # Leemos en chunks para no desbordar memoria en archivos grandes
    grid_in = bucket.open_upload_stream(
        filename,
        metadata={"content_type": "application/vnd.android.package-archive"},
        **upload_kwargs,
    )
    
    try:
        while True:
            chunk = await file_obj.read(APK_CHUNK_SIZE)
            if not chunk:
                break
            hasher.update(chunk)
            total_size += len(chunk)
            await grid_in.write(chunk)
        await grid_in.close()
    except Exception as exc:
        try:
            await grid_in.abort()
        except Exception:
            pass
        raise exc

    return grid_in._id, total_size, hasher.hexdigest()


async def delete_apk(file_id: ObjectId) -> None:
    try:
        await _apk_bucket().delete(file_id)
    except gridfs.errors.NoFile:
        pass


async def _stream_apk_chunks(file_id: ObjectId, start: int, end: int, chunk_size: int = APK_CHUNK_SIZE):
    first_n = start // chunk_size
    cursor = dbmod.apk_chunks().find({"files_id": file_id, "n": {"$gte": first_n}}).sort("n", 1)
    remaining = end - start + 1
    async for chunk in cursor:
        data = chunk["data"]
        chunk_start = chunk["n"] * chunk_size
        begin = max(0, start - chunk_start)
        piece = bytes(data[begin : begin + remaining])
        remaining -= len(piece)
        if piece:
            yield piece
        if remaining <= 0:
            break


async def serve_apk(file_id: ObjectId, filename: str, request: Request | None = None) -> StreamingResponse:
    meta = await dbmod.apk_files().find_one({"_id": file_id})
    if meta is None:
        raise HTTPException(status_code=404, detail="Archivo APK no encontrado en base de datos")

    length = int(meta.get("length", 0))
    chunk_size = int(meta.get("chunkSize") or APK_CHUNK_SIZE)
    content_type = "application/vnd.android.package-archive"

    range_header = request.headers.get("Range") if request is not None else None
    if range_header and range_header.startswith("bytes=") and "-" in range_header:
        try:
            raw_start, raw_end = range_header[6:].split("-", 1)
            start = int(raw_start) if raw_start else 0
            end = int(raw_end) if raw_end else length - 1
            if raw_start and raw_end:
                start, end = min(start, end), max(start, end)
            if start < 0 or start >= length:
                raise ValueError
            end = min(end, length - 1)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=416,
                detail="Rango inválido",
                headers={"Content-Range": f"bytes */{length}"},
            ) from None

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Range": f"bytes {start}-{end}/{length}",
            "Content-Length": str(end - start + 1),
            "Content-Type": content_type,
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        }
        return StreamingResponse(
            _stream_apk_chunks(file_id, start, end, chunk_size),
            status_code=206,
            headers=headers,
            media_type=content_type,
        )

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
        "Content-Type": content_type,
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-cache",
    }
    return StreamingResponse(
        _stream_apk_chunks(file_id, 0, length - 1, chunk_size),
        status_code=200,
        headers=headers,
        media_type=content_type,
    )
