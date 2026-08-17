import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
if _ENV_FILE.exists():
    load_dotenv(_ENV_FILE)

# Compatibilidad: .env histórico usa MONGO_URL/DB_NAME; el código usa MONGO_URI/MONGO_DB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGO_URL") or "mongodb://localhost:27017"
MONGO_DB = os.getenv("MONGO_DB") or os.getenv("DB_NAME") or "jodify"

# Modo dev: cuenta de desarrollo configurable vía .env. Desactivar en producción con DEV_MODE=false.
DEV_MODE = os.getenv("DEV_MODE", "true").strip().lower() in ("1", "true", "yes", "on")
DEV_USERNAME = os.getenv("DEV_USERNAME", "dev").strip()
DEV_PASSWORD = os.getenv("DEV_PASSWORD", "dev123")
DEV_ROLE = os.getenv("DEV_ROLE", "dev").strip()
# Clave única del dev: con ella se entra al modo dev sin contraseña de cuenta
# (POST /api/auth/dev-access). Solo funciona si DEV_MODE=true.
DEV_KEY = os.getenv("DEV_KEY", "").strip()

JWT_SECRET = os.getenv("JWT_SECRET", "jodify-dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "43200"))

# Orígenes permitidos por CORS (separados por coma). "*" permite todo.
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

AUDIO_BUCKET = "audio"
GRIDFS_CHUNK = 255 * 1024

SEED_AUDIO_DIR = Path(__file__).resolve().parents[2] / "seed_audio"