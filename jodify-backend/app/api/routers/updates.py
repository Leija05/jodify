"""Router de actualizaciones de la aplicación (APKs) almacenadas directamente en MongoDB GridFS."""

import logging
import re
from datetime import datetime, timezone
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from starlette.responses import StreamingResponse

from ...core.database import col, sid
from ...services.apk_storage import delete_apk, serve_apk, store_apk
from ..dependencies import require_admin

logger = logging.getLogger("jodify.updates")
router = APIRouter(prefix="/api/updates", tags=["updates"])


def _parse_version(version_str: str) -> tuple[int, ...]:
    """Convierte '2.0.1' o 'v2.1.0' en una tupla de enteros (2, 0, 1) para comparación numérica."""
    clean = re.sub(r"^[vV]", "", version_str.strip())
    parts = []
    for p in clean.split("."):
        try:
            parts.append(int(p))
        except ValueError:
            parts.append(0)
    return tuple(parts)


def _is_newer(latest_ver: str, current_ver: str, latest_build: int | None = None, current_build: int | None = None) -> bool:
    """Verifica si latest es superior a current ya sea por build_number o por semver."""
    if latest_build is not None and current_build is not None:
        if latest_build > current_build:
            return True
        if latest_build < current_build:
            return False

    v_latest = _parse_version(latest_ver)
    v_current = _parse_version(current_ver)

    # Pad with zeros to equalize lengths
    max_len = max(len(v_latest), len(v_current))
    v_latest_padded = v_latest + (0,) * (max_len - len(v_latest))
    v_current_padded = v_current + (0,) * (max_len - len(v_current))

    return v_latest_padded > v_current_padded


# ---------- Endpoints Públicos de la App Móvil ----------

@router.get("/check")
async def check_update(
    platform: str = Query("android", description="Plataforma de la app"),
    current_version: str = Query("1.0.0", description="Versión instalada"),
    build_number: int | None = Query(None, description="Número de build instalado"),
) -> dict:
    """
    Comprueba si existe una versión más reciente activa en la base de datos.
    """
    doc = await col("app_updates").find_one(
        {"platform": platform.lower(), "is_active": True},
        sort=[("created_at", -1)],
    )

    if not doc:
        return {
            "update_available": False,
            "current_version": current_version,
            "message": "No hay actualizaciones registradas en la base de datos",
        }

    latest_version = doc.get("version", "1.0.0")
    latest_build = doc.get("build_number")

    has_update = _is_newer(latest_version, current_version, latest_build, build_number)

    if not has_update:
        return {
            "update_available": False,
            "current_version": current_version,
            "latest_version": latest_version,
            "message": "La aplicación ya cuenta con la versión más reciente",
        }

    update_id = sid(doc["_id"])
    return {
        "update_available": True,
        "id": update_id,
        "version": latest_version,
        "build_number": latest_build or 0,
        "current_version": current_version,
        "release_notes": doc.get("release_notes", "Mejoras generales y correcciones de errores."),
        "size_bytes": doc.get("size_bytes", 0),
        "sha256": doc.get("sha256", ""),
        "mandatory": bool(doc.get("mandatory", False)),
        "download_url": f"/api/updates/download/{update_id}",
        "filename": doc.get("filename", f"JodiFy-v{latest_version}.apk"),
        "uploaded_at": doc.get("created_at", ""),
    }


