"""Seed inicial: usuarios por defecto y opcionalmente audio desde seed_audio/."""

import json
import logging
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

from ..core.config import DEV_MODE, DEV_PASSWORD, DEV_ROLE, DEV_USERNAME, SEED_AUDIO_DIR
from ..core.database import col
from ..core.security import hash_password

logger = logging.getLogger("jodify.seed")

DEFAULT_USERS = [
    ("admin", "admin123", "admin"),
    ("user", "user123", "user"),
]

AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".opus"}


def split_artist_title(name: str) -> tuple[str, str]:
    """Separa 'Artista - Título' en (artista, título). Sin ' - ', devuelve (name, name)."""
    match = re.match(r"^(.*?)\s*-\s*(.+)$", name.strip())
    if not match:
        return name.strip(), name.strip()
    artist, title = match.group(1).strip(), match.group(2).strip()
    return artist, title


def fetch_cover_url(artist: str, title: str, retries: int = 2) -> str | None:
    """Busca el artwork de la canción en la API de búsqueda de iTunes."""
    term = f"{artist} {re.sub(r'\\([^)]*\\)', '', title)}".strip()
    url = "https://itunes.apple.com/search?%s" % urllib.parse.urlencode(
        {"term": term, "media": "music", "limit": 1}
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            results = data.get("results") or []
            if results:
                artwork = results[0].get("artworkUrl100")
                if artwork:
                    return artwork.replace("100x100bb", "600x600bb")
            return None
        except Exception:
            if attempt < retries - 1:
                time.sleep(1)
    return None


async def seed_dev_user() -> None:
    """Crea o actualiza la cuenta dev con las credenciales de .env (DEV_USERNAME/DEV_PASSWORD/DEV_ROLE)."""
    salt, password_hash = hash_password(DEV_PASSWORD)
    values = {
        "salt": salt,
        "password_hash": password_hash,
        "role": DEV_ROLE,
        "is_online": 0,
        "last_seen": None,
        "discord_id": None,
        "current_song_id": None,
        "current_song_name": None,
        "listening_since": None,
        "created_at": datetime.now().isoformat(),
    }
    doc = await col("users").find_one({"username": DEV_USERNAME})
    if doc is None:
        await col("users").insert_one({"username": DEV_USERNAME, **values})
        logger.info("Cuenta dev creada: %s (%s)", DEV_USERNAME, DEV_ROLE)
    else:
        await col("users").update_one({"username": DEV_USERNAME}, {"$set": values})
        logger.info("Cuenta dev actualizada: %s (%s)", DEV_USERNAME, DEV_ROLE)


async def seed_users() -> None:
    if DEV_MODE:
        await seed_dev_user()
    for username, password, role in DEFAULT_USERS:
        exists = await col("users").find_one({"username": username})
        if exists:
            continue
        salt, password_hash = hash_password(password)
        await col("users").insert_one(
            {
                "username": username,
                "salt": salt,
                "password_hash": password_hash,
                "role": role,
                "is_online": 0,
                "last_seen": None,
                "discord_id": None,
                "current_song_id": None,
                "current_song_name": None,
                "listening_since": None,
                "created_at": datetime.now().isoformat(),
            }
        )
        logger.info("Usuario seed creado: %s (%s)", username, role)


async def seed_audio() -> int:
    """Sube a GridFS cualquier archivo de audio en backend/seed_audio/."""
    if not SEED_AUDIO_DIR.exists():
        return 0
    files = [f for f in SEED_AUDIO_DIR.iterdir() if f.suffix.lower() in AUDIO_EXTENSIONS]
    if not files:
        logger.info("No hay archivos de audio en seed_audio/ (%s)", SEED_AUDIO_DIR)
        return 0
    from ..services.audio_streaming import store_audio

    created = 0
    for path in sorted(files):
        raw_name = path.stem
        artist, title = split_artist_title(raw_name)
        exists = await col("songs").find_one({"name": title})
        if exists:
            continue
        with path.open("rb") as fh:
            fid = await store_audio(path.name, "audio/mpeg", fh)
        artist, title = split_artist_title(raw_name)
        cover_url = fetch_cover_url(artist, title)
        if cover_url:
            time.sleep(0.25)
        await col("songs").insert_one(
            {
                "name": title,
                "artist": artist,
                "url": "",
                "cover_url": cover_url,
                "likes": 0,
                "added_by": "dev",
                "created_at": datetime.now().isoformat(),
                "audio_file_id": fid,
            }
        )
        logger.info("Canción seed subida: %s", title)
        created += 1
    return created
