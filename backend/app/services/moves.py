"""
Move creation and receipt — the only two operations that change where a piece
of equipment is or what state it's in.

Returns plain dicts (no Pydantic here — see the layering note in
app/routers/state.py). Raises HTTPException directly: the 409 checks below
happen *inside* the transaction, under a row lock, so they can't be hoisted
into the router without either leaking the connection upward or releasing the
lock before the decision is acted on.

## The invariant

`equipment_state.current_move_id` is the single flag meaning "this equipment is
mid-move". GET /state derives `in_transit` from it and nothing else. So:

- POST /moves sets it and must refuse if it's already set.
- POST /moves/{id}/receipt clears it and must refuse if it isn't this move.

Both endpoints therefore take `SELECT ... FOR UPDATE` on the equipment_state
row *before* testing it, inside the transaction that will act on the result. A
plain SELECT then INSERT is a race: two concurrent requests both read NULL,
both insert a move, and the equipment ends up with two open moves and a
`current_move_id` pointing at whichever won the last write.

## Split of responsibility between the two operations

POST /moves records intent: it inserts the move and flags the equipment as
in-transit, but does **not** touch `current_location_id` or `status`. The
equipment is still physically where it was until someone confirms receipt.

POST /moves/{id}/receipt records arrival: it fills in the receipt half of
`move_logistics` and *then* applies the move's `to_location_id` and `status_to`
to `equipment_state`, and clears `current_move_id`. Both values are read back
from the stored `moves` row, never taken from the request — the move is the
record of what was supposed to happen, and receipting confirms it happened.

(The legacy move_receipt edge function never cleared `current_move_id`, which
under the current schema would leave equipment reading as "In transit"
forever.)

## move_logistics

A `move_logistics` row is inserted unconditionally alongside every move, with
the shipping half (carrier / tracking_number / booked_at) populated from the
request if supplied and the receipt half left NULL. `move_id` is that table's
PRIMARY KEY, so the relationship is strictly 1:1 and the receipt endpoint can
UPDATE a row it knows already exists — no insert, no upsert. If that UPDATE
matches nothing, something has corrupted the invariant and the endpoint says so
with a 500 rather than papering over it by creating a row.
"""

from __future__ import annotations

import asyncpg
from fastapi import HTTPException, status

# FOR UPDATE is the whole point — see the module docstring. The check on
# current_move_id is only sound while this lock is held.
_LOCK_STATE_QUERY = """
    SELECT current_move_id, current_location_id, status
    FROM public.equipment_state
    WHERE equipment_id = $1
    FOR UPDATE
"""

_EQUIPMENT_EXISTS_QUERY = """
    SELECT id FROM public.equipment WHERE id = $1
"""

# status_from / from_location_id / created_by are bound from server-side
# values, never from the request body. moved_at defaults to the transaction
# clock when the client doesn't supply one.
_INSERT_MOVE_QUERY = """
    INSERT INTO public.moves (
        equipment_id, move_type, from_location_id, to_location_id,
        status_from, status_to, moved_at, created_by, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8, $9)
    RETURNING *
"""

# Columns are listed rather than RETURNING * because create_move() merges this
# result with the moves row, and both tables have a `created_at`.
_INSERT_LOGISTICS_QUERY = """
    INSERT INTO public.move_logistics (move_id, carrier, tracking_number, booked_at)
    VALUES ($1, $2, $3, $4)
    RETURNING carrier, tracking_number, booked_at,
              received_at, received_by, condition_result, condition_notes
"""

_SET_CURRENT_MOVE_QUERY = """
    UPDATE public.equipment_state
    SET current_move_id = $2, updated_at = now()
    WHERE equipment_id = $1
"""

_SELECT_MOVE_QUERY = """
    SELECT equipment_id, to_location_id, status_to
    FROM public.moves
    WHERE id = $1
"""

_UPDATE_LOGISTICS_RECEIPT_QUERY = """
    UPDATE public.move_logistics
    SET received_at = now(),
        received_by = $2,
        condition_result = $3,
        condition_notes = $4
    WHERE move_id = $1
    RETURNING move_id
"""

_APPLY_RECEIPT_TO_STATE_QUERY = """
    UPDATE public.equipment_state
    SET current_move_id = NULL,
        current_location_id = $2,
        status = $3,
        condition = $4,
        updated_at = now()
    WHERE equipment_id = $1
"""

_SELECT_MOVE_WITH_LOGISTICS_QUERY = """
    SELECT
        m.*,
        ml.carrier, ml.tracking_number, ml.booked_at,
        ml.received_at, ml.received_by,
        ml.condition_result, ml.condition_notes
    FROM public.moves m
    LEFT JOIN public.move_logistics ml ON ml.move_id = m.id
    WHERE m.id = $1
"""


