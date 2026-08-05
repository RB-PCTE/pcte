"""
Business logic for GET /state — the single read endpoint that replaces the
old frontend's adapter.load(). Queries DB A (equipment + moves, joined and
resolved to display-ready names) and attaches computed fields from
app/computed.py.

Returns plain dicts (no Pydantic here — see the layering note in
app/routers/state.py) that the router validates against its response models.

Does not query `corrections` — out of scope for this endpoint.
"""

from __future__ import annotations

import asyncpg

from app.computed import get_age_label, get_calibration_info, get_equipment_location_display

_EQUIPMENT_QUERY = """
    SELECT
        e.id, e.name, e.serial, e.category, e.active, e.notes,
        e.purchase_date, e.calibration_required, e.calibration_interval_months,
        e.last_calibration_date, e.created_at, e.updated_at,
        e.home_location_id, hl.name AS home_location_name,
        es.status, es.current_location_id, cl.name AS current_location_name,
        es.current_move_id
    FROM public.equipment e
    LEFT JOIN public.equipment_state es ON es.equipment_id = e.id
    LEFT JOIN public.locations hl ON hl.id = e.home_location_id
    LEFT JOIN public.locations cl ON cl.id = es.current_location_id
    ORDER BY e.name
"""

_MOVES_QUERY = """
    SELECT
        m.id, m.equipment_id, m.move_type, m.status_from, m.status_to,
        m.moved_at, m.created_by, p.display_name AS created_by_name,
        m.notes, m.created_at,
        m.from_location_id, fl.name AS from_location_name,
        m.to_location_id, tl.name AS to_location_name,
        ml.move_id AS logistics_move_id, ml.carrier, ml.tracking_number,
        ml.booked_at, ml.received_at, ml.received_by,
        ml.condition_result, ml.condition_notes
    FROM public.moves m
    LEFT JOIN public.move_logistics ml ON ml.move_id = m.id
    LEFT JOIN public.locations fl ON fl.id = m.from_location_id
    LEFT JOIN public.locations tl ON tl.id = m.to_location_id
    LEFT JOIN public.profiles p ON p.user_id = m.created_by
    ORDER BY m.moved_at DESC
"""


def _build_equipment(row: asyncpg.Record) -> dict:
    in_transit = row["current_move_id"] is not None

    return {
        "id": row["id"],
        "name": row["name"],
        "serial": row["serial"],
        "category": row["category"],
        "active": row["active"],
        "notes": row["notes"],
        "purchase_date": row["purchase_date"],
        "age_label": get_age_label(row["purchase_date"]),
        "calibration_required": row["calibration_required"],
        "calibration_interval_months": row["calibration_interval_months"],
        "last_calibration_date": row["last_calibration_date"],
        "calibration": get_calibration_info(
            row["calibration_required"],
            row["last_calibration_date"],
            row["calibration_interval_months"],
        ),
        "home_location_id": row["home_location_id"],
        "home_location_name": row["home_location_name"],
        "current_location_id": row["current_location_id"],
        "current_location_name": row["current_location_name"],
        "current_move_id": row["current_move_id"],
        "status": row["status"],
        "in_transit": in_transit,
        "location_display": get_equipment_location_display(
            row["current_location_name"], in_transit
        ),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _build_move(row: asyncpg.Record) -> dict:
    has_logistics = row["logistics_move_id"] is not None
    logistics = (
        {
            "carrier": row["carrier"],
            "tracking_number": row["tracking_number"],
            "booked_at": row["booked_at"],
            "received_at": row["received_at"],
            "received_by": row["received_by"],
            "condition_result": row["condition_result"],
            "condition_notes": row["condition_notes"],
        }
        if has_logistics
        else None
    )

    return {
        "id": row["id"],
        "equipment_id": row["equipment_id"],
        "move_type": row["move_type"],
        "from_location_id": row["from_location_id"],
        "from_location_name": row["from_location_name"],
        "to_location_id": row["to_location_id"],
        "to_location_name": row["to_location_name"],
        "status_from": row["status_from"],
        "status_to": row["status_to"],
        "moved_at": row["moved_at"],
        "created_by": row["created_by"],
        "created_by_name": row["created_by_name"],
        "notes": row["notes"],
        "created_at": row["created_at"],
        "logistics": logistics,
    }


async def fetch_state(pool: asyncpg.Pool) -> dict:
    """Run the equipment + moves queries and return the full /state payload
    as plain dicts, ready for the router's response_model to validate.
    """
    async with pool.acquire() as conn:
        equipment_rows = await conn.fetch(_EQUIPMENT_QUERY)
        move_rows = await conn.fetch(_MOVES_QUERY)

    return {
        "equipment": [_build_equipment(row) for row in equipment_rows],
        "moves": [_build_move(row) for row in move_rows],
    }
