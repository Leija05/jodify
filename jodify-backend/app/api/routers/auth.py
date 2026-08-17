from datetime import datetime

from fastapi import APIRouter, HTTPException

from ...core.config import DEV_MODE, DEV_USERNAME
from ...core.database import col
from ...core.security import create_token, hash_password, verify_password
from ...services.dev_access import maintenance_blocked
from ..dependencies import CurrentUser
from ...models.schemas import AuthResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/dev-login", response_model=AuthResponse)
async def dev_login() -> AuthResponse:
    """Acceso directo al modo dev con la cuenta configurada en .env. Solo activo si DEV_MODE=true."""
    if not DEV_MODE:
        raise HTTPException(status_code=404, detail="Modo dev desactivado")
    doc = await col("users").find_one({"username": DEV_USERNAME})
    if doc is None:
        raise HTTPException(status_code=503, detail="Cuenta dev no encontrada; reiniciá el backend para sembrarla")
    role = doc.get("role", "dev")
    return AuthResponse(
        token=create_token(doc["username"], role),
        username=doc["username"],
        role=role,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest) -> AuthResponse:
    if await maintenance_blocked():
        raise HTTPException(status_code=503, detail="La plataforma está en mantenimiento. Probá más tarde.")
    doc = await col("users").find_one({"username": body.username.strip()})
    if doc is None or not verify_password(body.password, doc.get("salt", ""), doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    role = doc.get("role", "user")
    return AuthResponse(token=create_token(doc["username"], role), username=doc["username"], role=role)


@router.post("/register", status_code=201)
async def register(body: RegisterRequest) -> None:
    username = body.username.strip()
    if not username or len(username) < 2:
        raise HTTPException(status_code=400, detail="El usuario debe tener al menos 2 caracteres")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")
    role = "user"  # los registros siempre crean roles básicos; admin/dev se asignan por seed
    salt, password_hash = hash_password(body.password)
    try:
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
    except Exception as exc:
        if "E11000" in str(exc):
            raise HTTPException(status_code=409, detail="Ese usuario ya existe") from exc
        raise


@router.get("/me", response_model=AuthResponse)
async def me(user: CurrentUser) -> AuthResponse:
    return AuthResponse(
        token=create_token(user["username"], user.get("role", "user")),
        username=user["username"],
        role=user.get("role", "user"),
    )
