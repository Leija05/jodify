"""Importa las cuentas del dump Postgres original (users_access_rows.sql) a la base local.

Reutiliza el mismo esquema de hash del auth actual (PBKDF2-SHA256, 100k iteraciones).
No pisa usuarios que ya existen (dev/admin/user de la seed local).
"""
import argparse
import hashlib
import os
import re
from datetime import datetime, timezone

from pymongo import MongoClient

PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> tuple[str, str]:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return salt.hex(), digest.hex()


def parse_dump(path: str) -> list[dict]:
    data = open(path, encoding="utf-8", errors="replace").read()
    vals = data.split("VALUES ", 1)[1].rstrip().rstrip(";").strip()
    users: list[dict] = []
    for row in re.findall(r"\(([^()]*)\)", vals):
        parts = re.findall(r"'((?:[^'\\]|\\.)*)'|null", row)
        fields = ["" if p == "" else p for p in parts]
        if len(fields) < 7:
            continue
        users.append(
            {
                "username": fields[1].strip(),
                "password": fields[2],
                "role": fields[3].strip(),
                "is_online": 1 if fields[4].strip() == "1" else 0,
                "last_seen": fields[5] or None,
                "discord_id": fields[6] or None,
            }
        )
    return [u for u in users if u["username"]]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("path", nargs="?", default=r"C:\Users\leija\Downloads\users_access_rows.sql", help="Ruta al users_access_rows.sql")
    parser.add_argument("--mongo-uri", default="mongodb://localhost:27017")
    parser.add_argument("--db", default="jodify")
    args = parser.parse_args()

    client = MongoClient(args.mongo_uri)
    users_coll = client[args.db]["users_access"]
    existing = {doc["username"] for doc in users_coll.find({}, {"username": 1})}

    creados = 0
    saltados = 0
    for u in parse_dump(args.path):
        if u["username"] in existing:
            print(f"  = ya existe: {u['username']} (saltado)")
            saltados += 1
            continue
        salt, pwd_hash = hash_password(u["password"])
        now = datetime.now(timezone.utc).isoformat()
        users_coll.insert_one(
            {
                "username": u["username"],
                "salt": salt,
                "password_hash": pwd_hash,
                "role": u["role"],
                "is_online": u["is_online"],
                "last_seen": u["last_seen"],
                "discord_id": u["discord_id"],
                "current_song_id": None,
                "current_song_name": None,
                "listening_since": None,
                "created_at": now,
            }
        )
        creados += 1
        print(f"  + creado: {u['username']} (role={u['role']})")

    print(f"\nListo: {creados} creados, {saltados} ya existentes.")


if __name__ == "__main__":
    main()
