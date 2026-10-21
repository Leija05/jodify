"""
Script de Backfill: Asigna el youtube_id real y URL canónica a todas las canciones
que tienen youtube_id faltante o enlaces de búsqueda (search_query).
"""

import asyncio
import logging
import os
import sys
import urllib.parse
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import col, connect, client
from app.services.link_resolver import _search_youtube_video_id

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("jodify.backfill_yt")


async def main() -> None:
    connect()
    songs_col = col("songs")

    # Obtener todas las canciones que no tienen archivo subido en GridFS
    cursor = songs_col.find({"audio_file_id": {"$in": [None, False]}})
    all_songs = await cursor.to_list(length=2000)
    logger.info("Total de canciones sin archivo GridFS en la base de datos: %d", len(all_songs))

    # Filtrar aquellas que necesitan reparación:
    # 1. No tienen youtube_id válido (de 11 caracteres)
    # 2. O su URL actual contiene 'search_query' o '/api/links/stream'
    songs_to_fix = []
    for s in all_songs:
        yt_id = (s.get("youtube_id") or "").strip()
        url = (s.get("url") or "").strip()
        is_valid_yt = bool(yt_id and re.match(r"^[a-zA-Z0-9_-]{11}$", yt_id))
        needs_fix = not is_valid_yt or "search_query" in url or url.startswith("/api/links/stream")
        if needs_fix:
            songs_to_fix.append(s)

    logger.info("Canciones que requieren reparación de youtube_id / url: %d", len(songs_to_fix))
    if not songs_to_fix:
        logger.info("¡Todas las canciones ya tienen youtube_id asignado!")
        if client:
            client.close()
        return

    sem = asyncio.Semaphore(5)
    updated_count = 0
    failed_count = 0

    async def fix_song(song: dict):
        nonlocal updated_count, failed_count
        name = (song.get("name") or "").strip()
        artist = (song.get("artist") or "").strip()
        current_url = song.get("url") or ""

        # Extraer query si venía de un enlace de búsqueda
        query = ""
        if "search_query=" in current_url:
            m = re.search(r"search_query=([^&]+)", current_url)
            if m:
                query = urllib.parse.unquote_plus(m.group(1)).replace("+", " ")

        if not query:
            clean_artist = artist if artist and artist.lower() not in ("spotify", "varios artistas", "desconocido") else ""
            query = f"{clean_artist} {name}".strip() if clean_artist else name

        async with sem:
            try:
                matched_id = await _search_youtube_video_id(query)
                if not matched_id and artist and name:
                    matched_id = await _search_youtube_video_id(name)

                if matched_id:
                    update_fields = {
                        "youtube_id": matched_id,
                        "url": f"https://www.youtube.com/watch?v={matched_id}",
                        "source": "youtube",
                    }
                    # Si no tiene cover o tiene un mosaico de playlist de Spotify (ab67706c), asignar cover de YouTube
                    cov = song.get("cover_url") or ""
                    if not cov or "ab67706c" in cov:
                        update_fields["cover_url"] = f"https://i.ytimg.com/vi/{matched_id}/hqdefault.jpg"

                    await songs_col.update_one({"_id": song["_id"]}, {"$set": update_fields})
                    updated_count += 1
                    logger.info("✔ [%d/%d] '%s' (%s) -> %s", updated_count, len(songs_to_fix), name, artist, matched_id)
                else:
                    failed_count += 1
                    logger.warning("✖ [%d/%d] No se encontró video para '%s' (%s)", failed_count, len(songs_to_fix), name, artist)
            except Exception as exc:
                failed_count += 1
                logger.error("Error reparando '%s': %s", name, exc)

    tasks = [fix_song(s) for s in songs_to_fix]
    await asyncio.gather(*tasks)

    logger.info("=========================================")
    logger.info("RESUMEN DE MIGRACIÓN:")
    logger.info("  Total reparadas y actualizadas: %d", updated_count)
    logger.info("  Fallidas o no encontradas: %d", failed_count)
    logger.info("=========================================")

    if client:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
