"""
/equipment writes — admin-only. Reads go through GET /state.

PATCH accepts structural fields only. `current_location_id` and `status` are
deliberately absent from `EquipmentPatchIn`, so with `extra="forbid"` an
attempt to set either is a 422 rather than a silently ignored value. Those two
belong to `equipment_state` and change only through POST /moves (which sets
`current_move_id`) and POST /moves/{id}/receipt (which sets the location and
status). Letting an admin poke them directly would desynchronise the move
history from where the equipment actually is.

Responses use `EquipmentRecordOut` — the row as stored, plus its
`equipment_state` fields. Distinct from `EquipmentOut` in app/routers/state.py
both in name (so the two don't collide in the OpenAPI schema) and in content:
no `age_label` / `calibration` / `location_display`, because those are the read
path's computed view model. Clients refetch GET /state for the rendered view.

Pydantic models live here rather than in app/services/equipment.py — same
layering reason as app/routers/state.py.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.auth import require_admin
from app.db import get_pool_a
from app.services.equipment import create_equipment, update_equipment

router = APIRouter(tags=["equipment"])

# The `equipment_category` enum from migrations/001_db_simplification.sql.
# The casing is inconsistent in the database itself (three uppercase, two
# lowercase) — these are the exact stored values, not a style choice.
EquipmentCategory = Literal["INDT", "CNDT", "geotech", "GPR", "lab"]


class EquipmentRecordOut(BaseModel):
    id: UUID
    name: str
    serial: str | None
    category: str
    active: bool
    notes: str | None
    purchase_date: date | None
    home_location_id: UUID | None
    calibration_required: bool | None
    calibration_interval_months: int | None
    last_calibration_date: date | None
    status: str | None
    current_location_id: UUID | None
    current_move_id: UUID | None
    created_at: datetime
    updated_at: datetime


class EquipmentCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    category: EquipmentCategory
    serial: str | None = None
    home_location_id: UUID | None = None
    active: bool = True
    notes: str | None = None
    purchase_date: date | None = None
    # Always written as a real bool. The column is nullable in the schema, but
    # GET /state types it as a non-optional bool — a null there breaks the
    # whole response, so new rows never introduce one.
    calibration_required: bool = False
    calibration_interval_months: int | None = None
    last_calibration_date: date | None = None


class EquipmentPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Every field optional — `exclude_unset` distinguishes "set this to null"
    # from "leave it alone". No current_location_id, no status: see the module
    # docstring.
    name: str | None = None
    category: EquipmentCategory | None = None
    serial: str | None = None
    home_location_id: UUID | None = None
    active: bool | None = None
    notes: str | None = None
    calibration_required: bool | None = None
    calibration_interval_months: int | None = None
    last_calibration_date: date | None = None


@router.post("/equipment", response_model=EquipmentRecordOut)
async def post_equipment(
    body: EquipmentCreateIn,
    user: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    """Create equipment and its equipment_state row in one transaction.

    The state row starts at `status = 'available'`, `current_move_id = NULL`,
    and `current_location_id = home_location_id`.
    """
    return await create_equipment(pool, body.model_dump())


@router.patch("/equipment/{equipment_id}", response_model=EquipmentRecordOut)
async def patch_equipment(
    equipment_id: UUID,
    body: EquipmentPatchIn,
    user: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    return await update_equipment(pool, equipment_id, body.model_dump(exclude_unset=True))
