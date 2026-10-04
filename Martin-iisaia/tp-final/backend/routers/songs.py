"""Endpoints del catálogo de canciones."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, func, select

from backend.db import get_session
from backend.models import Like, Song
from backend.schemas import ErrorOut, SongOut

router = APIRouter(prefix="/songs", tags=["songs"])


def _songs_with_likes_query():  # noqa: ANN202 (tipo interno de SQLAlchemy)
    return (
        select(Song, func.count(Like.id))
        .outerjoin(Like, Like.song_id == Song.id)
        .group_by(Song.id)
        .order_by(Song.id)
    )


def _to_song_out(song: Song, likes_count: int) -> SongOut:
    return SongOut(
        id=song.id,
        title=song.title,
        artist=song.artist,
        audio_url=song.audio_path,
        likes_count=likes_count,
    )


@router.get("", response_model=list[SongOut])
def list_songs(session: Session = Depends(get_session)) -> list[SongOut]:
    """Lista todas las canciones con su cantidad de likes."""
    rows = session.exec(_songs_with_likes_query()).all()
    return [_to_song_out(song, count) for song, count in rows]


@router.get(
    "/{song_id}",
    response_model=SongOut,
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorOut}},
)
def get_song(song_id: int, session: Session = Depends(get_session)) -> SongOut:
    """Devuelve una canción o 404 si no existe."""
    row = session.exec(_songs_with_likes_query().where(Song.id == song_id)).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"La canción {song_id} no existe")
    song, count = row
    return _to_song_out(song, count)
