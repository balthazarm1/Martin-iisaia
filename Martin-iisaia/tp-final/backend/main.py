from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel, Session, select

from backend.db import engine
from backend.models import Song
from backend.routes import router as songs_router

def seed_database(session: Session) -> None:
    """Seeds the database with initial songs if empty."""
    song_count = session.exec(select(Song)).first()
    if not song_count:
        test_songs = [
            Song(
                title="Maqueta 1",
                artist="Artista A",
                audio_url="/static/audio/track1.mp3"
            ),
            Song(
                title="Maqueta 2",
                artist="Artista B",
                audio_url="/static/audio/track2.mp3"
            ),
            Song(
                title="Maqueta 3",
                artist="Artista C",
                audio_url="/static/audio/track3.mp3"
            ),
        ]
        session.add_all(test_songs)
        session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    SQLModel.metadata.create_all(engine)
    
    # Run seed
    with Session(engine) as session:
        seed_database(session)
        
    yield

app = FastAPI(
    title="Plataforma de Streaming de Musica API",
    description="Backend para el TP Final de Streaming de Musica para artistas independientes",
    version="0.1.0",
    lifespan=lifespan
)

# Include the songs router under /api
app.include_router(songs_router, prefix="/api")

# Mount backend static folder for audio files
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Mount frontend folder for the UI (must be mounted last to avoid catching API routes)
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
