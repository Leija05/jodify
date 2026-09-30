import asyncio
import logging
import os
import re
from typing import Any
import httpx
import yt_dlp

logger = logging.getLogger("jodify.links")

COMMON_AUDIO_EXTENSIONS = (".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".opus")


def is_direct_audio_url(url: str) -> bool:
    clean_url = url.split("?")[0].lower()
    return clean_url.endswith(COMMON_AUDIO_EXTENSIONS)


def extract_youtube_id(url: str) -> str | None:
    patterns = [
        r"(?:v=|\/|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})",
        r"(?:watch\?v=)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    return None


def is_spotify_url(url: str) -> bool:
    return "open.spotify.com" in url.lower()


def _get_ytdlp_opts(extract_flat: bool = False) -> dict[str, Any]:
    opts: dict[str, Any] = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist" if extract_flat else False,
        "socket_timeout": 15,
        "noplaylist": not extract_flat,
        # Estrategia anti-bot en IPs de datacenter (Render / AWS / GCP)
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "mweb"],
            }
        },
        "http_headers": {
            "User-Agent": "com.google.android.youtube/19.29.35 (Linux; U; Android 14; en_US; Pixel 7 Pro Build/UQ1A.240105.004) gzip",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
    }

    # Soporte para cookies opcionales si se configuran en el entorno
    cookie_path = os.environ.get("YOUTUBE_COOKIES_PATH") or os.environ.get("COOKIES_FILE")
    if cookie_path and os.path.exists(cookie_path):
        opts["cookiefile"] = cookie_path

    return opts


def _extract_with_ytdlp(url: str, extract_flat: bool = False) -> dict[str, Any]:
    ydl_opts = _get_ytdlp_opts(extract_flat)
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return ydl.sanitize_info(info) or {}


async def _resolve_youtube_oembed(video_id: str, original_url: str) -> dict[str, Any]:
    """Fallback garantizado mediante YouTube oEmbed oficial cuando yt-dlp encuentra retos anti-bot."""
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    title = "Canción de YouTube"
    artist = "YouTube Music"
    thumbnail = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(oembed_url)
            if resp.status_code == 200:
                data = resp.json()
                title = data.get("title") or title
                artist = data.get("author_name") or artist
                thumbnail = data.get("thumbnail_url") or thumbnail
    except Exception as exc:
        logger.warning(f"Fallo en YouTube oEmbed para {video_id}: {exc}")

    # Separar si viene en formato "Artista - Título"
    if "-" in title:
        parts = re.split(r"\s*[-–—]\s*", title, maxsplit=1)
        if len(parts) == 2 and parts[0] and parts[1]:
            artist = parts[0].strip()
            title = parts[1].strip()

    # Si maxresdefault puede dar 404 para videos viejos, aseguramos fallback a hqdefault
    if "maxresdefault.jpg" in thumbnail:
        thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

    download_proxy_url = f"/api/links/download-proxy?url=https://www.youtube.com/watch?v={video_id}"

    return {
        "type": "track",
        "source": "youtube",
        "id": f"yt-{video_id}",
        "title": title,
        "artist": artist,
        "album": "YouTube Audio",
        "duration": None,
        "thumbnail": thumbnail,
        "stream_url": download_proxy_url,
        "download_url": download_proxy_url,
        "original_url": original_url,
        "webpage_url": f"https://www.youtube.com/watch?v={video_id}",
    }


async def _resolve_spotify_oembed(url: str) -> dict[str, Any]:
    """Resuelve metadatos de enlaces de Spotify mediante oEmbed oficial."""
    oembed_url = f"https://open.spotify.com/oembed?url={url}"
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(oembed_url)
            if resp.status_code == 200:
                data = resp.json()
                raw_title = data.get("title") or "Canción de Spotify"
                thumbnail = data.get("thumbnail_url")
                artist = "Spotify"
                title = raw_title
                if " by " in raw_title:
                    parts = raw_title.split(" by ")
                    title = parts[0].strip()
                    artist = parts[1].strip()
                elif "-" in raw_title:
                    parts = re.split(r"\s*[-–—]\s*", raw_title, maxsplit=1)
                    if len(parts) == 2:
                        artist = parts[0].strip()
                        title = parts[1].strip()

                return {
                    "type": "track",
                    "source": "spotify",
                    "id": f"sp-{abs(hash(url)) % 10000000}",
                    "title": title,
                    "artist": artist,
                    "album": "Spotify Web",
                    "duration": None,
                    "thumbnail": thumbnail,
                    "stream_url": f"/api/links/download-proxy?url={url}",
                    "download_url": f"/api/links/download-proxy?url={url}",
                    "original_url": url,
                    "webpage_url": url,
                }
    except Exception as exc:
        logger.warning(f"Fallo en Spotify oEmbed para {url}: {exc}")

    raise ValueError("No se pudo obtener información del enlace de Spotify")


