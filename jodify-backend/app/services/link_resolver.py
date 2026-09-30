import asyncio
import json
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


def _get_ytdlp_opts(extract_flat: bool = False, is_search: bool = False) -> dict[str, Any]:
    opts: dict[str, Any] = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist" if (extract_flat or is_search) else False,
        "socket_timeout": 15,
        "noplaylist": False if is_search else not extract_flat,
    }

    # Soporte para cookies opcionales si se configuran en el entorno
    cookie_path = os.environ.get("YOUTUBE_COOKIES_PATH") or os.environ.get("COOKIES_FILE")
    if cookie_path and os.path.exists(cookie_path):
        opts["cookiefile"] = cookie_path

    return opts


def _extract_with_ytdlp(url: str, extract_flat: bool = False) -> dict[str, Any]:
    is_search = url.startswith("ytsearch")
    ydl_opts = _get_ytdlp_opts(extract_flat, is_search=is_search)
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return ydl.sanitize_info(info) or {}
    except Exception as exc:
        logger.warning(f"Extracción por defecto falló para {url} ({exc}), probando fallback Android...")
        # Fallback a cliente Android
        fallback_opts = dict(ydl_opts)
        fallback_opts["extractor_args"] = {"youtube": {"player_client": ["android"]}}
        try:
            with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return ydl.sanitize_info(info) or {}
        except Exception:
            raise exc


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

    if "maxresdefault.jpg" in thumbnail:
        thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

    stream_proxy_url = f"/api/links/stream?url=https://www.youtube.com/watch?v={video_id}"
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
        "stream_url": stream_proxy_url,
        "download_url": download_proxy_url,
        "original_url": original_url,
        "webpage_url": f"https://www.youtube.com/watch?v={video_id}",
    }


async def _resolve_spotify(url: str) -> dict[str, Any]:
    """Resuelve metadatos de enlaces de Spotify y los empareja con audio real de YouTube."""
    clean_url = url.split("?")[0].strip()
    m_sp = re.search(r"open\.spotify\.com/(?:intl-[a-zA-Z-]+/)?(track|album|playlist)/([a-zA-Z0-9]+)", clean_url)
    embed_url = f"https://open.spotify.com/embed/{m_sp.group(1)}/{m_sp.group(2)}" if m_sp else clean_url

    title = "Canción de Spotify"
    artist = "Spotify"
    album = "Spotify Web"
    thumbnail = None
    duration = None
    track_type = "track"
    playlist_items = []

    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
        ) as client:
            resp = await client.get(embed_url)
            if resp.status_code == 200:
                m = re.findall(r'<script[^>]+id="__NEXT_DATA__"[^>]*>([^<]+)</script>', resp.text)
                if m:
                    data = json.loads(m[0])
                    state = data.get("props", {}).get("pageProps", {}).get("state", {}).get("data", {}).get("entity", {})
                    entity_type = state.get("type", "track")

                    if entity_type == "track":
                        title = state.get("name") or title
                        artists = [a.get("name") for a in state.get("artists", []) if a.get("name")]
                        if artists:
                            artist = ", ".join(artists)
                        if raw_dur := state.get("duration"):
                            duration = int(raw_dur / 1000)
                        images = state.get("visualIdentity", {}).get("image", [])
                        if images and isinstance(images, list):
                            thumbnail = images[-1].get("url")
                    elif entity_type in ("album", "playlist"):
                        track_type = "playlist"
                        title = state.get("name") or "Playlist de Spotify"
                        album = state.get("name") or album
                        images = state.get("visualIdentity", {}).get("image", [])
                        if images and isinstance(images, list):
                            thumbnail = images[-1].get("url")

                        raw_tracks = state.get("trackList", [])
                        for item in raw_tracks:
                            item_title = item.get("title") or "Canción"
                            item_artists = [a.get("name") for a in item.get("artists", []) if a.get("name")]
                            item_artist = ", ".join(item_artists) or artist
                            item_dur = int(item.get("duration", 0) / 1000) if item.get("duration") else None
                            search_target = f"ytsearch1:{item_artist} {item_title}"
                            playlist_items.append({
                                "id": f"sp-{abs(hash(item_title + item_artist)) % 10000000}",
                                "title": item_title,
                                "artist": item_artist,
                                "duration": item_dur,
                                "thumbnail": thumbnail,
                                "url": f"https://www.youtube.com/results?search_query={item_artist}+{item_title}",
                                "stream_url": f"/api/links/stream?url={search_target}",
                            })
    except Exception as exc:
        logger.warning(f"Error parseando Spotify embed para {url}: {exc}")

    # Si es playlist / album de Spotify
    if track_type == "playlist" and playlist_items:
        return {
            "type": "playlist",
            "source": "spotify",
            "title": title,
            "artist": artist if artist != "Spotify" else "Varios Artistas",
            "thumbnail": thumbnail,
            "count": len(playlist_items),
            "items": playlist_items,
            "original_url": url,
        }

    # Si el título tiene formato "Título - Canción" o "Canción by Artista"
    if " by " in title and artist == "Spotify":
        parts = title.split(" by ")
        title = parts[0].strip()
        artist = parts[1].strip()

    # Buscar stream de audio en YouTube mediante búsqueda rápida
    loop = asyncio.get_running_loop()
    yt_url = None
    try:
        search_query = f"ytsearch1:{artist} {title}"
        search_info = await loop.run_in_executor(None, _extract_with_ytdlp, search_query, False)
        if search_info and "entries" in search_info and search_info["entries"]:
            first = search_info["entries"][0]
            if first and first.get("id"):
                yt_url = f"https://www.youtube.com/watch?v={first['id']}"
                if not duration and first.get("duration"):
                    duration = first.get("duration")
                if not thumbnail and first.get("thumbnail"):
                    thumbnail = first.get("thumbnail")
    except Exception as exc:
        logger.warning(f"No se pudo emparejar audio de YouTube para Spotify: {exc}")

    effective_stream_target = yt_url or url
    stream_url = f"/api/links/stream?url={effective_stream_target}"
    download_url = f"/api/links/download-proxy?url={effective_stream_target}"

    return {
        "type": "track",
        "source": "spotify",
        "id": f"sp-{abs(hash(url)) % 10000000}",
        "title": title,
        "artist": artist,
        "album": album,
        "duration": duration,
        "thumbnail": thumbnail,
        "stream_url": stream_url,
        "download_url": download_url,
        "original_url": url,
        "webpage_url": url,
    }


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
        return await _resolve_spotify(url)

    # 3. Caso: YouTube, SoundCloud, etc.
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
        if ("_type" in info and info["_type"] == "playlist") or "entries" in info:
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
                    "stream_url": f"/api/links/stream?url={item_url}",
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

        stream_url = f"/api/links/stream?url={url}"
        download_url = f"/api/links/download-proxy?url={url}"

        return {
            "type": "track",
            "source": info.get("extractor_key", "web").lower(),
            "id": f"trk-{yt_id or abs(hash(url)) % 10000000}",
            "title": title,
            "artist": artist,
            "album": info.get("album") or "Enlace Externo",
            "duration": info.get("duration"),
            "thumbnail": thumb,
            "stream_url": stream_url,
            "download_url": download_url,
            "original_url": url,
            "webpage_url": info.get("webpage_url") or url,
        }

    except Exception as e:
        logger.warning(f"yt-dlp no pudo resolver {url} ({e}). Activando fallback resiliente...")
        if yt_id:
            return await _resolve_youtube_oembed(yt_id, url)
        raise ValueError(f"No se pudo resolver el enlace: {str(e)}")
