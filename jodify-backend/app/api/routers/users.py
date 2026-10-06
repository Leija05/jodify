from datetime import datetime, timezone
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from ...core.database import col, sid
from ...models.schemas import (
    DiscordRequest,
    HeartbeatRequest,
    ListeningTimeRequest,
    NowPlayingRequest,
    UpdateProfileRequest,
    UserPreferencesRequest,
)
from ..dependencies import require_admin

router = APIRouter(prefix="/api/users", tags=["users"])


def is_recent(last_seen_iso: str | None, max_seconds: int = 150) -> bool:
    if not last_seen_iso:
        return False
    try:
        clean = last_seen_iso.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.utcnow()
        return abs((now - dt).total_seconds()) <= max_seconds
    except Exception:
        return False


def user_view(doc: dict) -> dict:
    presence_status = doc.get("presence_status")
    raw_is_online = doc.get("is_online", 0)
    last_seen = doc.get("last_seen")

    # Si no ha enviado actividad en los últimos 2.5 minutos, marcar offline
    actually_online = raw_is_online == 1 and is_recent(last_seen)
    is_online = 1 if actually_online else 0
    presence = (presence_status or "online") if actually_online else "offline"

    return {
        "id": sid(doc.get("_id")),
        "username": doc.get("username", ""),
        "display_name": doc.get("display_name"),
        "role": doc.get("role", "user"),
        "is_online": is_online,
        "online": is_online == 1,
        "presence": presence,
        "last_seen": last_seen,
        "avatar_url": doc.get("avatar_url"),
        "avatar_source": doc.get("avatar_source", "custom"),
        "discord_id": doc.get("discord_id"),
        "current_song_id": doc.get("current_song_id") if actually_online else None,
        "current_song_name": doc.get("current_song_name") if actually_online else None,
        "listening_since": doc.get("listening_since") if actually_online else None,
        "bio": doc.get("bio", ""),
        "theme": doc.get("theme", "aurora"),
        "avatar_frame": doc.get("avatar_frame", "none"),
        "accent_color": doc.get("accent_color"),
        "profile_effect": doc.get("profile_effect", "none"),
        "profile_bg_mode": doc.get("profile_bg_mode", "preset"),
        "custom_gradient_start": doc.get("custom_gradient_start", "#6366f1"),
        "custom_gradient_end": doc.get("custom_gradient_end", "#ec4899"),
        "show_discord_activity": doc.get("show_discord_activity", True),
        "pet_type": doc.get("pet_type", "none"),
        "pet_variant": doc.get("pet_variant", "orange"),
        "pet_name": doc.get("pet_name"),
        "profile_animation": doc.get("profile_animation", "none"),
        "anthem_song_id": doc.get("anthem_song_id"),
        "anthem_song_name": doc.get("anthem_song_name"),
        "custom_badge": doc.get("custom_badge"),
        "vibe": doc.get("vibe"),
        "listening_seconds": int(doc.get("listening_seconds", 0) or 0),
        "created_at": doc.get("created_at"),
    }


@router.get("")
async def list_users() -> list[dict]:
    cursor = col("users").find({}, {"salt": 0, "password_hash": 0}).sort("is_online", -1)
    return [user_view(doc) for doc in await cursor.to_list(500)]


@router.get("/{username}")
async def get_profile(username: str) -> dict:
    doc = await col("users").find_one({"username": username}, {"salt": 0, "password_hash": 0})
    if doc is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user_view(doc)


@router.get("/{username}/stats")
async def listening_stats(username: str) -> dict:
    liked = await col("likes").count_documents({"username": username})
    played = await col("history").count_documents({"username": username})
    downloaded = await col("downloads").count_documents({"username": username})
    doc = await col("users").find_one({"username": username}, {"listening_seconds": 1}) or {}
    listening_seconds = int(doc.get("listening_seconds", 0) or 0)
    # Asegurar que el tiempo acumulado no quede por debajo del historial de canciones reproducidas
    estimated_history_sec = played * 192
    if estimated_history_sec > listening_seconds:
        listening_seconds = estimated_history_sec
        await col("users").update_one(
            {"username": username},
            {"$set": {"listening_seconds": listening_seconds}}
        )
    return {
        "liked": liked,
        "played": played,
        "downloaded": downloaded,
        "listening_seconds": listening_seconds,
    }


