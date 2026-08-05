from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user
from app.config import settings
from app.db import connect_pools, close_pools
from app.routers import equipment, locations, moves, state


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_pools()
    yield
    await close_pools()


app = FastAPI(title="Fleet Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/auth/whoami")
async def whoami(user: dict = Depends(get_current_user)):
    """Manual JWT-auth smoke test. Remove once real routers (step 5+) exist."""
    return user


app.include_router(state.router)
app.include_router(equipment.router)
app.include_router(locations.router)
app.include_router(moves.router)

# Remaining routers are registered here as they're built out in later steps:
# from app.routers import corrections
# app.include_router(corrections.router)
