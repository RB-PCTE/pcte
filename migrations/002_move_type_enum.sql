-- ============================================================================
-- moves.move_type: text -> enum
--
-- 001_db_simplification.sql left `moves.move_type` as bare `text NOT NULL`
-- with no CHECK, so a typo'd move type is stored silently and forever. The
-- five values below are the ones the app has ever used (see the legacy
-- `deriveMoveType` in src/ui/operations.js and the move_create edge function).
--
-- PRE-FLIGHT — run this first and confirm the result is a subset of the five
-- values below. The ALTER will abort the whole transaction otherwise:
--
--     SELECT DISTINCT move_type FROM public.moves;
--
-- The API does not depend on this migration: POST /moves validates move_type
-- against the same five values with a Pydantic Literal, and asyncpg encodes a
-- Python str into either a text or an enum column. Applying this just moves
-- the guarantee into the database.
-- ============================================================================

BEGIN;

CREATE TYPE move_type AS ENUM (
  'office_transfer',
  'hire_out',
  'hire_return',
  'workshop',
  'move'
);

-- The type and the column share the name `move_type`; the cast target is
-- schema-qualified so there is no ambiguity about which one is meant.
ALTER TABLE public.moves
  ALTER COLUMN move_type TYPE move_type
  USING move_type::public.move_type;

COMMIT;

-- ============================================================================
-- NOTE: asyncpg decodes enums as plain str (no custom codec is registered in
-- backend/app/db.py), so `MoveOut.move_type: str` in
-- backend/app/routers/state.py keeps working unchanged after this runs.
-- ============================================================================
ALTER TABLE public.equipment ALTER COLUMN calibration_required SET NOT NULL;