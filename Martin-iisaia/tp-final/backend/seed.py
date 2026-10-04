"""Carga inicial idempotente del catálogo."""

import logging

from sqlmodel import Session, select

from backend.config import STATIC_DIR
from backend.models import Song

logger = logging.getLogger(__name__)

SEED_SONGS: list[dict[str, str]] = [
    {"title": "Maqueta Nocturna", "artist": "Luna Ferro", "audio_path": "/static/audio/track1.mp3"},
    {"title": "Garage Session #2", "artist": "Los Tranvías", "audio_path": "/static/audio/track2.wav"},
    {"title": "Arpegio en Do", "artist": "Synth Casero", "audio_path": "/static/audio/track3.wav"},
]


def _warn_missing_files() -> None:
    for song in SEED_SONGS:
        relative = song["audio_path"].removeprefix("/static/")
        if not (STATIC_DIR / relative).exists():
            logger.warning("Audio de seed no encontrado: %s", song["audio_path"])


def seed_songs(session: Session) -> None:
    """Inserta las canciones de prueba solo si la tabla está vacía."""
    if session.exec(select(Song).limit(1)).first() is not None:
        return
    _warn_missing_files()
    session.add_all(Song(**data) for data in SEED_SONGS)
    session.commit()
