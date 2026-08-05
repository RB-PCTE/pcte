"""
JWT authentication for Supabase-issued access tokens.

Verifies tokens locally against the Supabase project's JWKS endpoint
(no round-trip call to Supabase Auth per request). Provides two FastAPI
dependencies:

  - get_current_user: verifies the bearer token, returns {"user_id", "email"}.
  - require_admin:    get_current_user + profiles.role == 'admin' check
                       against DB A.
"""

from __future__ import annotations

import asyncpg
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import settings
from app.db import get_pool_a


# ---------------------------------------------------------------------------
# JWKS client (module-level singleton — one PyJWKClient per process, reused
# across requests so the JWKS document isn't re-fetched on every call).
# ---------------------------------------------------------------------------
# TODO(human): tune PyJWKClient's caching before this goes further than
# manual testing. Relevant kwargs (see jwt/jwks_client.py):
#   - cache_jwk_set / lifespan     (whole-JWKS-document cache, TTL in seconds;
#                                    library defaults: cache_jwk_set=True, lifespan=300)
#   - cache_keys / max_cached_keys (per-kid signing-key LRU cache; disabled by
#                                    default, no TTL, only evicted by size)
# Decide the right lifespan for Supabase's key-rotation cadence and whether the
# per-kid cache is worth enabling. Ask the user before setting these — do not
# silently pick values. Left as library defaults for now.
jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL)


# ---------------------------------------------------------------------------
# Bearer token extraction
# ---------------------------------------------------------------------------
# auto_error=False: on a missing/malformed Authorization header, HTTPBearer
# returns None instead of raising its own 403 "Not authenticated" — we want a
# 401 with a message that names the problem, handled explicitly below.
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    if creds is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Missing or malformed Authorization header (expected: Bearer <token>)",
        )

    token = creds.credentials  # scheme already validated/stripped by HTTPBearer

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            issuer=settings.supabase_issuer,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has expired")
    except jwt.InvalidAudienceError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token audience is invalid")
    except jwt.InvalidIssuerError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token issuer is invalid")
    except jwt.InvalidSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token signature verification failed")
    except jwt.PyJWKClientError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Unable to resolve token signing key: {e}")
    except jwt.DecodeError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}")
    except jwt.PyJWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Auth failed: {e}")

    return {"user_id": claims["sub"], "email": claims.get("email")}


# ---------------------------------------------------------------------------
# Admin-only dependency
# ---------------------------------------------------------------------------
async def require_admin(
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool_a),
) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT role FROM public.profiles WHERE user_id = $1",
            user["user_id"],
        )

    if row is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No profile found for this account")

    # profiles.role is the `user_role` enum ('admin' | 'staff' | 'salesperson');
    # asyncpg decodes enums as plain str by default (no custom codec registered
    # in app/db.py), so this is a correct plain string comparison.
    if row["role"] != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")

    return user