def _build_move(row: asyncpg.Record | dict) -> dict:
    return {
        "id": row["id"],
        "equipment_id": row["equipment_id"],
        "move_type": row["move_type"],
        "from_location_id": row["from_location_id"],
        "to_location_id": row["to_location_id"],
        "status_from": row["status_from"],
        "status_to": row["status_to"],
        "moved_at": row["moved_at"],
        "created_by": row["created_by"],
        "notes": row["notes"],
        "created_at": row["created_at"],
        "logistics": {
            "carrier": row["carrier"],
            "tracking_number": row["tracking_number"],
            "booked_at": row["booked_at"],
            "received_at": row["received_at"],
            "received_by": row["received_by"],
            "condition_result": row["condition_result"],
            "condition_notes": row["condition_notes"],
        },
    }


async def _lock_equipment_state(conn: asyncpg.Connection, equipment_id) -> asyncpg.Record:
    """Lock the equipment_state row and return it, or raise.

    A missing state row means either the equipment doesn't exist (404) or it
    exists without one (500 — create_equipment() inserts both in a single
    transaction, so this shouldn't be reachable for anything the API made).
    """
    state = await conn.fetchrow(_LOCK_STATE_QUERY, equipment_id)
    if state is not None:
        return state

    exists = await conn.fetchrow(_EQUIPMENT_EXISTS_QUERY, equipment_id)
    if exists is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Equipment {equipment_id} not found")

    raise HTTPException(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        f"Equipment {equipment_id} has no equipment_state row — data integrity bug",
    )


async def create_move(pool: asyncpg.Pool, fields: dict, *, created_by: str) -> dict:
    """Open a move: insert moves + move_logistics and flag the equipment as
    in-transit, all in one transaction under a lock on the equipment_state row.

    `fields` comes from the router's validated request model. `created_by` is
    the authenticated user's id — never anything the client sent.
    """
    equipment_id = fields["equipment_id"]

    async with pool.acquire() as conn:
        async with conn.transaction():
            state = await _lock_equipment_state(conn, equipment_id)

            if state["current_move_id"] is not None:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"Equipment {equipment_id} is already mid-move "
                    f"(move {state['current_move_id']} has not been receipted)",
                )

            try:
                move = await conn.fetchrow(
                    _INSERT_MOVE_QUERY,
                    equipment_id,
                    fields["move_type"],
                    # Server-derived from the locked row, not from the request.
                    state["current_location_id"],
                    fields["to_location_id"],
                    state["status"],
                    fields["status_to"],
                    fields["moved_at"],
                    created_by,
                    fields["notes"],
                )
            except asyncpg.ForeignKeyViolationError:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_CONTENT,
                    f"to_location_id {fields['to_location_id']} does not exist",
                )

            # Unconditional — the receipt endpoint relies on this row existing.
            # The receipt half stays NULL until it's filled in.
            logistics = await conn.fetchrow(
                _INSERT_LOGISTICS_QUERY,
                move["id"],
                fields["carrier"],
                fields["tracking_number"],
                fields["booked_at"],
            )

            # current_location_id and status are deliberately untouched: the
            # equipment hasn't gone anywhere yet, it's just flagged in-transit.
            await conn.execute(_SET_CURRENT_MOVE_QUERY, equipment_id, move["id"])

    return _build_move({**dict(move), **dict(logistics)})


async def receipt_move(pool: asyncpg.Pool, move_id, fields: dict, *, received_by: str) -> dict:
    """Close out a move: fill in the receipt half of move_logistics and apply
    the move's destination and status to equipment_state.

    `received_by` is the authenticated user's id — never client input.
    """
    async with pool.acquire() as conn:
        async with conn.transaction():
            move = await conn.fetchrow(_SELECT_MOVE_QUERY, move_id)
            if move is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"Move {move_id} not found")

            state = await _lock_equipment_state(conn, move["equipment_id"])

            # Not a silent no-op: a second receipt, or a receipt for a move
            # that's been superseded, is a real conflict the caller needs told.
            if state["current_move_id"] != move_id:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"Move {move_id} is not the active move for equipment "
                    f"{move['equipment_id']} (already received, or superseded)",
                )

            # UPDATE, not INSERT and not upsert — create_move() guarantees the
            # row. No match means the invariant is broken; say so.
            logistics = await conn.fetchrow(
                _UPDATE_LOGISTICS_RECEIPT_QUERY,
                move_id,
                received_by,
                fields["condition_result"],
                fields["condition_notes"],
            )
            if logistics is None:
                raise HTTPException(
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
                    f"move_logistics row missing for move {move_id} — data integrity bug",
                )

            # Destination and status come from the stored move, not the
            # request. condition is the one exception here — it comes from
            # the receipt body (fields["condition_result"]), the value just
            # written to move_logistics above in this same transaction.
            await conn.execute(
                _APPLY_RECEIPT_TO_STATE_QUERY,
                move["equipment_id"],
                move["to_location_id"],
                move["status_to"],
                fields["condition_result"],
            )

            row = await conn.fetchrow(_SELECT_MOVE_WITH_LOGISTICS_QUERY, move_id)

    return _build_move(row)
