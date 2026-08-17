from bson import ObjectId
from motor.core import AgnosticCollection, AgnosticDatabase
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

from .config import AUDIO_BUCKET, MONGO_DB, MONGO_URI

client: AsyncIOMotorClient | None = None
db: AgnosticDatabase | None = None

COLLECTIONS = {
    "users": "users_access",
    "songs": "songs",
    "likes": "user_likes",
    "downloads": "user_downloads",
    "history": "listening_history",
    "logs": "system_logs",
    "jam_sessions": "jam_sessions",
    "jam_members": "jam_members",
}


def connect() -> None:
    global client, db
    if db is not None:
        return
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]


def col(name: str) -> AgnosticCollection:
    if db is None:
        raise RuntimeError("MongoDB no inicializado: llama a connect() primero")
    return db[COLLECTIONS[name]]


def bucket() -> str:
    return AUDIO_BUCKET


def audio_files() -> AgnosticCollection:
    return col("songs").database[f"{AUDIO_BUCKET}.files"]


def audio_chunks() -> AgnosticCollection:
    return col("songs").database[f"{AUDIO_BUCKET}.chunks"]


def s(value: object) -> object:
    """Convierte ObjectId a str para JSON."""
    return str(value) if isinstance(value, ObjectId) else value


def sid(value: object, fallback: str | None = None) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, str) and value:
        return value
    if fallback is not None:
        return fallback
    return ""


async def create_indexes() -> None:
    await col("users").create_indexes([
        IndexModel([("username", ASCENDING)], unique=True),
        IndexModel([("is_online", DESCENDING)]),
    ])
    await col("songs").create_indexes([
        IndexModel([("created_at", DESCENDING)]),
        IndexModel([("name", ASCENDING)]),
        IndexModel([("likes", DESCENDING)]),
    ])
    await col("likes").create_indexes([
        IndexModel([("username", ASCENDING), ("song_id", ASCENDING)], unique=True),
        IndexModel([("song_id", ASCENDING)]),
    ])
    await col("downloads").create_indexes([
        IndexModel([("username", ASCENDING), ("song_id", ASCENDING)], unique=True),
        IndexModel([("song_id", ASCENDING)]),
    ])
    await col("history").create_indexes([
        IndexModel([("username", ASCENDING), ("played_at", DESCENDING)]),
    ])
    await col("logs").create_indexes([
        IndexModel([("created_at", DESCENDING)]),
    ])
    await col("jam_sessions").create_indexes([
        IndexModel([("code", ASCENDING)], unique=True),
        IndexModel([("is_active", DESCENDING)]),
    ])
    await col("jam_members").create_indexes([
        IndexModel([("jam_id", ASCENDING), ("username", ASCENDING)], unique=True),
        IndexModel([("jam_id", ASCENDING), ("active", DESCENDING)]),
    ])
    await audio_files().create_indexes([
        IndexModel([("uploadDate", DESCENDING)]),
    ])
