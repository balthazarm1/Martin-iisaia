"""Punto de entrada: API bajo /api, audios en /static y frontend en /."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from backend.config import FRONTEND_DIR, STATIC_DIR
from backend.db import create_db, engine
from backend.routers import likes, songs
from backend.seed import seed_songs


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    create_db()
    with Session(engine) as session:
        seed_songs(session)
    yield


app = FastAPI(
    title="IndieStream API",
    description="Catálogo y likes para artistas independientes",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(songs.router, prefix="/api")
app.include_router(likes.router, prefix="/api")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
# Siempre al final: captura todo lo que no matcheó antes.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
