import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routers import auth, dev, jam, links, logs, lyrics, social, songs, updates, users
from .core import database as dbmod
from .core.config import CORS_ORIGINS
from .core.database import col, connect, create_indexes
from .services.seeding import seed_audio, seed_users

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jodify")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    connect()
    await create_indexes()
    await seed_users()
    count = await col("songs").count_documents({})
    if count == 0:
        await seed_audio()
    logger.info("JodiFy API lista sobre MongoDB (total canciones: %d)", count)
    yield
    if dbmod.client is not None:
        dbmod.client.close()


app = FastAPI(title="JodiFy API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dev.router)
app.include_router(users.router)
app.include_router(songs.router)
app.include_router(links.router)
app.include_router(social.router)
app.include_router(logs.router)
app.include_router(jam.router)
app.include_router(lyrics.router)
app.include_router(updates.router)

# Alias para compatibilidad directa con URLs /songs/{id}/audio y /songs/{id}/cover
app.add_api_route("/songs/{song_id}/audio", songs.stream_audio, methods=["GET"])
app.add_api_route("/songs/{song_id}/audio", songs.head_audio, methods=["HEAD"])
app.add_api_route("/songs/{song_id}/cover", songs.stream_cover, methods=["GET"])


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "version": "2.0.1"}


@app.get("/")
async def root() -> dict:
    """Raíz amigable: todos los endpoints viven bajo /api."""
    return {
        "service": "JodiFy API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }