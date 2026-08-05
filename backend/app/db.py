import asyncpg

from app.config import settings

# Populated on startup, closed on shutdown — see main.py lifespan.
pool_a: asyncpg.Pool | None = None
pool_b: asyncpg.Pool | None = None  # scaffolded for later (Subscription Tracker), unused in Phase A


async def connect_pools() -> None:
    global pool_a, pool_b
    pool_a = await asyncpg.create_pool(settings.DB_A_URL, min_size=1, max_size=10)

    if settings.DB_B_URL:
        pool_b = await asyncpg.create_pool(settings.DB_B_URL, min_size=1, max_size=5)


async def close_pools() -> None:
    if pool_a is not None:
        await pool_a.close()
    if pool_b is not None:
        await pool_b.close()


def get_pool_a() -> asyncpg.Pool:
    """FastAPI dependency — raises if called before startup has run."""
    if pool_a is None:
        raise RuntimeError("DB A pool not initialized — connect_pools() must run on startup")
    return pool_a
