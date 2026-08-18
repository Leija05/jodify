"""GridFS: subida y streaming de audio con soporte de rangos (seeking)."""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from starlette.requests import Request

from ..core.config import AUDIO_BUCKET, GRIDFS_CHUNK
from ..core import database as dbmod
from ..core.config import AUDIO_BUCKET, GRIDFS_CHUNK, MONGO_DB

import gridfs


def _bucket() -> AsyncIOMotorGridFSBucket:
    client = dbmod.client
    if client is None:
        raise RuntimeError("MongoDB no inicializado")
    return AsyncIOMotorGridFSBucket(client[MONGO_DB], bucket_name=AUDIO_BUCKET)


async def store_audio(filename: str, content_type: str, file) -> ObjectId:
    bucket = _bucket()
    fid = await bucket.upload_from_stream(filename, file, metadata={"content_type": content_type or "audio/mpeg"})
    return fid


async def delete_audio(file_id: ObjectId) -> None:
    try:
        await _bucket().delete(file_id)
    except gridfs.errors.NoFile:
        pass


async def _stream_piece(file_id: ObjectId, start: int, end: int):
    first_n = start // GRIDFS_CHUNK
    cursor = dbmod.audio_chunks().find({"files_id": file_id, "n": {"$gte": first_n}}).sort("n", 1)
    remaining = end - start + 1
    async for chunk in cursor:
        data = chunk["data"]
        chunk_start = chunk["n"] * GRIDFS_CHUNK
        begin = max(0, start - chunk_start)
        piece = bytes(data[begin : begin + remaining])
        remaining -= len(piece)
        if piece:
            yield piece
        if remaining <= 0:
            break


async def serve_audio(song_id: str, request: Request | None) -> StreamingResponse:
    try:
        oid = ObjectId(song_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Canción no encontrada") from exc

    song = await dbmod.col("songs").find_one({"_id": oid})
    if song is None:
        raise HTTPException(status_code=404, detail="Canción no encontrada")
    file_id = song.get("audio_file_id")
    if file_id is None:
        raise HTTPException(status_code=404, detail="Archivo de audio no encontrado")

    meta = await dbmod.audio_files().find_one({"_id": file_id})
    if meta is None:
        raise HTTPException(status_code=404, detail="Archivo de audio no encontrado")

    length = int(meta.get("length", 0))
    content_type = (meta.get("metadata") or {}).get("content_type") or "audio/mpeg"

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
        upload_date = meta.get("uploadDate") or datetime.now(timezone.utc)
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Range": f"bytes {start}-{end}/{length}",
            "Content-Length": str(end - start + 1),
            "Cache-Control": "public, max-age=31536000",
            "Last-Modified": upload_date.strftime("%a, %d %b %Y %H:%M:%S GMT"),
        }
        return StreamingResponse(
            _stream_piece(file_id, start, end),
            status_code=206,
            media_type=content_type,
            headers=headers,
        )

    upload_date = meta.get("uploadDate") or datetime.now(timezone.utc)
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
        "Cache-Control": "public, max-age=31536000",
        "Last-Modified": upload_date.strftime("%a, %d %b %Y %H:%M:%S GMT"),
    }
    return StreamingResponse(
        _stream_piece(file_id, 0, max(0, length - 1)),
        status_code=200,
        media_type=content_type,
        headers=headers,
    )


async def serve_cover(song_id: str) -> StreamingResponse:
    try:
        oid = ObjectId(song_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Canción no encontrada") from exc

    song = await dbmod.col("songs").find_one({"_id": oid})
    if song is None:
        raise HTTPException(status_code=404, detail="Canción no encontrada")
    file_id = song.get("cover_file_id")
    if file_id is None:
        raise HTTPException(status_code=404, detail="Portada no encontrada")

    meta = await dbmod.audio_files().find_one({"_id": file_id})
    if meta is None:
        raise HTTPException(status_code=404, detail="Portada no encontrada")

    length = int(meta.get("length", 0))
    content_type = (meta.get("metadata") or {}).get("content_type") or "image/jpeg"
    return StreamingResponse(
        _stream_piece(file_id, 0, max(0, length - 1)),
        status_code=200,
        media_type=content_type,
        headers={
            "Content-Length": str(length),
            "Cache-Control": "public, max-age=31536000",
        },
    )
