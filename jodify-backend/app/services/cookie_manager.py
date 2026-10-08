import asyncio
import base64
import http.cookiejar
import io
import json
import logging
import os
import re
import tempfile
import time
from typing import Any

logger = logging.getLogger("jodify.cookie_manager")

_cached_cookie_path: str | None = None
_cached_cookie_hash: str | None = None
_last_check_time: float = 0.0
_last_diagnostics: dict[str, Any] = {}


def sanitize_netscape_cookies(raw_text: str) -> str | None:
    """
    Convierte cualquier formato de texto de cookies:
    - Archivos Netscape estándar (.txt)
    - Formato JSON directo (exportado desde Cookie-Editor o EditThisCookie)
    - Formato cabecera HTTP (Cookie: name=val; name2=val2)
    - Strings de variables de entorno con caracteres escapados (\\n, \\r, \\t)
    - Formatos con espacios en lugar de tabulaciones
    en un archivo Netscape 100% válido y compatible con MozillaCookieJar y yt-dlp.
    """
    if not raw_text:
        return None

    raw_text = raw_text.strip()
    if not raw_text:
        return None

    # 1. Eliminar comillas envolventes comunes de variables de entorno de Render/Docker/.env
    if (raw_text.startswith('"') and raw_text.endswith('"')) or (raw_text.startswith("'") and raw_text.endswith("'")):
        raw_text = raw_text[1:-1].strip()

    # 2. Desescapar saltos de línea y tabulaciones literales de variables de entorno
    raw_text = (
        raw_text.replace("\\r\\n", "\n")
        .replace("\\r", "\n")
        .replace("\\n", "\n")
        .replace("\\t", "\t")
    )

    # 3. Soporte para Base64 si viene codificado
    if not raw_text.startswith("#") and "\n" not in raw_text and len(raw_text) > 40:
        try:
            decoded = base64.b64decode(raw_text).decode("utf-8", errors="ignore")
            if "# Netscape" in decoded or ".youtube.com" in decoded or ".google.com" in decoded:
                raw_text = decoded
        except Exception:
            pass

    valid_cookie_lines: list[str] = []
    now_ts = int(time.time())
    default_expiry = str(now_ts + 31536000)  # +1 año por defecto

    # 4. Comprobar si viene en formato JSON (muy común en exportaciones de Cookie-Editor)
    stripped_first = raw_text.lstrip()
    if stripped_first.startswith("[") or stripped_first.startswith("{"):
        try:
            parsed_json = json.loads(raw_text)
            items = parsed_json if isinstance(parsed_json, list) else [parsed_json]
            for item in items:
                if not isinstance(item, dict):
                    continue
                domain = str(item.get("domain") or ".youtube.com").strip()
                if not domain.startswith(".") and not domain.startswith("http"):
                    domain = f".{domain}"
                domain = domain.replace("https://", "").replace("http://", "").split("/")[0]

                subdomains = "TRUE" if domain.startswith(".") else "FALSE"
                path = str(item.get("path") or "/").strip()
                secure = "TRUE" if item.get("secure", True) else "FALSE"

                exp_val = item.get("expirationDate") or item.get("expires")
                if exp_val is not None:
                    try:
                        exp_int = int(float(exp_val))
                        # Si está expirada, extenderla para que yt-dlp pueda usar la sesión
                        expires = str(exp_int if exp_int > now_ts else now_ts + 31536000)
                    except Exception:
                        expires = default_expiry
                else:
                    expires = default_expiry

                name = str(item.get("name") or "").strip()
                value = str(item.get("value") or "").strip()
                prefix = "#HttpOnly_" if item.get("httpOnly") else ""

                if name:
                    valid_cookie_lines.append(
                        f"{prefix}{domain}\t{subdomains}\t{path}\t{secure}\t{expires}\t{name}\t{value}"
                    )
        except Exception:
            pass

    # 5. Comprobar si viene en formato Cookie Header: "name1=value1; name2=value2"
    if not valid_cookie_lines and ";" in raw_text and "\t" not in raw_text and not raw_text.startswith("#"):
        pairs = [p.strip() for p in raw_text.split(";") if p.strip()]
        if len(pairs) >= 2:
            for pair in pairs:
                if "=" in pair:
                    p_name, p_val = pair.split("=", 1)
                    p_name = p_name.strip()
                    p_val = p_val.strip()
                    if p_name.lower().startswith("cookie:"):
                        p_name = p_name[7:].strip()
                    if p_name:
                        valid_cookie_lines.append(
                            f".youtube.com\tTRUE\t/\tTRUE\t{default_expiry}\t{p_name}\t{p_val}"
                        )

    # 6. Formato Netscape línea por línea (con tabs o con espacios)
    if not valid_cookie_lines:
        lines = raw_text.split("\n")
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            # Ignorar encabezados o comentarios que no sean #HttpOnly_
            if stripped.startswith("# Netscape") or stripped.startswith("# HTTP Cookie File"):
                continue
            if stripped.startswith("#") and not stripped.startswith("#HttpOnly_"):
                continue

            prefix = ""
            cookie_data = stripped
            if cookie_data.startswith("#HttpOnly_"):
                prefix = "#HttpOnly_"
                cookie_data = cookie_data[len("#HttpOnly_"):].strip()

            if "\t" in cookie_data:
                parts = [p.strip() for p in cookie_data.split("\t")]
            else:
                parts = [p.strip() for p in re.split(r"\s+", cookie_data)]

            # Formato Netscape requiere 7 campos:
            # domain, subdomains, path, secure, expires, name, value
            if len(parts) >= 7:
                domain = parts[0]
                subdomains = (
                    parts[1].upper()
                    if parts[1].upper() in ("TRUE", "FALSE")
                    else ("TRUE" if domain.startswith(".") else "FALSE")
                )
                path = parts[2]
                secure = (
                    parts[3].upper()
                    if parts[3].upper() in ("TRUE", "FALSE")
                    else "TRUE"
                )
                try:
                    exp_num = int(float(parts[4]))
                    expires = str(exp_num if exp_num > now_ts else now_ts + 31536000)
                except Exception:
                    expires = default_expiry
                name = parts[5]
                value = parts[6] if len(parts) == 7 else " ".join(parts[6:])
                valid_cookie_lines.append(
                    f"{prefix}{domain}\t{subdomains}\t{path}\t{secure}\t{expires}\t{name}\t{value}"
                )

    if not valid_cookie_lines:
        return None

    cleaned = (
        "# Netscape HTTP Cookie File\n# This file is generated by JodiFy Universal Cookie Manager\n\n"
        + "\n".join(valid_cookie_lines)
        + "\n"
    )

    # 7. Validar estrictamente con MozillaCookieJar
    try:
        jar = http.cookiejar.MozillaCookieJar()
        jar._really_load(io.StringIO(cleaned), "cookies_validation.txt", ignore_discard=True, ignore_expires=True)
        return cleaned
    except Exception as exc:
        logger.warning(f"[CookieManager] Las cookies no pasaron la validación de MozillaCookieJar: {exc}")
        return None


