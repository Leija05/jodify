import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routers import auth, jam, logs, social, songs, users
from .core import database as dbmod
from .core.config import CORS_ORIGINS
from .core.database import connect, create_indexes
from .services.seeding import seed_audio, seed_users

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jodify")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    connect()
    await create_indexes()
    await seed_users()
    await seed_audio()
    logger.info("JodiFy API lista sobre MongoDB")
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
app.include_router(users.router)
app.include_router(songs.router)
app.include_router(social.router)
app.include_router(logs.router)
app.include_router(jam.router)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}