async def resolve_link(url: str) -> dict[str, Any]:
    """Resuelve cualquier enlace de audio o playlist (YouTube, SoundCloud, Spotify, direct audio, etc.)."""
    url = url.strip()
    if not url:
        raise ValueError("URL no válida")

    # 1. Caso: Enlace directo a archivo de audio (.mp3, .flac, .wav, etc.)
    if is_direct_audio_url(url):
        filename = url.split("/")[-1].split("?")[0]
        title = filename.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()
        return {
            "type": "track",
            "source": "direct",
            "id": f"direct-{abs(hash(url)) % 10000000}",
            "title": title,
            "artist": "Audio en streaming",
            "album": "Archivo Directo",
            "duration": None,
            "thumbnail": None,
            "stream_url": url,
            "download_url": url,
            "original_url": url,
            "webpage_url": url,
        }

    # 2. Caso: Spotify
    if is_spotify_url(url):
        return await _resolve_spotify_oembed(url)

    # 3. Caso: yt-dlp con fallback garantizado anti-bot
    loop = asyncio.get_running_loop()
    yt_id = extract_youtube_id(url)

    try:
        is_playlist_url = "playlist" in url.lower() or "list=" in url.lower()
        info = await loop.run_in_executor(None, _extract_with_ytdlp, url, is_playlist_url)

        if not info:
            if yt_id:
                return await _resolve_youtube_oembed(yt_id, url)
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
                    "artist": item.get("uploader") or item.get("artist") or item.get("channel") or "Desconocido",
                    "duration": item.get("duration"),
                    "thumbnail": item.get("thumbnail") or (f"https://i.ytimg.com/vi/{item.get('id')}/hqdefault.jpg" if item.get("id") else None),
                    "url": item_url,
                    "stream_url": f"/api/links/download-proxy?url={item_url}",
                })

            return {
                "type": "playlist",
                "source": info.get("extractor_key", "web").lower(),
                "title": info.get("title") or "Playlist",
                "artist": info.get("uploader") or info.get("channel") or "Comunidad",
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
            elif info["formats"]:
                stream_url = info["formats"][-1].get("url")

        title = info.get("title") or "Canción"
        artist = info.get("artist") or info.get("uploader") or info.get("channel") or "Desconocido"

        if not info.get("artist") and "-" in title:
            parts = re.split(r"\s*[-–—]\s*", title, maxsplit=1)
            if len(parts) == 2 and parts[0] and parts[1]:
                artist = parts[0].strip()
                title = parts[1].strip()

        thumb = info.get("thumbnail")
        if not thumb and yt_id:
            thumb = f"https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg"

        effective_stream = stream_url or (f"/api/links/download-proxy?url={url}" if yt_id else url)

        return {
            "type": "track",
            "source": info.get("extractor_key", "web").lower(),
            "id": f"trk-{yt_id or abs(hash(url)) % 10000000}",
            "title": title,
            "artist": artist,
            "album": info.get("album") or "Enlace Externo",
            "duration": info.get("duration"),
            "thumbnail": thumb,
            "stream_url": effective_stream,
            "download_url": f"/api/links/download-proxy?url={url}",
            "original_url": url,
            "webpage_url": info.get("webpage_url") or url,
        }

    except Exception as e:
        logger.warning(f"yt-dlp no pudo resolver {url} ({e}). Activando fallback resiliente...")
        if yt_id:
            return await _resolve_youtube_oembed(yt_id, url)
        raise ValueError(f"No se pudo resolver el enlace: {str(e)}")