def get_valid_cookies_file() -> str | None:
    """
    Busca, valida y prepara de forma segura la ruta de cookies para yt-dlp.
    Garantiza que yt-dlp NUNCA reciba un archivo corrupto que provoque:
    'does not look like a Netscape format cookies file'.
    """
    global _cached_cookie_path, _cached_cookie_hash, _last_check_time

    now = time.time()
    # Reutilizar resultado cacheado por 60 segundos si el archivo físico sigue existiendo
    if _cached_cookie_path and (now - _last_check_time < 60.0):
        if os.path.exists(_cached_cookie_path):
            return _cached_cookie_path

    _last_check_time = now

    candidate_files = [
        os.environ.get("YOUTUBE_COOKIES_PATH"),
        os.environ.get("COOKIES_FILE"),
        "/etc/secrets/cookies.txt",
        "/etc/secrets/youtube_cookies.txt",
        os.path.join(os.getcwd(), "cookies.txt"),
        os.path.join(tempfile.gettempdir(), "jodify_yt_cookies.txt"),
    ]

    # 1. Comprobar archivos físicos
    for filepath in candidate_files:
        if filepath and os.path.exists(filepath):
            try:
                jar = http.cookiejar.MozillaCookieJar(filepath)
                jar.load(ignore_discard=True, ignore_expires=True)
                _cached_cookie_path = filepath
                return filepath
            except Exception:
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        file_content = f.read()
                    sanitized = sanitize_netscape_cookies(file_content)
                    if sanitized:
                        tmp_path = os.path.join(tempfile.gettempdir(), "jodify_yt_cookies.txt")
                        with open(tmp_path, "w", encoding="utf-8") as out:
                            out.write(sanitized)
                        _cached_cookie_path = tmp_path
                        return tmp_path
                except Exception as e:
                    logger.warning(f"[CookieManager] Error leyendo archivo de cookies {filepath}: {e}")

    # 2. Comprobar texto en variables de entorno (Render, Railway, Docker, .env)
    cookie_text = os.environ.get("YOUTUBE_COOKIES_TEXT") or os.environ.get("YOUTUBE_COOKIES")
    if cookie_text:
        text_hash = str(hash(cookie_text))
        if _cached_cookie_path and _cached_cookie_hash == text_hash and os.path.exists(_cached_cookie_path):
            return _cached_cookie_path

        sanitized = sanitize_netscape_cookies(cookie_text)
        if sanitized:
            try:
                tmp_path = os.path.join(tempfile.gettempdir(), "jodify_yt_cookies.txt")
                with open(tmp_path, "w", encoding="utf-8") as out:
                    out.write(sanitized)
                # También guardar en cookies.txt local para persistencia
                try:
                    with open(os.path.join(os.getcwd(), "cookies.txt"), "w", encoding="utf-8") as out2:
                        out2.write(sanitized)
                except Exception:
                    pass
                _cached_cookie_path = tmp_path
                _cached_cookie_hash = text_hash
                logger.info("[CookieManager] Cookies de YouTube generadas y validadas con éxito desde variables de entorno.")
                return tmp_path
            except Exception as e:
                logger.warning(f"[CookieManager] Error guardando cookies sanitizadas temporales: {e}")
        else:
            logger.warning("[CookieManager] YOUTUBE_COOKIES_TEXT presente pero no se pudieron extraer cookies válidas.")

    # 3. Intentar cargar desde la base de datos (MongoDB system_state) de forma sincrónica / en caché
    db_cookie_file = os.path.join(tempfile.gettempdir(), "jodify_db_cookies.txt")
    if os.path.exists(db_cookie_file):
        try:
            jar = http.cookiejar.MozillaCookieJar(db_cookie_file)
            jar.load(ignore_discard=True, ignore_expires=True)
            _cached_cookie_path = db_cookie_file
            return db_cookie_file
        except Exception:
            pass

    _cached_cookie_path = None
    return None


