"""Panel de control del dev: clave única, tokens de acceso, métricas y consola live."""

import asyncio
from datetime import datetime, timedelta
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pymongo.errors import PyMongoError

from ...core.config import DEV_MODE, DEV_USERNAME, JWT_EXPIRES_MINUTES
from ...core.database import col, connect, db, sid
from ...core.security import create_token as create_jwt_token, hash_password
from ...models.schemas import (
    AuthResponse,
    CreateDevKeyRequest,
    CreateDevTokenRequest,
    CreateUserRequest,
    DevAccessRequest,
    DevUpdateUserRequest,
    MaintenanceRequest,
    RedeemTokenRequest,
    SetRoleRequest,
)
from ...services import events
from ...services.dev_access import (
    create_access_token,
    create_dev_key,
    dev_key_view,
    get_maintenance,
    maintenance_blocked,
    normalize_token,
    record_redemption,
    redeem_access_token,
    revoke_dev_key,
    set_maintenance,
    token_view,
    verify_dev_key,
)
from ..dependencies import require_admin, require_dev

router = APIRouter(prefix="/api/dev", tags=["dev"])


# ---------- Acceso público ----------

@router.post("/access", response_model=AuthResponse)
async def dev_access(body: DevAccessRequest) -> AuthResponse:
    """Canjea una clave dev (generada con tools/generate_dev_key.py o validada contra la DB) por una sesión dev."""
    if not DEV_MODE:
        raise HTTPException(status_code=404, detail="Modo dev desactivado")
    if not await verify_dev_key(body.dev_key):
        raise HTTPException(status_code=401, detail="Clave de desarrollo incorrecta")
    doc = await col("users").find_one({"username": DEV_USERNAME})
    if doc is None:
        raise HTTPException(status_code=503, detail="Cuenta dev no encontrada; reiniciá el backend para sembrarla")
    role = doc.get("role", "dev")
    await events.publish({"type": "dev.access", "message": f"Acceso dev: {DEV_USERNAME}"})
    return AuthResponse(token=create_jwt_token(doc["username"], role), username=doc["username"], role=role)


@router.post("/redeem", response_model=AuthResponse)
async def redeem_token(body: RedeemTokenRequest) -> AuthResponse:
    """Canjea un token de acceso generado por el dev: crea la cuenta con su rol."""
    if await maintenance_blocked():
        raise HTTPException(status_code=503, detail="La plataforma está en mantenimiento. Probá más tarde.")
    username = body.username.strip()
    if len(username) < 2:
        raise HTTPException(status_code=400, detail="El usuario debe tener al menos 2 caracteres")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")
    existing = await col("users").find_one({"username": username})
    if existing:
        raise HTTPException(status_code=409, detail="Ese usuario ya existe")
    doc = await redeem_access_token(normalize_token(body.token))
    if doc is None:
        raise HTTPException(status_code=401, detail="Token inválido, agotado o expirado")
    salt, password_hash = hash_password(body.password)
    try:
        await col("users").insert_one(
            {
                "username": username,
                "salt": salt,
                "password_hash": password_hash,
                "role": doc.get("role", "admin"),
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
        await col("dev_tokens").update_one({"_id": doc["_id"]}, {"$inc": {"uses": -1}})
        if "E11000" in str(exc):
            raise HTTPException(status_code=409, detail="Ese usuario ya existe") from exc
        raise
    await record_redemption(doc["_id"], username)
    await events.publish(
        {"type": "token.redeemed", "message": f"Token {doc.get('label') or doc.get('role', '?')} canjeado por @{username} ({doc.get('role')})"}
    )
    return AuthResponse(
        token=create_jwt_token(username, doc.get("role", "admin")),
        username=username,
        role=doc.get("role", "admin"),
    )


# ---------- Solo dev ----------

@router.get("/state")
async def dev_state(_dev: Annotated[dict, Depends(require_dev)]) -> dict:
    """Estado global del panel: flags, modo dev y capacidades."""
    maintenance = await get_maintenance()
    return {
        "dev_mode": DEV_MODE,
        "dev_username": DEV_USERNAME,
        "maintenance": maintenance,
        "token_roles": ["admin", "mod"],
        "jwt_expires_minutes": JWT_EXPIRES_MINUTES,
    }


@router.get("/overview")
async def overview(_dev: Annotated[dict, Depends(require_dev)]) -> dict:
    """Métricas globales para la vista general."""
    now = datetime.now()
    since_24h = (now - timedelta(hours=24)).isoformat()
    since_7d = (now - timedelta(days=7)).isoformat()

    async def count(name: str, filter: dict | None = None) -> int:
        try:
            return await col(name).count_documents(filter or {})
        except PyMongoError:
            return 0

    users, online, songs, likes, downloads = await asyncio.gather(
        count("users"),
        count("users", {"is_online": 1}),
        count("songs"),
        count("likes"),
        count("downloads"),
    )
    plays_24h, plays_total, plays_7d, jams_active, logs_total = await asyncio.gather(
        count("history", {"played_at": {"$gte": since_24h}}),
        count("history"),
        count("history", {"played_at": {"$gte": since_7d}}),
        count("jam_sessions", {"is_active": True}),
        count("logs"),
    )
    jam_members = await count("jam_members", {"active": True})
    tokens_active = await count("dev_tokens", {"revoked": False})
    maintenance = await get_maintenance()

    storage = {"data_size": 0, "fs_used": 0}
    try:
        if db is not None:
            stats = await db.command("dbStats")
            storage = {"data_size": stats.get("dataSize", 0), "fs_used": stats.get("fsUsedSize", 0)}
    except Exception:
        pass

    cursor = (
        col("history")
        .aggregate(
            [
                {"$group": {"_id": "$song_id", "song_name": {"$first": "$song_name"}, "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 5},
            ]
        )
    )
    top = [
        {"song_name": row.get("song_name") or "Anónima", "count": row["count"]}
        async for row in cursor
    ]

    return {
        "users": users,
        "online": online,
        "songs": songs,
        "likes": likes,
        "downloads": downloads,
        "plays_24h": plays_24h,
        "plays_7d": plays_7d,
        "plays_total": plays_total,
        "jams_active": jams_active,
        "jam_members": jam_members,
        "logs_total": logs_total,
        "tokens_active": tokens_active,
        "top_songs": top,
        "storage": storage,
        "maintenance": maintenance,
        "server_time": now.isoformat(),
    }


@router.get("/plays")
async def plays_per_day(days: int = Query(14, ge=3, le=60), _dev: Annotated[dict, Depends(require_dev)] = None) -> list[dict]:
    """Reproducciones por día para el sparkline (últimos N días, con ceros)."""
    start = (datetime.now() - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    pipeline = [
        {"$match": {"played_at": {"$gte": start.isoformat()}}},
        {"$group": {"_id": {"$substr": ["$played_at", 0, 10]}, "count": {"$sum": 1}}},
    ]
    rows: dict[str, int] = {}
    async for row in col("history").aggregate(pipeline):
        key = str(row["_id"])
        rows[key] = row["count"]
    return [{"date": (start + timedelta(days=i)).date().isoformat(), "count": rows.get((start + timedelta(days=i)).date().isoformat(), 0)} for i in range(days)]


@router.get("/tokens")
async def list_tokens(_dev: Annotated[dict, Depends(require_dev)]) -> list[dict]:
    cursor = col("dev_tokens").find({}).sort("created_at", -1).limit(200)
    return [token_view(doc) async for doc in cursor]


@router.post("/tokens", status_code=201)
async def create_dev_access_token(body: CreateDevTokenRequest, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    try:
        created = await create_access_token(
            role=body.role,
            label=body.label,
            expires_in_days=body.expires_in_days,
            max_uses=body.max_uses,
            assigned_username=body.assigned_username,
            assigned_password=body.assigned_password,
            created_by=dev.get("username", ""),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await events.publish(
        {"type": "token.created", "message": f"Token {created['role']} creado por @{dev.get('username', '')}: {created['label'] or 'sin etiqueta'}"}
    )
    return created


@router.post("/tokens/{token_id}/revoke")
async def revoke_token(token_id: str, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    try:
        result = await col("dev_tokens").update_one({"_id": ObjectId(token_id)}, {"$set": {"revoked": True}})
    except Exception as exc:
        raise HTTPException(status_code=400, detail="ID de token inválido") from exc
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Token no encontrado")
    await events.publish({"type": "token.revoked", "message": f"Token revocado por @{dev.get('username', '')}"})
    return {"ok": True}


@router.get("/users")
async def dev_users(_dev: Annotated[dict, Depends(require_dev)]) -> list[dict]:
    cursor = col("users").find({}, {"salt": 0, "password_hash": 0}).sort("created_at", -1).limit(500)
    return [
        {
            "id": sid(doc.get("_id")),
            "username": doc.get("username", ""),
            "display_name": doc.get("display_name"),
            "role": doc.get("role", "user"),
            "bio": doc.get("bio", ""),
            "is_online": doc.get("is_online", 0),
            "last_seen": doc.get("last_seen"),
            "created_at": doc.get("created_at"),
            "avatar_url": doc.get("avatar_url"),
            "avatar_source": doc.get("avatar_source", "custom"),
            "avatar_frame": doc.get("avatar_frame", "none"),
            "theme": doc.get("theme", "aurora"),
            "accent_color": doc.get("accent_color"),
            "profile_effect": doc.get("profile_effect", "none"),
            "custom_badge": doc.get("custom_badge"),
            "vibe": doc.get("vibe"),
            "profile_bg_mode": doc.get("profile_bg_mode", "preset"),
            "custom_gradient_start": doc.get("custom_gradient_start", "#6366f1"),
            "custom_gradient_end": doc.get("custom_gradient_end", "#ec4899"),
            "anthem_song_name": doc.get("anthem_song_name"),
            "discord_id": doc.get("discord_id"),
        }
        async for doc in cursor
    ]


@router.post("/users", status_code=201)
async def create_user(body: CreateUserRequest, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    """El dev crea cuentas: puede asignar 'user', 'mod' o 'admin'."""
    role = body.role.strip().lower() if body.role else "user"
    if role not in ("user", "mod", "admin"):
        raise HTTPException(status_code=400, detail="Rol inválido. Usá 'user', 'mod' o 'admin'.")
    username = body.username.strip()
    if len(username) < 2:
        raise HTTPException(status_code=400, detail="El usuario debe tener al menos 2 caracteres")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")
    existing = await col("users").find_one({"username": username})
    if existing:
        raise HTTPException(status_code=409, detail="Ese usuario ya existe")
    salt, password_hash = hash_password(body.password)
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
    await events.publish(
        {"type": "user.created", "message": f"Cuenta @{username} creada con rol {role} por @{dev.get('username', '')}"}
    )
    return {"ok": True, "username": username, "role": role}


# ---------- Claves dev (generadas por script o por panel) ----------

@router.get("/keys")
async def list_dev_keys(_dev: Annotated[dict, Depends(require_dev)]) -> list[dict]:
    cursor = col("dev_keys").find({}).sort("created_at", -1).limit(100)
    return [dev_key_view(doc) async for doc in cursor]


@router.post("/keys", status_code=201)
async def create_dev_key_endpoint(body: CreateDevKeyRequest, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    created = await create_dev_key(label=body.label or "", created_by=dev.get("username", ""))
    await events.publish(
        {"type": "devkey.created", "message": f"Clave dev creada por @{dev.get('username', '')}: {created.get('label') or 'sin etiqueta'}"}
    )
    return created


@router.post("/keys/{key_id}/revoke")
async def revoke_dev_key_endpoint(key_id: str, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    if not await revoke_dev_key(key_id):
        raise HTTPException(status_code=404, detail="Clave dev no encontrada")
    await events.publish({"type": "devkey.revoked", "message": f"Clave dev revocada por @{dev.get('username', '')}"})
    return {"ok": True}


@router.post("/users/{username}/role")
async def set_user_role(username: str, body: SetRoleRequest, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    role = body.role.strip().lower()
    if role not in ("user", "mod", "admin"):
        raise HTTPException(status_code=400, detail="Rol inválido")
    target = await col("users").find_one({"username": username})
    if target is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if target.get("role") == "dev":
        raise HTTPException(status_code=400, detail="No se puede modificar el rol del dev")
    if role == "dev":
        raise HTTPException(status_code=400, detail="No se puede otorgar el rol dev")
    await col("users").update_one({"username": username}, {"$set": {"role": role}})
    await events.publish(
        {"type": "role.changed", "message": f"@{username} ahora es {role} (por @{dev.get('username', '')})"}
    )
    return {"ok": True, "username": username, "role": role}


@router.post("/users/{username}/offline")
async def force_offline(username: str, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    result = await col("users").update_one(
        {"username": username},
        {"$set": {"is_online": 0, "last_seen": datetime.now().isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await events.publish({"type": "user.offline", "message": f"@{username} forzado a offline por @{dev.get('username', '')}"})
    return {"ok": True}


@router.put("/users/{identifier}")
async def dev_update_user(identifier: str, body: DevUpdateUserRequest, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    """Modifica los datos de un usuario: username, password, rol, perfil, etc."""
    query = {"username": identifier}
    if ObjectId.is_valid(identifier):
        query = {"$or": [{"_id": ObjectId(identifier)}, {"username": identifier}]}

    target = await col("users").find_one(query)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    old_username = target.get("username", "")
    updates: dict = {}
    fields_set = getattr(body, "model_fields_set", None) or getattr(body, "__fields_set__", set())

    new_username = None
    if "new_username" in fields_set and body.new_username:
        clean_name = body.new_username.strip()
        if len(clean_name) < 2:
            raise HTTPException(status_code=400, detail="El nombre de usuario debe tener al menos 2 caracteres")
        if clean_name != old_username:
            if target.get("role") == "dev" and old_username == DEV_USERNAME:
                raise HTTPException(status_code=400, detail="No se puede cambiar el nombre de la cuenta dev principal")
            existing = await col("users").find_one({"username": clean_name})
            if existing:
                raise HTTPException(status_code=409, detail="Ese nombre de usuario ya está en uso")
            updates["username"] = clean_name
            new_username = clean_name

    if "password" in fields_set and body.password:
        clean_pwd = body.password.strip()
        if len(clean_pwd) < 4:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")
        salt, p_hash = hash_password(clean_pwd)
        updates["salt"] = salt
        updates["password_hash"] = p_hash

    if "role" in fields_set and body.role:
        new_role = body.role.strip().lower()
        if new_role not in ("user", "mod", "admin", "dev"):
            raise HTTPException(status_code=400, detail="Rol inválido")
        if target.get("role") == "dev" and new_role != "dev":
            raise HTTPException(status_code=400, detail="No se puede degradar la cuenta dev")
        if target.get("role") != "dev" and new_role == "dev":
            raise HTTPException(status_code=400, detail="No se puede otorgar el rol dev")
        updates["role"] = new_role

    if "display_name" in fields_set:
        updates["display_name"] = body.display_name.strip() if body.display_name else None
    if "bio" in fields_set:
        updates["bio"] = body.bio.strip()[:160] if body.bio else ""
    if "avatar_url" in fields_set:
        updates["avatar_url"] = body.avatar_url.strip() if body.avatar_url else None
    if "avatar_source" in fields_set:
        updates["avatar_source"] = body.avatar_source.strip() if body.avatar_source else "custom"
    if "discord_id" in fields_set:
        updates["discord_id"] = body.discord_id.strip() if body.discord_id else None
    if "custom_badge" in fields_set:
        updates["custom_badge"] = body.custom_badge.strip() if body.custom_badge else None
    if "vibe" in fields_set:
        updates["vibe"] = body.vibe.strip()[:60] if body.vibe else None
    if "theme" in fields_set:
        updates["theme"] = body.theme.strip() if body.theme else "aurora"
    if "accent_color" in fields_set:
        updates["accent_color"] = body.accent_color.strip() if body.accent_color else None
    if "avatar_frame" in fields_set:
        updates["avatar_frame"] = body.avatar_frame.strip() if body.avatar_frame else "none"
    if "profile_effect" in fields_set:
        updates["profile_effect"] = body.profile_effect.strip() if body.profile_effect else "none"
    if "profile_bg_mode" in fields_set:
        updates["profile_bg_mode"] = body.profile_bg_mode.strip() if body.profile_bg_mode else "preset"
    if "custom_gradient_start" in fields_set:
        updates["custom_gradient_start"] = body.custom_gradient_start.strip() if body.custom_gradient_start else "#6366f1"
    if "custom_gradient_end" in fields_set:
        updates["custom_gradient_end"] = body.custom_gradient_end.strip() if body.custom_gradient_end else "#ec4899"

    if updates:
        await col("users").update_one({"_id": target["_id"]}, {"$set": updates})

    if new_username and new_username != old_username:
        await col("likes").update_many({"username": old_username}, {"$set": {"username": new_username}})
        await col("history").update_many({"username": old_username}, {"$set": {"username": new_username}})
        await col("downloads").update_many({"username": old_username}, {"$set": {"username": new_username}})
        await col("jam_members").update_many({"username": old_username}, {"$set": {"username": new_username}})

    await events.publish({
        "type": "user.updated",
        "message": f"Datos de @{old_username} modificados por @{dev.get('username', '')}"
    })

    updated_doc = await col("users").find_one({"_id": target["_id"]})
    return {
        "id": sid(updated_doc.get("_id")),
        "username": updated_doc.get("username", ""),
        "display_name": updated_doc.get("display_name"),
        "role": updated_doc.get("role", "user"),
        "bio": updated_doc.get("bio", ""),
        "avatar_url": updated_doc.get("avatar_url"),
        "avatar_source": updated_doc.get("avatar_source", "custom"),
        "avatar_frame": updated_doc.get("avatar_frame", "none"),
        "theme": updated_doc.get("theme", "aurora"),
        "accent_color": updated_doc.get("accent_color"),
        "profile_effect": updated_doc.get("profile_effect", "none"),
        "custom_badge": updated_doc.get("custom_badge"),
        "vibe": updated_doc.get("vibe"),
        "profile_bg_mode": updated_doc.get("profile_bg_mode", "preset"),
        "custom_gradient_start": updated_doc.get("custom_gradient_start", "#6366f1"),
        "custom_gradient_end": updated_doc.get("custom_gradient_end", "#ec4899"),
        "anthem_song_name": updated_doc.get("anthem_song_name"),
        "discord_id": updated_doc.get("discord_id"),
        "is_online": updated_doc.get("is_online", 0),
        "last_seen": updated_doc.get("last_seen"),
        "created_at": updated_doc.get("created_at"),
    }


@router.delete("/users/{identifier}")
async def dev_delete_user(identifier: str, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    """Elimina permanentemente una cuenta de usuario y sus datos asociados."""
    query = {"username": identifier}
    if ObjectId.is_valid(identifier):
        query = {"$or": [{"_id": ObjectId(identifier)}, {"username": identifier}]}

    target = await col("users").find_one(query)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if target.get("role") == "dev":
        raise HTTPException(status_code=400, detail="No se puede eliminar la cuenta de desarrollador")

    target_username = target.get("username", "")
    if dev.get("username") == target_username:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta en sesión")

    await col("users").delete_one({"_id": target["_id"]})

    if target_username:
        await col("likes").delete_many({"username": target_username})
        await col("history").delete_many({"username": target_username})
        await col("downloads").delete_many({"username": target_username})
        await col("jam_members").delete_many({"username": target_username})

    await events.publish({
        "type": "user.deleted",
        "message": f"Usuario @{target_username} eliminado por @{dev.get('username', '')}"
    })

    return {"ok": True, "username": target_username}


@router.post("/maintenance")
async def set_dev_maintenance(body: MaintenanceRequest, dev: Annotated[dict, Depends(require_dev)]) -> dict:
    state = await set_maintenance(body.enabled, body.message, dev.get("username", ""))
    await events.publish(
        {
            "type": "maintenance",
            "message": f"Mantenimiento {'ACTIVADO' if body.enabled else 'desactivado'} por @{dev.get('username', '')}"
            + (f": {body.message}" if body.message else ""),
        }
    )
    return state


@router.delete("/logs", status_code=204)
async def purge_logs(_dev: Annotated[dict, Depends(require_dev)]) -> None:
    await col("logs").delete_many({})


@router.get("/stream")
async def dev_stream(_dev: Annotated[dict, Depends(require_dev)]) -> StreamingResponse:
    """SSE: métricas cada 4 s + eventos live (logs, tokens, roles, mantenimiento)."""

    async def event_source():
        import asyncio
        import json

        sent_recent: set[str] = set()
        for event in await events.recent(60):
            sent_recent.add(f"{event.get('type')}:{event.get('ts')}")
        async for event in events.subscribe():
            event_id = f"{event.get('type')}:{event.get('ts')}"
            if event_id in sent_recent:
                continue
            sent_recent.add(event_id)
            yield f"event: dev\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event.get("type") == "ping":
                await asyncio.sleep(0)

    return StreamingResponse(event_source(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
