"""Prepara la base de datos MongoDB de JodiFy: índices + seed.

Uso:
    python setup_database.py
"""

import asyncio
import logging

from app.core.database import connect, create_indexes
from app.services.seeding import seed_audio, seed_users

logging.basicConfig(level=logging.INFO)


async def main() -> None:
    connect()
    await create_indexes()
    await seed_users()
    created = await seed_audio()
    print(f"Listo. Usuarios seed: dev/dev123, admin/admin123, user/user123. Canciones seed: {created}.")


if __name__ == "__main__":
    asyncio.run(main())