@router.post("/{username}/listening-time")
async def record_listening_time(username: str, body: ListeningTimeRequest) -> dict:
    seconds = max(1, min(body.seconds, 120))
    await col("users").update_one(
        {"username": username},
        {"$inc": {"listening_seconds": seconds}},
    )
    return {"ok": True, "added": seconds}


@router.get("/{username}/top-songs")
async def top_songs(username: str, limit: int = Query(5, ge=1, le=50)) -> list[dict]:
    cursor = col("history").find({"username": username}, {"song_name": 1}).sort("played_at", -1).limit(250)
    counts: dict[str, int] = {}
    async for row in cursor:
        name = row.get("song_name")
        if name:
            counts[name] = counts.get(name, 0) + 1
    return [
        {"song_name": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    ]


@router.get("/{username}/history")
async def history(username: str, limit: int = Query(50, ge=1, le=200)) -> list[dict]:
    cursor = (
        col("history")
        .find({"username": username}, {"song_id": 1, "song_name": 1, "played_at": 1, "_id": 0})
        .sort("played_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(limit)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, _admin: Annotated[dict, Depends(require_admin)]) -> None:
    if str(_admin.get("_id")) == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    try:
        oid = ObjectId(user_id)
        target = await col("users").find_one({"_id": oid})
    except Exception as exc:
        raise HTTPException(status_code=400, detail="ID de usuario inválido") from exc
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if target.get("role") == "dev":
        raise HTTPException(status_code=400, detail="No se puede eliminar la cuenta de desarrollador")
    await col("users").delete_one({"_id": oid})
    target_username = target.get("username")
    if target_username:
        await col("likes").delete_many({"username": target_username})
        await col("history").delete_many({"username": target_username})
        await col("downloads").delete_many({"username": target_username})
        await col("jam_members").delete_many({"username": target_username})


@router.post("/{username}/heartbeat")
async def heartbeat(username: str, body: HeartbeatRequest) -> None:
    presence = body.presence if body.online else "offline"
    is_online = 1 if presence in ("online", "background") else 0
    await col("users").update_one(
        {"username": username},
        {
            "$set": {
                "is_online": is_online,
                "presence_status": presence,
                "last_seen": datetime.now(timezone.utc).isoformat(),
            }
        },
    )


@router.put("/{username}/profile")
async def update_profile(username: str, body: UpdateProfileRequest) -> dict:
    doc = await col("users").find_one({"username": username})
    if not doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    updates: dict = {}
    fields_set = getattr(body, "model_fields_set", None) or getattr(body, "__fields_set__", set())

    if "display_name" in fields_set:
        clean = body.display_name.strip() if body.display_name else None
        updates["display_name"] = clean or None
    if "avatar_url" in fields_set:
        clean = body.avatar_url.strip() if body.avatar_url else None
        updates["avatar_url"] = clean or None
    if "avatar_source" in fields_set:
        clean = body.avatar_source.strip() if body.avatar_source else "custom"
        updates["avatar_source"] = clean
    if "discord_id" in fields_set:
        clean = body.discord_id.strip() if body.discord_id else None
        updates["discord_id"] = clean or None
    if "bio" in fields_set:
        updates["bio"] = (body.bio.strip()[:160]) if body.bio else ""
    if "theme" in fields_set:
        updates["theme"] = body.theme.strip() if body.theme else "aurora"
    if "avatar_frame" in fields_set:
        updates["avatar_frame"] = body.avatar_frame.strip() if body.avatar_frame else "none"
    if "anthem_song_id" in fields_set:
        updates["anthem_song_id"] = body.anthem_song_id if body.anthem_song_id else None
    if "anthem_song_name" in fields_set:
        clean = body.anthem_song_name.strip() if body.anthem_song_name else None
        updates["anthem_song_name"] = clean or None
    if "custom_badge" in fields_set:
        clean = body.custom_badge.strip() if body.custom_badge else None
        updates["custom_badge"] = clean or None
    if "vibe" in fields_set:
        clean = body.vibe.strip()[:60] if body.vibe else None
        updates["vibe"] = clean or None
    if "accent_color" in fields_set:
        clean = body.accent_color.strip() if body.accent_color else None
        updates["accent_color"] = clean or None
    if "profile_effect" in fields_set:
        clean = body.profile_effect.strip() if body.profile_effect else "none"
        updates["profile_effect"] = clean
    if "profile_bg_mode" in fields_set:
        clean = body.profile_bg_mode.strip() if body.profile_bg_mode else "preset"
        updates["profile_bg_mode"] = clean
    if "custom_gradient_start" in fields_set:
        clean = body.custom_gradient_start.strip() if body.custom_gradient_start else "#6366f1"
        updates["custom_gradient_start"] = clean
    if "custom_gradient_end" in fields_set:
        clean = body.custom_gradient_end.strip() if body.custom_gradient_end else "#ec4899"
        updates["custom_gradient_end"] = clean
    if "show_discord_activity" in fields_set:
        updates["show_discord_activity"] = bool(body.show_discord_activity) if body.show_discord_activity is not None else True
    if "pet_type" in fields_set:
        clean = body.pet_type.strip() if body.pet_type else "none"
        updates["pet_type"] = clean
    if "pet_variant" in fields_set:
        clean = body.pet_variant.strip() if body.pet_variant else "orange"
        updates["pet_variant"] = clean
    if "pet_name" in fields_set:
        clean = body.pet_name.strip()[:30] if body.pet_name else None
        updates["pet_name"] = clean
    if "profile_animation" in fields_set:
        clean = body.profile_animation.strip() if body.profile_animation else "none"
        updates["profile_animation"] = clean


    if body.new_username and body.new_username.strip() != username:
        new_user = body.new_username.strip()
        existing = await col("users").find_one({"username": new_user})
        if existing:
            raise HTTPException(status_code=409, detail="Ese nombre de usuario ya está en uso")
        updates["username"] = new_user

    if updates:
        await col("users").update_one({"username": username}, {"$set": updates})

    updated_doc = await col("users").find_one({"_id": doc["_id"]})
    return user_view(updated_doc or doc)


@router.put("/{username}/discord")
async def set_discord(username: str, body: DiscordRequest) -> None:
    await col("users").update_one({"username": username}, {"$set": {"discord_id": body.discord_id}})


@router.put("/{username}/now-playing")
async def now_playing(username: str, body: NowPlayingRequest) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    now_updates: dict = {
        "current_song_id": body.song_id,
        "current_song_name": body.song_name,
        "listening_since": now_iso if body.song_id is not None else None,
    }
    if body.song_id is not None:
        now_updates["last_seen"] = now_iso
        now_updates["is_online"] = 1
        now_updates["presence_status"] = "online"

    await col("users").update_one(
        {"username": username},
        {"$set": now_updates},
    )


@router.get("/{username}/preferences")
async def get_preferences(username: str) -> dict:
    doc = await col("users").find_one({"username": username}, {"preferences": 1})
    if doc is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    prefs = doc.get("preferences") or {}
    return {
        "eq_preset": prefs.get("eq_preset", "flat"),
        "eq_bands": prefs.get("eq_bands", [0.0] * 10),
        "custom_eq_presets": prefs.get("custom_eq_presets", {}),
        "fade_enabled": prefs.get("fade_enabled", True),
        "fade_duration": prefs.get("fade_duration", 3.0),
        "sleep_timer_default": prefs.get("sleep_timer_default", 0),
        "theme": prefs.get("theme", "dark"),
    }


@router.put("/{username}/preferences")
async def update_preferences(username: str, body: UserPreferencesRequest) -> dict:
    update_data = {}
    for key, val in body.model_dump(exclude_unset=True).items():
        if val is not None:
            update_data[f"preferences.{key}"] = val
    if update_data:
        await col("users").update_one({"username": username}, {"$set": update_data})
    return await get_preferences(username)
