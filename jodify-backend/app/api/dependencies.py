from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request

from ..core.database import col
from ..core.security import decode_token


async def get_user_doc(request: Request) -> dict:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada") from exc
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Sesión inválida")
    doc = await col("users").find_one({"username": username})
    if doc is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return doc


CurrentUser = Annotated[dict, Depends(get_user_doc)]


async def require_admin(user: CurrentUser) -> dict:
    if user.get("role") not in ("admin", "dev"):
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return user


async def require_dev(user: CurrentUser) -> dict:
    if user.get("role") != "dev":
        raise HTTPException(status_code=403, detail="Se requieren permisos de desarrollo")
    return user