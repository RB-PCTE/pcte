"""
Shared fixtures for the backend test suite.

## Nothing here imports app.* at module level — on purpose

`app/config.py` instantiates `Settings()` at import time, and its
`SettingsConfigDict(env_file=".env")` resolves that path *relative to the
working directory*. A module-level `from app.config import settings` would
therefore raise `ValidationError` for anyone without a populated `.env`,
turning a plain `pytest -m "not integration"` run into a collection error
rather than a clean pass. Every fixture that needs settings imports it inside
the function body, so the cost is paid only by tests that actually talk to the
database.

The same reasoning applies to `asyncpg` usage: the teardown connects directly
to DB A rather than going through `app.db`'s pools, because those are created
by the FastAPI lifespan and belong to the *server* process, not the test
process.
"""

from __future__ import annotations

import asyncio
import os
import time
import uuid
from dataclasses import dataclass, field

import httpx
import pytest

# --------------------------------------------------------------------------
# Environment
# --------------------------------------------------------------------------


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.environ.get("BASE_URL", "http://localhost:8000").rstrip("/")


@pytest.fixture(scope="session")
def admin_token() -> str:
    """JWT for a user with `profiles.role = 'admin'`.

    Integration modules gate on this with a module-level skipif, so by the time
    a fixture asks for it, it's set.
    """
    return os.environ["ADMIN_TOKEN"]


@pytest.fixture(scope="session")
def user_token() -> str:
    """JWT for a NON-admin user (role `staff`/`salesperson`, or no profiles row)."""
    return os.environ["USER_TOKEN"]


@pytest.fixture(scope="session")
def api(base_url: str):
    with httpx.Client(base_url=base_url, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="session")
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def user_headers(user_token: str) -> dict:
    return {"Authorization": f"Bearer {user_token}"}


# --------------------------------------------------------------------------
# Run tagging + database teardown
# --------------------------------------------------------------------------


@dataclass
class TestRun:
    """Identifies one test run's rows and tracks what it created.

    Two independent handles on the same rows, deliberately:

    - `tag` goes into a human-readable text column of every row created
      (`locations.name`, `equipment.name`, `moves.notes`). If the process is
      killed mid-test and teardown never runs, an operator can still find the
      residue with `WHERE name LIKE 'VERIFY-%'`.
    - the id lists give teardown an exact target, including for rows whose
      tables have no text column to tag (`equipment_state`, `move_logistics`).

    The epoch prefix keeps runs sortable; the uuid suffix means two runs
    started in the same second can't collide.
    """

    tag: str
    location_ids: list[uuid.UUID] = field(default_factory=list)
    equipment_ids: list[uuid.UUID] = field(default_factory=list)
    move_ids: list[uuid.UUID] = field(default_factory=list)

    def name(self, suffix: str) -> str:
        """Tagged value for a text column, e.g. run.name("home")."""
        return f"{self.tag}-{suffix}"

    def add_location(self, value) -> None:
        self.location_ids.append(uuid.UUID(str(value)))

    def add_equipment(self, value) -> None:
        self.equipment_ids.append(uuid.UUID(str(value)))

    def add_move(self, value) -> None:
        self.move_ids.append(uuid.UUID(str(value)))


# FK-safe order, one statement at a time. Each carries its own parameter
# numbering rather than sharing one argument tuple: asyncpg prepares every
# statement individually and rejects extra arguments ("the server expects 1
# argument for this query, 4 were passed").
#
# Breaking the equipment_state -> moves reference first is the step that isn't
# obvious. A test that fails mid-lifecycle leaves current_move_id pointing at a
# move, and without clearing it the DELETE from moves raises ForeignKeyViolation
# and strands every row the run created.
_BREAK_STATE_MOVE_FK = """
    UPDATE public.equipment_state
    SET current_move_id = NULL
    WHERE equipment_id = ANY($1::uuid[])
"""

