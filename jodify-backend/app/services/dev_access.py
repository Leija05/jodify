"""Servicio de acceso dev: clave única, tokens de acceso y modo mantenimiento."""

import hashlib
import hmac
import secrets
import string
from datetime import datetime, timedelta

from bson import ObjectId

from ..core.config import DEV_KEY
from ..core.database import col, sid

# Letras y números sin ambiguos (0/O, 1/I/L)
_TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
TOKEN_PREFIX = "JDFY"
TOKEN_GROUP_SIZE = 4
TOKEN_GROUPS = 4

_ROLES_OK = {"admin", "mod"}


def _now() -> str:
    return datetime.now().isoformat()


def generate_token() -> str:
    groups = ["".join(secrets.choice(_TOKEN_ALPHABET) for _ in range(TOKEN_GROUP_SIZE)) for _ in range(TOKEN_GROUPS)]
    return f"{TOKEN_PREFIX}-{'-'.join(groups)}"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.strip().upper().encode("utf-8")).hexdigest()


def normalize_token(token: str) -> str:
    return token.strip().upper().replace(" ", "-")


def verify_dev_key(provided: str) -> bool:
    """Compara la clave contra DEV_KEY en tiempo constante. Devuelve False si no está configurada."""
    if not DEV_KEY:
        return False
    try:
        return hmac.compare_digest(provided.strip().encode("utf-8"), DEV_KEY.encode("utf-8"))
    except Exception:
        return False


async def create_access_token(*, role: str, label: str = "", expires_in_days: int | None = 7, max_uses: int = 1, created_by: str = "") -> dict:
    role = role.strip().lower()
    if role not in _ROLES_OK:
        raise ValueError(f"Rol inválido: {role}. Usá 'admin' o 'mod'.")
    if max_uses < 1:
        raise ValueError("max_uses debe ser al menos 1")
    plain = generate_token()
    expires_at = (datetime.now() + timedelta(days=expires_in_days)).isoformat() if expires_in_days else None
    doc = {
        "token_hash": hash_token(plain),
        "role": role,
        "label": label.strip()[:60],
        "max_uses": max_uses,
        "uses": 0,
        "created_by": created_by,
        "created_at": _now(),
        "expires_at": expires_at,
        "revoked": False,
        "redeemed_by": [],
    }
    result = await col("dev_tokens").insert_one(doc)
    return {**token_view(doc | {"_id": result.inserted_id}), "token": plain}


def token_view(doc: dict) -> dict:
    status = "revoked"
    if not doc.get("revoked"):
        expires_at = doc.get("expires_at")
        if expires_at and expires_at < _now():
            status = "expired"
        elif (doc.get("max_uses") or 1) > 0 and (doc.get("uses") or 0) >= (doc.get("max_uses") or 1):
            status = "used"
        else:
            status = "active"
    return {
        "id": sid(doc.get("_id")),
        "role": doc.get("role", "admin"),
        "label": doc.get("label", ""),
        "max_uses": doc.get("max_uses", 1),
        "uses": doc.get("uses", 0),
        "created_by": doc.get("created_by", ""),
        "created_at": doc.get("created_at", ""),
        "expires_at": doc.get("expires_at"),
        "revoked": bool(doc.get("revoked")),
        "status": status,
        "redeemed_by": doc.get("redeemed_by", []),
    }


async def redeem_access_token(plain: str) -> dict | None:
    """Consume un token. Devuelve el doc del token si es canjeable, o None."""
    token_hash = hash_token(plain)
    doc = await col("dev_tokens").find_one({"token_hash": token_hash})
    if doc is None:
        return None
    if doc.get("revoked"):
        return None
    expires_at = doc.get("expires_at")
    if expires_at and expires_at < _now():
        return None
    if (doc.get("max_uses") or 1) > 0 and (doc.get("uses") or 0) >= (doc.get("max_uses") or 1):
        return None
    await col("dev_tokens").update_one(
        {"_id": doc["_id"]},
        {"$inc": {"uses": 1}},
    )
    return doc


async def record_redemption(token_id: ObjectId, username: str) -> None:
    await col("dev_tokens").update_one(
        {"_id": token_id},
        {"$push": {"redeemed_by": {"username": username, "at": _now()}}},
    )


# ---------- Modo mantenimiento ----------

async def get_maintenance() -> dict:
    doc = await col("system_state").find_one({"_id": "flags"})
    state = doc.get("maintenance") if doc else None
    if not isinstance(state, dict):
        state = {"enabled": False, "message": "", "set_by": ""}
    return state


async def set_maintenance(enabled: bool, message: str = "", set_by: str = "") -> dict:
    state = {"enabled": bool(enabled), "message": message.strip()[:200], "set_by": set_by, "set_at": _now()}
    await col("system_state").update_one({"_id": "flags"}, {"$set": {"maintenance": state}}, upsert=True)
    return state


async def maintenance_blocked() -> bool:
    state = await get_maintenance()
    return bool(state.get("enabled"))
