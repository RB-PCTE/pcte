-- ============================================================================
-- Fleet Tracker schema simplification — clean-slate migration
-- Assumes the database is being emptied first, so this drops and recreates
-- the affected tables directly rather than converting/backfilling live data.
--
-- Run order: empty the tables first (or just run this — the DROP TABLE
-- statements below remove all data along with the structure), then run
-- this whole script as one transaction.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Drop tables being restructured (order matters — children before parents)
-- ============================================================================

-- CASCADE is safe here because every table being dropped is recreated below.
-- Without it, moves/equipment_state/equipment form a dependency cycle
-- (equipment_state.current_move_id -> moves, moves.equipment_id -> equipment,
-- equipment_state.equipment_id -> equipment) that no manual DROP order avoids.
DROP TABLE IF EXISTS public.corrections CASCADE;      -- left detached/untouched otherwise; dropped+recreated as-is for clean rebuild
DROP TABLE IF EXISTS public.move_shipping CASCADE;
DROP TABLE IF EXISTS public.move_receipts CASCADE;
DROP TABLE IF EXISTS public.moves CASCADE;
DROP TABLE IF EXISTS public.equipment_state CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS equipment_status;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS equipment_category;
DROP TYPE IF EXISTS location_category;


-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE equipment_status AS ENUM (
  'available',
  'on_demo',
  'on_hire',
  'in_service_repair',
  'quarantined'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'staff',
  'salesperson'
);

CREATE TYPE equipment_category AS ENUM (
  'INDT',
  'CNDT',
  'geotech',
  'GPR',
  'lab'
);

CREATE TYPE location_category AS ENUM (
  'customer',
  'warehouse',
  'office'
);


-- ============================================================================
-- locations
-- ============================================================================

CREATE TABLE public.locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    location_category NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- equipment
-- ============================================================================

CREATE TABLE public.equipment (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                          text NOT NULL,
  serial                        text,
  category                      equipment_category NOT NULL,
  home_location_id              uuid REFERENCES public.locations(id),
  active                        boolean NOT NULL DEFAULT true,
  notes                         text,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  purchase_date                 date,
  calibration_required          boolean DEFAULT false,
  calibration_interval_months   integer,
  last_calibration_date         date
);


-- ============================================================================
-- moves  (created before equipment_state so equipment_state.current_move_id
-- can reference it)
-- ============================================================================

CREATE TABLE public.moves (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id       uuid NOT NULL REFERENCES public.equipment(id),
  move_type          text NOT NULL,
  from_location_id   uuid REFERENCES public.locations(id),
  to_location_id     uuid NOT NULL REFERENCES public.locations(id),
  status_from        equipment_status NOT NULL,
  status_to          equipment_status NOT NULL,
  moved_at           timestamptz NOT NULL,
  created_by         uuid NOT NULL REFERENCES auth.users(id),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- equipment_state
-- ============================================================================

CREATE TABLE public.equipment_state (
  equipment_id            uuid PRIMARY KEY REFERENCES public.equipment(id) ON DELETE CASCADE,
  current_location_id     uuid REFERENCES public.locations(id),
  current_move_id         uuid REFERENCES public.moves(id),
  status                  equipment_status NOT NULL DEFAULT 'available',
  updated_at              timestamptz NOT NULL DEFAULT now()
  -- condition-tracking columns intentionally left out of this pass —
  -- will likely be reintroduced later; not ported by the new API
);


-- ============================================================================
-- move_logistics  (replaces move_shipping + move_receipts)
-- ============================================================================

CREATE TABLE public.move_logistics (
  move_id            uuid PRIMARY KEY REFERENCES public.moves(id),
  carrier            text,
  tracking_number    text,
  booked_at          timestamptz,
  received_at        timestamptz,
  received_by        uuid REFERENCES auth.users(id),
  condition_result   text,
  condition_notes    text,
  created_at         timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- profiles
-- ============================================================================

CREATE TABLE public.profiles (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name         text NOT NULL,
  role                 user_role NOT NULL DEFAULT 'staff',
  office_location_id   uuid REFERENCES public.locations(id),
  active               boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- corrections  (left detached/untouched in shape — recreated as-is)
-- ============================================================================

CREATE TABLE public.corrections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  move_id        uuid REFERENCES public.moves(id),
  field          text NOT NULL,
  old_value      text,
  new_value      text,
  reason         text,
  corrected_at   timestamptz DEFAULT now(),
  corrected_by   text
);

COMMIT;

-- ============================================================================
-- NOTE: RLS is not re-enabled by this script. All tables come out of this
-- migration with RLS in whatever state it was left in before the drop —
-- since the tables are dropped and recreated, RLS defaults to OFF on the
-- new tables until you explicitly enable it. Re-enable + add policies once
-- the FastAPI backend is the confirmed single writer (see REBUILD_PLAN.md
-- and the RLS discussion earlier in this project).
-- ============================================================================