@router.get("/download/{update_id}")
async def download_update(update_id: str, request: Request) -> StreamingResponse:
    """
    Descarga el archivo APK correspondiente al ID de actualización desde GridFS.
    """
    try:
        oid = ObjectId(update_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID de actualización inválido")

    doc = await col("app_updates").find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Actualización no encontrada")

    file_id = doc.get("file_id")
    if not file_id:
        raise HTTPException(status_code=404, detail="Archivo binario no encontrado")

    filename = doc.get("filename") or f"JodiFy-v{doc.get('version', 'app')}.apk"
    return await serve_apk(file_id, filename, request)


@router.get("/latest/download")
async def download_latest_update(request: Request, platform: str = "android") -> StreamingResponse:
    """
    Descarga directa de la última versión APK activa.
    """
    doc = await col("app_updates").find_one(
        {"platform": platform.lower(), "is_active": True},
        sort=[("created_at", -1)],
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No hay actualizaciones disponibles")

    file_id = doc.get("file_id")
    filename = doc.get("filename") or f"JodiFy-v{doc.get('version', 'app')}.apk"
    return await serve_apk(file_id, filename, request)


# ---------- Endpoints de Gestión DEV / ADMIN ----------

@router.post("/upload")
async def upload_update(
    file: UploadFile = File(..., description="Archivo binario .apk"),
    version: str = Form(..., description="Versión semver, ej: 2.0.1"),
    build_number: int | None = Form(None, description="Número entero de build, ej: 21"),
    release_notes: str = Form("", description="Notas de la versión y changelog"),
    mandatory: bool = Form(False, description="¿La actualización es obligatoria?"),
    platform: str = Form("android", description="Plataforma de destino (android/desktop)"),
    admin: dict = Depends(require_admin),
) -> dict:
    """
    Sube un archivo APK a la base de datos MongoDB (GridFS) y lo activa como la versión más reciente.
    """
    if not file.filename or not file.filename.lower().endswith(".apk"):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión .apk")

    clean_version = re.sub(r"^[vV]", "", version.strip())
    if not clean_version:
        raise HTTPException(status_code=400, detail="Debe proporcionar una versión válida")

    # Guardar archivo en GridFS bucket 'apk_releases'
    safe_filename = f"JodiFy-v{clean_version}.apk"
    try:
        file_id, size_bytes, sha256_hash = await store_apk(safe_filename, file)
    except Exception as exc:
        logger.exception("Error al guardar APK en GridFS")
        raise HTTPException(status_code=500, detail=f"Error al escribir en la base de datos: {exc}")

    # Desactivar versiones activas anteriores de esta plataforma
    await col("app_updates").update_many(
        {"platform": platform.lower(), "is_active": True},
        {"$set": {"is_active": False}},
    )

    # Insertar metadata del nuevo release
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "platform": platform.lower(),
        "version": clean_version,
        "build_number": build_number or 0,
        "release_notes": release_notes.strip() or f"Actualización a la versión v{clean_version}",
        "file_id": file_id,
        "filename": safe_filename,
        "size_bytes": size_bytes,
        "sha256": sha256_hash,
        "mandatory": bool(mandatory),
        "is_active": True,
        "uploaded_by": admin.get("username", "admin"),
        "created_at": now_iso,
    }

    res = await col("app_updates").insert_one(record)
    record["_id"] = str(res.inserted_id)
    record["file_id"] = str(file_id)

    # Registrar log en system_logs
    await col("logs").insert_one({
        "event_type": "app.update_uploaded",
        "message": f"Nueva versión {clean_version} subida por {admin.get('username')}",
        "admin_user": admin.get("username"),
        "created_at": now_iso,
    })

    return {
        "success": True,
        "message": f"Actualización v{clean_version} subida y activada con éxito en la base de datos.",
        "update": record,
    }


@router.get("/list")
async def list_updates(_admin: dict = Depends(require_admin)) -> list[dict]:
    """
    Lista el historial de todas las actualizaciones subidas a la base de datos.
    """
    cursor = col("app_updates").find({}).sort("created_at", -1)
    results = []
    async for doc in cursor:
        results.append({
            "id": sid(doc["_id"]),
            "platform": doc.get("platform", "android"),
            "version": doc.get("version"),
            "build_number": doc.get("build_number", 0),
            "release_notes": doc.get("release_notes", ""),
            "filename": doc.get("filename"),
            "size_bytes": doc.get("size_bytes", 0),
            "sha256": doc.get("sha256"),
            "mandatory": doc.get("mandatory", False),
            "is_active": doc.get("is_active", False),
            "uploaded_by": doc.get("uploaded_by"),
            "created_at": doc.get("created_at"),
            "download_url": f"/api/updates/download/{sid(doc['_id'])}",
        })
    return results


@router.put("/{update_id}/activate")
async def activate_update(update_id: str, _admin: dict = Depends(require_admin)) -> dict:
    """
    Activa una actualización específica y desactiva las demás.
    """
    try:
        oid = ObjectId(update_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    target = await col("app_updates").find_one({"_id": oid})
    if not target:
        raise HTTPException(status_code=404, detail="Actualización no encontrada")

    platform = target.get("platform", "android")
    await col("app_updates").update_many(
        {"platform": platform, "is_active": True},
        {"$set": {"is_active": False}},
    )
    await col("app_updates").update_one(
        {"_id": oid},
        {"$set": {"is_active": True}},
    )

    return {"success": True, "message": f"Versión v{target.get('version')} activada como versión oficial."}


@router.delete("/{update_id}")
async def delete_update(update_id: str, _admin: dict = Depends(require_admin)) -> dict:
    """
    Elimina una actualización y su binario APK de GridFS.
    """
    try:
        oid = ObjectId(update_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")

    doc = await col("app_updates").find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Actualización no encontrada")

    file_id = doc.get("file_id")
    if file_id and isinstance(file_id, ObjectId):
        await delete_apk(file_id)

    await col("app_updates").delete_one({"_id": oid})
    return {"success": True, "message": "Actualización eliminada de la base de datos."}