_DELETE_LOGISTICS = """
    DELETE FROM public.move_logistics
    WHERE move_id = ANY($1::uuid[])
       OR move_id IN (SELECT id FROM public.moves WHERE equipment_id = ANY($2::uuid[]))
"""

_DELETE_MOVES = """
    DELETE FROM public.moves
    WHERE id = ANY($1::uuid[])
       OR equipment_id = ANY($2::uuid[])
       OR notes LIKE $3
"""

_DELETE_STATE = """
    DELETE FROM public.equipment_state
    WHERE equipment_id = ANY($1::uuid[])
"""

_DELETE_EQUIPMENT = """
    DELETE FROM public.equipment
    WHERE id = ANY($1::uuid[])
       OR name LIKE $2
"""

_DELETE_LOCATIONS = """
    DELETE FROM public.locations
    WHERE id = ANY($1::uuid[])
       OR name LIKE $2
"""

# The automated form of "confirm no rows survive". Checks both handles — the
# tag for the tables that carry it, the registered ids for the two that don't.
_RESIDUE_QUERY = """
    SELECT 'locations' AS table_name, count(*) AS n
      FROM public.locations WHERE name LIKE $4 OR id = ANY($2::uuid[])
    UNION ALL
    SELECT 'equipment', count(*)
      FROM public.equipment WHERE name LIKE $4 OR id = ANY($1::uuid[])
    UNION ALL
    SELECT 'moves', count(*)
      FROM public.moves
     WHERE notes LIKE $4 OR id = ANY($3::uuid[]) OR equipment_id = ANY($1::uuid[])
    UNION ALL
    SELECT 'equipment_state', count(*)
      FROM public.equipment_state WHERE equipment_id = ANY($1::uuid[])
    UNION ALL
    SELECT 'move_logistics', count(*)
      FROM public.move_logistics WHERE move_id = ANY($3::uuid[])
"""


async def _purge(run: TestRun) -> list[tuple[str, int]]:
    """Delete everything this run created, then report anything left behind."""
    # Imported here, not at module level — see the module docstring.
    import asyncpg

    from app.config import settings

    equipment_ids = run.equipment_ids
    location_ids = run.location_ids
    move_ids = run.move_ids
    like = f"{run.tag}%"

    conn = await asyncpg.connect(settings.DB_A_URL)
    try:
        async with conn.transaction():
            await conn.execute(_BREAK_STATE_MOVE_FK, equipment_ids)
            await conn.execute(_DELETE_LOGISTICS, move_ids, equipment_ids)
            await conn.execute(_DELETE_MOVES, move_ids, equipment_ids, like)
            await conn.execute(_DELETE_STATE, equipment_ids)
            await conn.execute(_DELETE_EQUIPMENT, equipment_ids, like)
            await conn.execute(_DELETE_LOCATIONS, location_ids, like)

        rows = await conn.fetch(_RESIDUE_QUERY, equipment_ids, location_ids, move_ids, like)
    finally:
        await conn.close()

    return [(row["table_name"], row["n"]) for row in rows if row["n"]]


@pytest.fixture(scope="session")
def run():
    """Unique run identity, with automatic cleanup of everything it created.

    Session-scoped and lazy: a run where every test skips for missing tokens
    never instantiates this, so it never opens a database connection.
    """
    test_run = TestRun(tag=f"VERIFY-{int(time.time())}-{uuid.uuid4().hex[:6]}")

    yield test_run

    leaks = asyncio.run(_purge(test_run))
    if leaks:
        # Raising in teardown surfaces as an error on the session rather than
        # on a single test, which is right: leaked rows are a suite-level
        # problem and silently accumulating them is worse than a red run.
        detail = ", ".join(f"{table}={count}" for table, count in leaks)
        raise AssertionError(
            f"Teardown left rows behind for {test_run.tag} ({detail}). "
            f"Find them with: SELECT * FROM public.equipment WHERE name LIKE '{test_run.tag}%';"
        )