async def save_cookies_persistently(raw_content: str) -> dict[str, Any]:
    """
    Sanitiza y guarda cookies en MongoDB (system_state) y en el sistema de archivos local.
    Permite que las cookies persistan incluso tras reinicios y redeploys del backend.
    """
    global _cached_cookie_path, _cached_cookie_hash, _last_check_time

    sanitized = sanitize_netscape_cookies(raw_content)
    if not sanitized:
        return {
            "success": False,
            "error": "El contenido no pudo ser validado como cookies válidas (JSON, Netscape o cabecera). Comprueba que incluya cookies de YouTube como LOGIN_INFO o VISITOR_INFO1_LIVE.",
        }

    # Contar cookies válidas
    jar = http.cookiejar.MozillaCookieJar()
    jar._really_load(io.StringIO(sanitized), "cookies.txt", ignore_discard=True, ignore_expires=True)
    cookie_list = list(jar)
    domains = list({c.domain for c in cookie_list})
    names = [c.name for c in cookie_list]

    # Guardar en archivo local
    tmp_path = os.path.join(tempfile.gettempdir(), "jodify_yt_cookies.txt")
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(sanitized)

    db_cookie_file = os.path.join(tempfile.gettempdir(), "jodify_db_cookies.txt")
    with open(db_cookie_file, "w", encoding="utf-8") as f:
        f.write(sanitized)

    try:
        with open(os.path.join(os.getcwd(), "cookies.txt"), "w", encoding="utf-8") as f:
            f.write(sanitized)
    except Exception:
        pass

    _cached_cookie_path = tmp_path
    _cached_cookie_hash = str(hash(sanitized))
    _last_check_time = time.time()

    # Guardar en MongoDB system_state si está conectado
    try:
        from ..core.database import col
        await col("system_state").update_one(
            {"key": "youtube_cookies"},
            {
                "$set": {
                    "key": "youtube_cookies",
                    "content": sanitized,
                    "count": len(cookie_list),
                    "domains": domains,
                    "updated_at": time.time(),
                }
            },
            upsert=True,
        )
    except Exception as exc:
        logger.warning(f"[CookieManager] No se pudo guardar cookies en MongoDB: {exc}")

    return {
        "success": True,
        "count": len(cookie_list),
        "domains": domains,
        "names": names[:15],
        "message": f"¡Éxito! Se guardaron y validaron {len(cookie_list)} cookies activas para {len(domains)} dominios.",
    }


