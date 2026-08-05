"""
Pure computed-value functions — the server-side port of src/ui/computed.js.

No DB access, no Pydantic, no framework imports. Every function here takes
plain values (dates, strings, bools) in and returns a plain value (str /
dict / None) out, so it's trivially unit-testable and stays decoupled from
both the asyncpg row shapes in services/state.py and the response models in
routers/state.py.

Ported from src/ui/computed.js, adjusted for the post-migration schema
(migrations/001_db_simplification.sql):
  - equipment_state.status is an `equipment_status` enum now, not free text.
  - "In transit" is derived from equipment_state.current_move_id IS NOT NULL
    — it is no longer inferred from move history, so getEquipmentLocationDisplay
    no longer needs a `moves` argument.
  - condition-tracking fields were dropped from equipment_state entirely —
    getLatestConditionForItem / conditionBadgeClass are not ported.
  - getSubscriptionInfo is not ported (DB B, out of scope for this endpoint).
  - statusPillClass / healthPillClass are frontend CSS-modifier helpers, not
    ported — display concerns stay in the frontend.
"""

from __future__ import annotations

import calendar
from datetime import date


# ── Date helpers (private) ──────────────────────────────────────────────────


def _add_months(start: date, months: int) -> date:
    """Return `start` plus `months` calendar months, clamping the day to the
    last valid day of the resulting month (e.g. Jan 31 + 1 month -> Feb 28,
    or Feb 29 in a leap year) rather than rolling over into the following
    month the way JS's `Date.setMonth` does.
    """
    month_index = start.month - 1 + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


# ── Equipment age ────────────────────────────────────────────────────────────


def get_age_label(purchase_date: date | None, today: date | None = None) -> str:
    """Return a compact age label such as "2y 3m" or "5m" from a purchase
    date. Returns "Unknown" if the date is absent.

    Ported as-is from computed.js getAgeLabel — equipment.purchase_date is
    unchanged by the schema migration.
    """
    if purchase_date is None:
        return "Unknown"

    today = today or date.today()

    total_months = (
        (today.year - purchase_date.year) * 12
        + (today.month - purchase_date.month)
        - (1 if today.day < purchase_date.day else 0)
    )

    safe_months = max(total_months, 0)
    years, months = divmod(safe_months, 12)

    year_part = f"{years}y" if years > 0 else ""
    month_part = f"{months}m" if (months > 0 or years == 0) else ""
    return " ".join(part for part in (year_part, month_part) if part)


# ── Calibration ──────────────────────────────────────────────────────────────


def get_calibration_info(
    calibration_required: bool,
    last_calibration_date: date | None,
    calibration_interval_months: int | None,
    today: date | None = None,
) -> dict | None:
    """Compute the calibration health of one equipment item.

    Returns None when calibration isn't required at all — nothing for the
    frontend to render in that case.

    Otherwise returns {"status": ..., "due_date": date | None}:
      - "unknown"  — required, but no last_calibration_date recorded yet.
      - "overdue"  — due_date is in the past.
      - "due_soon" — due_date is within 30 days of today, inclusive.
      - "ok"       — due_date is more than 30 days out.
    """
    if not calibration_required:
        return None

    if last_calibration_date is None:
        return {"status": "unknown", "due_date": None}

    today = today or date.today()
    interval_months = (
        calibration_interval_months if calibration_interval_months is not None else 12
    )
    due_date = _add_months(last_calibration_date, interval_months)
    diff_days = (due_date - today).days

    if diff_days < 0:
        status = "overdue"
    elif diff_days <= 30:
        status = "due_soon"
    else:
        status = "ok"

    return {"status": status, "due_date": due_date}


# ── Location display ─────────────────────────────────────────────────────────


def get_equipment_location_display(current_location_name: str | None, in_transit: bool) -> dict:
    """Return a display-ready location object for an item.

    Now trivial per the schema migration: equipment_state.current_location_id
    tracks the correct location even mid-transit, so — unlike the old JS
    version — this needs no `moves` data to infer from/to locations.

    Returns {"text": str, "in_transit": bool}.
    """
    if in_transit:
        text = f"In transit ({current_location_name})" if current_location_name else "In transit"
    else:
        text = current_location_name or "Unknown"

    return {"text": text, "in_transit": in_transit}
