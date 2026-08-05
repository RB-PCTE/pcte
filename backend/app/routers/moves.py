"""
/moves — open a move, then receipt it. Open to any authenticated user, not
admin-gated: recording where equipment went is everyday operational work, not
administration.

Three fields on a move are server-derived and must never come from the client:

- `status_from`      — read from equipment_state.status under the row lock
- `from_location_id` — read from equipment_state.current_location_id, same lock
- `created_by`       — the authenticated user

They aren't fields on `MoveCreateIn`, so with `extra="forbid"` sending any of
them is a 422. That's the point: silently ignoring a client-supplied
`status_from` would let a caller believe they'd recorded something they hadn't.
`received_by` on the receipt body works the same way.

`status_to` is *not* derived from `move_type`. They're independent choices —
the caller says both what kind of move this is and what state the equipment
should be in when it lands.

Pydantic models live here rather than in app/services/moves.py — same layering
reason as app/routers/state.py.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.auth import get_current_user
from app.db import get_pool_a
from app.services.moves import create_move, receipt_move

router = APIRouter(tags=["moves"])

# The `move_type` enum from migrations/002_move_type_enum.sql. The whitelist
# holds whether or not that migration has been applied — 001 left the column as
# bare text, and this is what stops a typo becoming a permanent value.
MoveType = Literal["office_transfer", "hire_out", "hire_return", "workshop", "move"]

# The `equipment_status` enum from migrations/001_db_simplification.sql.
EquipmentStatus = Literal[
    "available", "on_demo", "on_hire", "in_service_repair", "quarantined"
]

# The `condition_assessment` enum from migrations/003_equipment_condition.sql.
# Shared by equipment_state.condition and move_logistics.condition_result —
# see that migration's header comment for why the two columns use one enum.
Condition = Literal["pass", "needs_attention", "fail"]


class MoveLogisticsRecordOut(BaseModel):
    carrier: str | None
    tracking_number: str | None
    booked_at: datetime | None
    received_at: datetime | None
    received_by: UUID | None
    condition_result: str | None
    condition_notes: str | None


class MoveRecordOut(BaseModel):
    id: UUID
    equipment_id: UUID
    move_type: str
    from_location_id: UUID | None
    to_location_id: UUID
    status_from: str
    status_to: str
    moved_at: datetime
    created_by: UUID
    notes: str | None
    created_at: datetime
    # Never null on these responses: a move_logistics row is created alongside
    # every move. (GET /state types it as nullable because it LEFT JOINs rows
    # that may predate this endpoint.)
    logistics: MoveLogisticsRecordOut


class MoveCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    equipment_id: UUID
    to_location_id: UUID
    move_type: MoveType
    status_to: EquipmentStatus
    notes: str | None = None
    # Omitted means now(). Supplied is used as given — backdating a move that
    # happened before someone got round to recording it is legitimate.
    moved_at: datetime | None = None
    # The shipping half of move_logistics, all optional.
    carrier: str | None = None
    tracking_number: str | None = None
    booked_at: datetime | None = None


class MoveReceiptIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Required by this API. The column also carries a real enum constraint as
    # of migrations/003_equipment_condition.sql; this Literal gives a clean
    # 422 instead of a raw DB error for a bad value.
    condition_result: Condition
    condition_notes: str | None = None


@router.post("/moves", response_model=MoveRecordOut)
async def post_move(
    body: MoveCreateIn,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    """Open a move. Flags the equipment as in-transit but does not change where
    it is — that happens on receipt. 409 if it already has an unreceipted move.
    """
    return await create_move(pool, body.model_dump(), created_by=user["user_id"])


@router.post("/moves/{move_id}/receipt", response_model=MoveRecordOut)
async def post_move_receipt(
    move_id: UUID,
    body: MoveReceiptIn,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    """Confirm arrival. Applies the move's destination and status to the
    equipment and clears its in-transit flag. 409 if this isn't the equipment's
    active move (already received, or superseded).
    """
    return await receipt_move(pool, move_id, body.model_dump(), received_by=user["user_id"])
