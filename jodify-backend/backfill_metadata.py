"""Backfill one-off: separa artista/título y agrega cover_url (iTunes) a las canciones existentes."""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import col, connect
from app.services.seeding import fetch_cover_url, split_artist_title

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("jodify.backfill")


async def main() -> None:
    connect()
    songs = await col("songs").find({}).to_list(length=None)
    updated = 0
    for song in songs:
        name = song.get("name") or ""
        artist = song.get("artist") or ""
        title = name
        if " - " in name and not artist:
            artist, title = split_artist_title(name)
        cover = song.get("cover_url")
        if not cover:
            cover = fetch_cover_url(artist or title, title)
        if (artist and artist != name) or cover:
            await col("songs").update_one(
                {"_id": song["_id"]},
                {"$set": {"name": title, "artist": artist, "cover_url": cover}},
            )
            updated += 1
            logger.info("OK %s | cover=%s", title, bool(cover))
    logger.info("Backfill terminado: %s canciones actualizadas de %s", updated, len(songs))


if __name__ == "__main__":
    asyncio.run(main())
