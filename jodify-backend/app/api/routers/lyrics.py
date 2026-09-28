import logging
from fastapi import APIRouter, Query
import httpx
from ...core.database import col

logger = logging.getLogger("jodify.lyrics")
router = APIRouter(prefix="/api/lyrics", tags=["lyrics"])


@router.get("")
async def get_lyrics(
    song: str = Query(..., description="Nombre de la canción"),
    artist: str | None = Query(None, description="Artista de la canción"),
) -> dict:
    clean_song = song.strip()
    clean_artist = (artist or "").strip()

    # 1. Buscar en BD si ya existe la canción con lyrics
    query: dict = {"name": {"$regex": f"^{clean_song}$", "$options": "i"}}
    if clean_artist:
        query["artist"] = {"$regex": f"^{clean_artist}$", "$options": "i"}

    doc = await col("songs").find_one(query, {"lyrics": 1, "_id": 1})
    if doc and doc.get("lyrics"):
        lyrics_text = doc["lyrics"]
        is_synced = "[" in lyrics_text and "]" in lyrics_text
        return {
            "lyrics": lyrics_text,
            "synced": is_synced,
            "source": "database",
        }

    # 2. Consultar LRCLIB para obtener letras sincronizadas (LRC)
    try:
        params: dict = {"track_name": clean_song}
        if clean_artist:
            params["artist_name"] = clean_artist

        headers = {"User-Agent": "JodiFy-Music-App/2.0 (https://github.com/Leija05/jodify)"}
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get("https://lrclib.net/api/get", params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                synced_lyrics = data.get("syncedLyrics")
                plain_lyrics = data.get("plainLyrics")
                if synced_lyrics:
                    if doc:
                        await col("songs").update_one({"_id": doc["_id"]}, {"$set": {"lyrics": synced_lyrics}})
                    return {
                        "lyrics": synced_lyrics,
                        "synced": True,
                        "source": "lrclib",
                    }
                elif plain_lyrics:
                    return {
                        "lyrics": plain_lyrics,
                        "synced": False,
                        "source": "lrclib",
                    }
            elif clean_artist:
                search_resp = await client.get(
                    "https://lrclib.net/api/search",
                    params={"q": f"{clean_song} {clean_artist}".strip()},
                    headers=headers,
                )
                if search_resp.status_code == 200:
                    items = search_resp.json()
                    if isinstance(items, list) and len(items) > 0:
                        first = items[0]
                        synced = first.get("syncedLyrics")
                        plain = first.get("plainLyrics")
                        if synced:
                            return {"lyrics": synced, "synced": True, "source": "lrclib_search"}
                        if plain:
                            return {"lyrics": plain, "synced": False, "source": "lrclib_search"}
    except Exception as e:
        logger.warning(f"Error consultando LRCLIB para '{clean_song}': {e}")

    return {"lyrics": "", "synced": False, "source": "none"}
