"""
GET /state — the single read endpoint that replaces the old frontend's
adapter.load(). No admin gating: every authenticated user sees the identical
full response (no per-role filtering in this app — decided deliberately).

Pydantic response models live here rather than in app/services/state.py or
app/computed.py to avoid a circular import: this router calls
services.state.fetch_state(), so services/state.py can't import the models
back from here. services/state.py returns plain dicts; FastAPI's
response_model does the validation/serialization at this boundary.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import get_current_user
from app.db import get_pool_a
from app.services.state import fetch_state

router = APIRouter(tags=["state"])


class CalibrationInfoOut(BaseModel):
    status: Literal["ok", "due_soon", "overdue", "unknown"]
    due_date: date | None


class LocationDisplayOut(BaseModel):
    text: str
    in_transit: bool


class EquipmentOut(BaseModel):
    id: UUID
    name: str
    serial: str | None
    category: str
    active: bool
    notes: str | None
    purchase_date: date | None
    age_label: str
    calibration_required: bool
    calibration_interval_months: int | None
    last_calibration_date: date | None
    calibration: CalibrationInfoOut | None
    home_location_id: UUID | None
    home_location_name: str | None
    current_location_id: UUID | None
    current_location_name: str | None
    current_move_id: UUID | None
    status: str | None
    in_transit: bool
    location_display: LocationDisplayOut
    created_at: datetime
    updated_at: datetime


class MoveLogisticsOut(BaseModel):
    carrier: str | None
    tracking_number: str | None
    booked_at: datetime | None
    received_at: datetime | None
    received_by: UUID | None
    condition_result: str | None
    condition_notes: str | None


class MoveOut(BaseModel):
    id: UUID
    equipment_id: UUID
    move_type: str
    from_location_id: UUID | None
    from_location_name: str | None
    to_location_id: UUID
    to_location_name: str
    status_from: str
    status_to: str
    moved_at: datetime
    created_by: UUID
    created_by_name: str | None
    notes: str | None
    created_at: datetime
    logistics: MoveLogisticsOut | None


class StateResponse(BaseModel):
    equipment: list[EquipmentOut]
    moves: list[MoveOut]


@router.get("/state", response_model=StateResponse)
async def get_state(
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    return await fetch_state(pool)
