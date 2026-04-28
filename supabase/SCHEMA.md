# Database Schema Reference

Two separate Supabase projects are used by this application.

---

## Database A — Fleet Tracker

**URL:** `https://eugdravtvewpnwkkpkzl.supabase.co`

### `equipment`
| column | type | nullable | notes |
|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() |
| asset_tag | text | YES | optional identifier |
| name | text | NO | |
| category | text | NO | maps to app `model` field |
| serial | text | YES | **shared key with subscription tracker** |
| home_location_id | uuid FK→locations | YES | permanent home location |
| active | boolean | NO | default true |
| notes | text | YES | |
| purchase_date | date | YES | |
| calibration_required | boolean | YES | default false |
| calibration_interval_months | int | YES | |
| last_calibration_date | date | YES | |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

### `equipment_state` (1:1 with equipment)
| column | type | nullable | notes |
|---|---|---|---|
| equipment_id | uuid PK FK→equipment | NO | |
| current_location_id | uuid FK→locations | YES | maps to app `location` |
| current_move_id | uuid FK→moves | YES | |
| last_condition_result | text | YES | maps to app `conditionRating` |
| last_condition_at | timestamptz | YES | maps to app `conditionLastCheckedAt` |
| status | text | YES | default 'Available' |
| condition_contents_ok | boolean | YES | |
| condition_functional_ok | boolean | YES | |
| condition_last_checked_by | text | YES | |
| condition_last_notes | text | YES | |
| condition_reference | jsonb | YES | default '{}' |
| condition_history | jsonb | YES | default '[]' |
| last_condition_check | jsonb | YES | |
| updated_at | timestamptz | NO | now() |

### `moves`
| column | type | nullable | notes |
|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() |
| equipment_id | uuid FK→equipment | NO | |
| move_type | text | NO | maps to app `type` |
| from_location_id | uuid FK→locations | YES | |
| to_location_id | uuid FK→locations | NO | |
| moved_at | timestamptz | NO | maps to app `timestamp` |
| created_by | uuid FK→profiles | NO | |
| notes | text | YES | maps to app `text` |
| requires_receipt | boolean | NO | default false |
| archived | boolean | YES | default false |
| created_at | timestamptz | NO | now() |

### `move_receipts`
| column | type | nullable | notes |
|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() |
| move_id | uuid FK→moves | NO | |
| received_at | timestamptz | NO | default now() |
| received_by | uuid FK→profiles | NO | |
| condition_result | text | NO | |
| condition_notes | text | YES | |
| created_at | timestamptz | NO | now() |

### `move_shipping`
| column | type | nullable | notes |
|---|---|---|---|
| move_id | uuid FK→moves | NO | |
| carrier | text | NO | |
| tracking_number | text | NO | |
| booked_at | timestamptz | YES | |
| raw | jsonb | YES | |

### `locations`
| column | type | nullable | notes |
|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() |
| name | text | NO | |
| type | text | NO | default 'office' |
| active | boolean | NO | default true |
| created_at | timestamptz | NO | now() |

### `profiles`
| column | type | nullable | notes |
|---|---|---|---|
| user_id | uuid PK | NO | |
| display_name | text | NO | default '' |
| role | text | NO | default 'ops' |
| office_location_id | uuid FK→locations | YES | |
| active | boolean | NO | default true |
| created_at | timestamptz | NO | now() |

### `corrections`
| column | type | nullable | notes |
|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() |
| move_id | uuid FK→moves | YES | |
| field | text | NO | |
| old_value | text | YES | |
| new_value | text | YES | |
| reason | text | YES | |
| corrected_at | timestamptz | YES | default now() |
| corrected_by | text | YES | |

---

## Database B — Subscription Tracker

**URL:** `https://ezsqpiwzcuczgqdqyuqx.supabase.co`

The fleet tracker integrates with this database in two ways:
- **Read**: loads `renewal_date` per equipment by matching `equipment.serial` → `subscriptions.serial_number`
- **Write**: creates a new `subscriptions` row (with `customer = 'PCTE Fleet Equipment'`) when equipment is added and subscription is required

### `subscriptions` ← primary integration table
| column | type | nullable | notes |
|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() |
| serial_number | text | NO | **shared key** — matches fleet tracker `equipment.serial` |
| product_name | text | YES | |
| plan | text | YES | |
| billing_cycle | text | NO | default 'monthly'; fleet tracker writes 'monthly' or 'annually' |
| renewal_date | date | YES | read by fleet tracker → app `subscriptionRenewalDate` |
| status | text | NO | default 'active' |
| customer | text | YES | fleet tracker writes 'PCTE Fleet Equipment' on creation |
| quote_progress | text | YES | managed by subscription tracker only |
| invoice_progress | text | YES | managed by subscription tracker only |
| final_warning_progress | text | YES | managed by subscription tracker only |
| renewal_workflow_note | text | YES | managed by subscription tracker only |
| notes | text | YES | |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

### `subscription_renewals`
| column | type | nullable | notes |
|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() |
| subscription_id | uuid FK→subscriptions | NO | |
| start_date | date | NO | |
| end_date | date | YES | |
| billing_frequency | text | YES | |
| renewal_outcome | text | NO | default 'renewed' |
| status | text | YES | |
| notes | text | YES | |
| created_at / updated_at | timestamptz | NO | |

### `subscription_workflow_history`
| column | type | nullable | notes |
|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() |
| subscription_id | uuid FK→subscriptions | NO | |
| renewal_phase_key | text | NO | |
| renewal_term_id | uuid | YES | |
| renewal_phase_start_date | date | YES | |
| renewal_phase_end_date | date | YES | |
| stage | text | NO | |
| progress_value | text | NO | |
| note | text | YES | |
| updated_by | uuid | YES | |
| created_at / updated_at | timestamptz | NO | |

### Other tables (not used by fleet tracker)
- `app_invites` — user invitation management
- `app_users` — user roles within the subscription tracker app
- `weekly_summary_email_runs` — automated email audit log

---

## Schema extensions SQL (Fleet Tracker — run once in SQL Editor)

```sql
ALTER TABLE equipment_state
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS condition_contents_ok boolean,
  ADD COLUMN IF NOT EXISTS condition_functional_ok boolean,
  ADD COLUMN IF NOT EXISTS condition_last_checked_by text,
  ADD COLUMN IF NOT EXISTS condition_last_notes text,
  ADD COLUMN IF NOT EXISTS condition_reference jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS condition_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_condition_check jsonb;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS purchase_date date,
  ADD COLUMN IF NOT EXISTS calibration_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS calibration_interval_months int,
  ADD COLUMN IF NOT EXISTS last_calibration_date date;

ALTER TABLE equipment ALTER COLUMN asset_tag DROP NOT NULL;

ALTER TABLE moves
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  move_id uuid REFERENCES moves(id),
  field text NOT NULL,
  old_value text,
  new_value text,
  reason text,
  corrected_at timestamptz DEFAULT now(),
  corrected_by text
);
```
