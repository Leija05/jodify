import asyncio
import logging
import re
from typing import Any
import httpx
import yt_dlp

logger = logging.getLogger("jodify.links")

COMMON_AUDIO_EXTENSIONS = (".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".opus")


def is_direct_audio_url(url: str) -> bool:
    clean_url = url.split("?")[0].lower()
    return clean_url.endswith(COMMON_AUDIO_EXTENSIONS)


def _extract_with_ytdlp(url: str, extract_flat: bool = False) -> dict[str, Any]:
    ydl_opts: dict[str, Any] = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist" if extract_flat else False,
        "socket_timeout": 15,
        "noplaylist": not extract_flat,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return ydl.sanitize_info(info) or {}


async def resolve_link(url: str) -> dict[str, Any]:
    """Resuelve cualquier enlace de audio o playlist (YouTube, SoundCloud, direct audio, etc.)."""
    url = url.strip()
    if not url:
        raise ValueError("URL no válida")

    # 1. Caso: Enlace directo a archivo de audio
    if is_direct_audio_url(url):
        filename = url.split("/")[-1].split("?")[0]
        title = filename.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()
        return {
            "type": "track",
            "source": "direct",
            "title": title,
            "artist": "Audio en streaming",
            "duration": None,
            "thumbnail": None,
            "stream_url": url,
            "download_url": url,
            "original_url": url,
        }

    # 2. Caso: yt-dlp para YouTube, SoundCloud, etc.
    loop = asyncio.get_running_loop()
    try:
        # Primero intentamos resolver como playlist o track único
        is_playlist_url = "playlist" in url.lower() or "list=" in url.lower()
        info = await loop.run_in_executor(None, _extract_with_ytdlp, url, is_playlist_url)

        if not info:
            raise ValueError("No se pudo obtener información del enlace")

        # Es playlist
        if "_type" in info and info["_type"] == "playlist" or "entries" in info:
            entries = info.get("entries") or []
            playlist_items = []
            for item in entries:
                if not item:
                    continue
                item_url = item.get("url") or item.get("webpage_url") or f"https://www.youtube.com/watch?v={item.get('id')}"
                playlist_items.append({
                    "id": item.get("id"),
                    "title": item.get("title") or "Canción",
                    "artist": item.get("uploader") or item.get("artist") or item.get("channel"),
                    "duration": item.get("duration"),
                    "thumbnail": item.get("thumbnail"),
                    "url": item_url,
                })

            return {
                "type": "playlist",
                "source": info.get("extractor_key", "web").lower(),
                "title": info.get("title") or "Playlist",
                "artist": info.get("uploader") or info.get("channel"),
                "thumbnail": info.get("thumbnail") or (playlist_items[0]["thumbnail"] if playlist_items else None),
                "count": len(playlist_items),
                "items": playlist_items,
                "original_url": url,
            }

        # Es pista individual
        stream_url = info.get("url")
        if not stream_url and "formats" in info:
            audio_formats = [
                f for f in info["formats"]
                if f.get("acodec") != "none" and (f.get("vcodec") == "none" or "audio" in f.get("format", "").lower())
            ]
            if audio_formats:
                stream_url = audio_formats[-1].get("url")
            else:
                stream_url = info["formats"][-1].get("url")

        title = info.get("title") or "Canción"
        artist = info.get("artist") or info.get("uploader") or info.get("channel") or "Desconocido"

        # Limpiar si el título tiene formato "Artista - Canción"
        if not info.get("artist") and "-" in title:
            parts = re.split(r"\s*[-–—]\s*", title, maxsplit=1)
            if len(parts) == 2 and parts[0] and parts[1]:
                artist = parts[0].strip()
                title = parts[1].strip()

        return {
            "type": "track",
            "source": info.get("extractor_key", "web").lower(),
            "title": title,
            "artist": artist,
            "album": info.get("album"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "stream_url": stream_url or url,
            "original_url": url,
            "webpage_url": info.get("webpage_url") or url,
        }

    except Exception as e:
        logger.warning(f"Fallo en yt-dlp: {e}. Intentando fallback...")
        raise ValueError(f"No se pudo resolver el enlace: {str(e)}")
