from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import connect_pools, close_pools


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


# Routers are registered here as they're built out in later steps:
# from app.routers import state, equipment, moves, locations, corrections
# app.include_router(state.router)
# app.include_router(equipment.router)
# app.include_router(moves.router)
# app.include_router(locations.router)
# app.include_router(corrections.router)