async def restore_cookies_from_db_if_needed() -> bool:
    """Restaura las cookies guardadas en MongoDB si no hay un archivo físico activo."""
    global _cached_cookie_path, _cached_cookie_hash

    if _cached_cookie_path and os.path.exists(_cached_cookie_path):
        return True

    try:
        from ..core.database import col
        doc = await col("system_state").find_one({"key": "youtube_cookies"})
        if doc and doc.get("content"):
            sanitized = sanitize_netscape_cookies(doc["content"])
            if sanitized:
                db_cookie_file = os.path.join(tempfile.gettempdir(), "jodify_db_cookies.txt")
                with open(db_cookie_file, "w", encoding="utf-8") as f:
                    f.write(sanitized)
                _cached_cookie_path = db_cookie_file
                _cached_cookie_hash = str(hash(sanitized))
                logger.info("[CookieManager] Cookies de YouTube restauradas exitosamente desde MongoDB.")
                return True
    except Exception as exc:
        logger.warning(f"[CookieManager] Error restaurando cookies desde DB: {exc}")

    return False


def get_cookie_diagnostics() -> dict[str, Any]:
    """Devuelve un informe detallado del estado de las cookies para diagnósticos."""
    cookie_file = get_valid_cookies_file()
    if not cookie_file or not os.path.exists(cookie_file):
        return {
            "has_cookies": False,
            "file_path": None,
            "cookie_count": 0,
            "domains": [],
            "status": "Sin cookies configuradas (se usarán clientes sin cookies como visionos/android)",
        }

    try:
        jar = http.cookiejar.MozillaCookieJar(cookie_file)
        jar.load(ignore_discard=True, ignore_expires=True)
        cookies = list(jar)
        domains = sorted(list({c.domain for c in cookies}))
        has_login = any(c.name in ("LOGIN_INFO", "VISITOR_INFO1_LIVE", "SID", "SSID") for c in cookies)

        return {
            "has_cookies": True,
            "file_path": cookie_file,
            "cookie_count": len(cookies),
            "domains": domains,
            "has_youtube_auth": has_login,
            "sample_names": [c.name for c in cookies[:10]],
            "status": "Cookies válidas y operativas",
        }
    except Exception as exc:
        return {
            "has_cookies": False,
            "file_path": cookie_file,
            "cookie_count": 0,
            "domains": [],
            "error": str(exc),
            "status": "Archivo de cookies presente pero no se pudo cargar",
        }
