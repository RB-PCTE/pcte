"""
Equipment writes — POST /equipment and PATCH /equipment/{id}.

Returns plain dicts (no Pydantic here — see the layering note in
app/routers/state.py). Raises HTTPException directly for the same reason
services/locations.py does.

Two things this module owns that aren't obvious from the SQL:

1. **Creating equipment also creates its `equipment_state` row**, in the same
   transaction, with `current_location_id = equipment.home_location_id`. New
   equipment starts at its home base until someone actually moves it. Nothing
   else in the system creates that row, and `GET /state` LEFT JOINs it — so
   without this, new equipment would render with a blank location and no
   status. (This is the original blank-location bug, fixed at the source.)

2. **`updated_at` is set explicitly on every PATCH.** There is no trigger on
   `public.equipment`; nothing bumps it automatically.

PATCH is structural-fields-only by construction: `current_location_id` and
`status` are not accepted here at all. Those live in `equipment_state` and
change only via POST /moves and POST /moves/{id}/receipt. The router's
`extra="forbid"` turns an attempt to set them into a 422.
"""

from __future__ import annotations

import asyncpg
from fastapi import HTTPException, status

_INSERT_EQUIPMENT_QUERY = """
    INSERT INTO public.equipment (
        name, category, serial, home_location_id, active, notes,
        purchase_date, calibration_required, calibration_interval_months,
        last_calibration_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
"""

_INSERT_STATE_QUERY = """
    INSERT INTO public.equipment_state (equipment_id, current_location_id, status)
    VALUES ($1, $2, 'available')
    RETURNING current_location_id, current_move_id, status, condition
"""

_SELECT_QUERY = """
    SELECT
        e.*,
        es.status, es.current_location_id, es.current_move_id, es.condition
    FROM public.equipment e
    LEFT JOIN public.equipment_state es ON es.equipment_id = e.id
    WHERE e.id = $1
"""

# Columns PATCH may write. The request model's field names are validated
# against this set before any of them reach the SET clause, so the dynamic SQL
# built in update_equipment() can never carry client-controlled identifiers.
_PATCHABLE_COLUMNS = frozenset(
    {
        "name",
        "category",
        "serial",
        "home_location_id",
        "active",
        "notes",
        "calibration_required",
        "calibration_interval_months",
        "last_calibration_date",
    }
)


def _build_equipment(row: asyncpg.Record | dict) -> dict:
    """Raw equipment row plus its equipment_state fields.

    Accepts a dict as well as a Record because create_equipment() merges the
    two INSERT ... RETURNING results before building the response.

    Deliberately no computed fields (age_label / calibration / location_display)
    — those belong to the GET /state view model. Write responses are the record
    as stored; the frontend refetches /state for the rendered view.
    """
    return {
        "id": row["id"],
        "name": row["name"],
        "serial": row["serial"],
        "category": row["category"],
        "active": row["active"],
        "notes": row["notes"],
        "purchase_date": row["purchase_date"],
        "home_location_id": row["home_location_id"],
        "calibration_required": row["calibration_required"],
        "calibration_interval_months": row["calibration_interval_months"],
        "last_calibration_date": row["last_calibration_date"],
        "status": row["status"],
        "current_location_id": row["current_location_id"],
        "current_move_id": row["current_move_id"],
        "condition": row["condition"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


async def create_equipment(pool: asyncpg.Pool, fields: dict) -> dict:
    """Insert equipment + its equipment_state row in one transaction.

    `fields` comes from the router's validated request model, so every key is
    already type- and enum-checked.
    """
    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                equipment = await conn.fetchrow(
                    _INSERT_EQUIPMENT_QUERY,
                    fields["name"],
                    fields["category"],
                    fields["serial"],
                    fields["home_location_id"],
                    fields["active"],
                    fields["notes"],
                    fields["purchase_date"],
                    fields["calibration_required"],
                    fields["calibration_interval_months"],
                    fields["last_calibration_date"],
                )
            except asyncpg.ForeignKeyViolationError:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_CONTENT,
                    f"home_location_id {fields['home_location_id']} does not exist",
                )

            # current_location_id mirrors home_location_id — equipment starts
            # at its home base. If home_location_id is null (the column is
            # nullable) the equipment starts with no known location, which is
            # the honest representation of "we weren't told where it lives".
            state = await conn.fetchrow(
                _INSERT_STATE_QUERY, equipment["id"], equipment["home_location_id"]
            )

    return _build_equipment({**dict(equipment), **dict(state)})


async def update_equipment(pool: asyncpg.Pool, equipment_id, changes: dict) -> dict:
    """Apply a partial update to the structural equipment fields.

    `changes` is the router's `model_dump(exclude_unset=True)`, so a key
    present with value None means "explicitly set this to null" while an absent
    key means "leave alone".
    """
    unknown = set(changes) - _PATCHABLE_COLUMNS
    if unknown:
        # Unreachable via HTTP — the request model's fields are a subset of
        # _PATCHABLE_COLUMNS and extra="forbid" rejects anything else. This is
        # the guard that keeps the dynamic SQL below safe if the two ever drift.
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Fields not updatable via PATCH: {', '.join(sorted(unknown))}",
        )

    if not changes:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "No fields to update — request body contained no updatable fields",
        )

    # $1 is the id; the SET params start at $2. Column names come from the
    # whitelist above, never from raw request keys.
    columns = sorted(changes)
    assignments = ", ".join(f"{column} = ${index}" for index, column in enumerate(columns, start=2))
    query = f"""
        UPDATE public.equipment
        SET {assignments}, updated_at = now()
        WHERE id = $1
        RETURNING id
    """
    values = [changes[column] for column in columns]

    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                updated = await conn.fetchrow(query, equipment_id, *values)
            except asyncpg.ForeignKeyViolationError:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_CONTENT,
                    f"home_location_id {changes.get('home_location_id')} does not exist",
                )

            if updated is None:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, f"Equipment {equipment_id} not found"
                )

            # Re-read through the join so the response carries the
            # equipment_state fields alongside the updated equipment row.
            row = await conn.fetchrow(_SELECT_QUERY, equipment_id)

    return _build_equipment(row)
