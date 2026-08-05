-- ============================================================================
-- equipment_state.condition (new) + move_logistics.condition_result: text -> enum
--
-- 001_db_simplification.sql dropped equipment_state's condition-tracking
-- columns entirely, with a comment noting they'd likely be reintroduced
-- later. This is that reintroduction: a single `condition` column, set by
-- POST /moves/{id}/receipt, representing the equipment's current/ongoing
-- condition — distinct from move_logistics.condition_result, which is a
-- per-move record of what a specific receipt assessed. Conceptually the same
-- three-way assessment at two different scopes, so both columns share one
-- enum type rather than maintaining two vocabularies that can drift apart.
--
-- The type is named `condition_assessment` rather than after either column,
-- since it types two columns with two different names.
--
-- PRE-FLIGHT — run this first and confirm the result is a subset of
-- {'pass', 'needs_attention', 'fail'}. The ALTER on move_logistics will abort
-- the whole transaction otherwise:
--
--     SELECT DISTINCT condition_result FROM public.move_logistics
--     WHERE condition_result IS NOT NULL;
--
-- If that query returns anything outside the three values above, STOP — do
-- not run this migration as written. Either clean up the offending rows
-- first, or widen the enum to include the extra value(s) before applying.
--
-- The equipment_state half of this migration cannot fail on existing data:
-- it's a new nullable column with nothing in it yet. The move_logistics half
-- is the one gated by the PRE-FLIGHT above.
-- ============================================================================

BEGIN;

CREATE TYPE condition_assessment AS ENUM (
  'pass',
  'needs_attention',
  'fail'
);

-- Nullable, no default: NULL means "never assessed" — equipment with no move
-- ever receipted. Set only by POST /moves/{id}/receipt
-- (app/services/moves.py, _APPLY_RECEIPT_TO_STATE_QUERY), never directly via
-- PATCH /equipment/{id} — see the module docstring in
-- app/routers/equipment.py for why state-owned fields aren't admin-patchable.
ALTER TABLE public.equipment_state
  ADD COLUMN condition public.condition_assessment;

-- Tightens the existing free-text column to the same enum. See the
-- PRE-FLIGHT comment above before running this against a populated database.
ALTER TABLE public.move_logistics
  ALTER COLUMN condition_result TYPE public.condition_assessment
  USING condition_result::public.condition_assessment;

COMMIT;
