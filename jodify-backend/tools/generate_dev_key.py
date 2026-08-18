#!/usr/bin/env python3
"""Genera una clave de desarrollo (dev key) persistida en la base de datos de JodiFy.

El backend valida las claves contra la coleccion `dev_keys` de MongoDB; esta clave
reemplaza a la DEV_KEY estatica del .env. Podes revocarla desde el panel dev
(Panel dev > Acceso > Claves dev) o con --revoke.

Uso (desde la PC del dev):
    cd jodify-backend
    pip install -r requirements.txt                 # pymongo ya alcanza
    python tools/generate_dev_key.py                # crea una clave nueva
    python tools/generate_dev_key.py --label mi-pc  # con etiqueta
    python tools/generate_dev_key.py --list         # lista claves existentes
    python tools/generate_dev_key.py --revoke <id>  # revoca una clave por id

Las credenciales de Mongo se toman del .env del backend (MONGO_URL y MONGO_DB)
o de las variables de entorno MONGO_URL / MONGO_DB.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import secrets
import sys
from datetime import datetime
from pathlib import Path

try:
    from bson import ObjectId
    from pymongo import MongoClient
except ImportError:
    sys.exit("Falta pymongo/bson: ejecuta `pip install -r requirements.txt` primero")

BACKEND_DIR = Path(__file__).resolve().parent.parent


def load_env() -> None:
    env_file = BACKEND_DIR / ".env"
    if not env_file.exists():
        return
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, _, value = raw.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_db():
    load_env()
    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGO_URI")
    mongo_db = os.environ.get("MONGO_DB") or "jodify"
    if not mongo_url:
        sys.exit("No se encontro MONGO_URL en el .env del backend ni en el entorno")
    return MongoClient(mongo_url, serverSelectionTimeoutMS=8000)[mongo_db]


def hash_token(token: str) -> str:
    return hashlib.sha256(token.strip().upper().encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera/administra claves dev de JodiFy")
    parser.add_argument("--label", default="", help="Etiqueta para identificar la clave (p. ej. nombre de la PC)")
    parser.add_argument("--list", action="store_true", help="Listar claves existentes")
    parser.add_argument("--revoke", metavar="ID", help="Revocar una clave por su id (vista en --list)")
    args = parser.parse_args()

    db = get_db()
    keys = db["dev_keys"]

    if args.list:
        print(f"{'ID':<26} {'REVOCADA':<8} {'ETIQUETA':<24} {'CREADA':<28} {'ULTIMO USO'}")
        for doc in keys.find().sort("created_at", -1):
            print(
                f"{str(doc['_id']):<26} "
                f"{'SI' if doc.get('revoked') else 'no':<8} "
                f"{(doc.get('label') or '')[:24]:<24} "
                f"{str(doc.get('created_at')):<28} "
                f"{doc.get('last_used_at') or 'nunca'}"
            )
        return

    if args.revoke:
        result = keys.update_one({"_id": ObjectId(args.revoke)}, {"$set": {"revoked": True}})
        if result.modified_count == 0:
            sys.exit(f"No se encontro ninguna clave con id {args.revoke}")
        print(f"Clave {args.revoke} revocada.")
        return

    plain = f"JDFYDEV-{secrets.token_hex(16).upper()}"
    keys.insert_one(
        {
            "token_hash": hash_token(plain),
            "label": args.label.strip()[:80],
            "created_by": "tools/generate_dev_key.py",
            "created_at": datetime.now().isoformat(),
            "last_used_at": None,
            "revoked": False,
        }
    )
    print("\nClave dev generada y guardada en la base de datos:\n")
    print(f"    {plain}")
    print("\nUsala en el login con Ctrl+Alt+D > Token de desarrollo (o pegala donde la pida).\n")
    print("La clave queda hasheada en la coleccion dev_keys; si la perdes,")
    print("genera otra con este mismo script y revoca la anterior con --list/--revoke.\n")


if __name__ == "__main__":
    main()
