"""
/locations — reference data for every other endpoint (equipment home bases,
move origins and destinations).

Reads are open to any authenticated user; writes are admin-only. DELETE is a
soft delete (`active = false`) and returns the updated row rather than 204, so
the caller can see the flag flipped without a follow-up read.

Request models set `extra="forbid"`. That's a deliberate departure from the
step-5 models (which have no model_config at all) and it's applied across all
the step-6 request models for consistency: a misspelled field should be a 422,
not a silently dropped value.

Pydantic models live here rather than in app/services/locations.py for the same
reason they do in app/routers/state.py — the service returns plain dicts and
this is the only layer that knows about HTTP.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.auth import get_current_user, require_admin
from app.db import get_pool_a
from app.services.locations import (
    create_location,
    deactivate_location,
    list_locations,
    update_location,
)

router = APIRouter(tags=["locations"])

# The `location_category` enum from migrations/001_db_simplification.sql. Note
# the column is `category`, not `type` — SCHEMA.md is stale on this.
LocationCategory = Literal["customer", "warehouse", "office"]


class LocationOut(BaseModel):
    id: UUID
    name: str
    category: str
    active: bool
    created_at: datetime


class LocationCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    category: LocationCategory
    active: bool = True


class LocationUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # PUT is a full replace, so nothing here is optional.
    name: str
    category: LocationCategory
    active: bool


@router.get("/locations", response_model=list[LocationOut])
async def get_locations(
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> list[dict]:
    return await list_locations(pool)


@router.post("/locations", response_model=LocationOut)
async def post_location(
    body: LocationCreateIn,
    user: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    return await create_location(
        pool, name=body.name, category=body.category, active=body.active
    )


@router.put("/locations/{location_id}", response_model=LocationOut)
async def put_location(
    location_id: UUID,
    body: LocationUpdateIn,
    user: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    return await update_location(
        pool, location_id, name=body.name, category=body.category, active=body.active
    )


@router.delete("/locations/{location_id}", response_model=LocationOut)
async def delete_location(
    location_id: UUID,
    user: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    """Soft delete only — sets `active = false`. The row and every move that
    references it stay intact.
    """
    return await deactivate_location(pool, location_id)
