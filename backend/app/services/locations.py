"""
Location queries and mutations for the /locations endpoints.

Returns plain dicts (no Pydantic here — see the layering note in
app/routers/state.py) that the router validates against its response models.

Unlike services/state.py this module raises HTTPException directly. The
alternative — domain exceptions translated in the router — buys nothing here:
the checks are simple row-existence tests, and app/auth.py already raises
HTTPException outside a router, so this isn't a new pattern in the codebase.

DELETE is a soft delete: `active = false`, never `DELETE FROM`. Locations are
referenced by equipment.home_location_id, equipment_state.current_location_id
and both ends of every move, so a hard delete would either fail on the foreign
keys or destroy history.
"""

from __future__ import annotations

import asyncpg
from fastapi import HTTPException, status

_LIST_QUERY = """
    SELECT id, name, category, active, created_at
    FROM public.locations
    ORDER BY name
"""

_INSERT_QUERY = """
    INSERT INTO public.locations (name, category, active)
    VALUES ($1, $2, $3)
    RETURNING id, name, category, active, created_at
"""

_UPDATE_QUERY = """
    UPDATE public.locations
    SET name = $2, category = $3, active = $4
    WHERE id = $1
    RETURNING id, name, category, active, created_at
"""

_SOFT_DELETE_QUERY = """
    UPDATE public.locations
    SET active = false
    WHERE id = $1
    RETURNING id, name, category, active, created_at
"""


def _build_location(row: asyncpg.Record) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "active": row["active"],
        "created_at": row["created_at"],
    }


async def list_locations(pool: asyncpg.Pool) -> list[dict]:
    """Every location, active and inactive alike.

    Inactive ones are included deliberately: the frontend needs them to render
    the historical location names on old moves, and it has the `active` flag to
    filter its own pickers with.
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(_LIST_QUERY)

    return [_build_location(row) for row in rows]


async def create_location(pool: asyncpg.Pool, *, name: str, category: str, active: bool) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(_INSERT_QUERY, name, category, active)

    return _build_location(row)


async def update_location(
    pool: asyncpg.Pool, location_id, *, name: str, category: str, active: bool
) -> dict:
    """Full replace (PUT) — every field is overwritten, none are optional."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(_UPDATE_QUERY, location_id, name, category, active)

    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Location {location_id} not found")

    return _build_location(row)


async def deactivate_location(pool: asyncpg.Pool, location_id) -> dict:
    """Soft delete. Idempotent — deactivating an already-inactive location is a
    no-op that still returns 200 with the row.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(_SOFT_DELETE_QUERY, location_id)

    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Location {location_id} not found")

    return _build_location(row)
