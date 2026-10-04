"""Endpoints de likes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, func, select

from backend.db import get_session
from backend.models import Like, Song
from backend.schemas import ErrorOut, LikeIn, LikeOut

router = APIRouter(prefix="/songs", tags=["likes"])


def _count_likes(session: Session, song_id: int) -> int:
    return session.exec(select(func.count(Like.id)).where(Like.song_id == song_id)).one()


@router.post(
    "/{song_id}/like",
    response_model=LikeOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorOut},
        status.HTTP_409_CONFLICT: {"model": ErrorOut},
    },
)
def like_song(
    song_id: int,
    like_in: LikeIn,
    session: Session = Depends(get_session),
) -> LikeOut:
    """Registra un like de `nickname` sobre la canción (uno por persona)."""
    if session.get(Song, song_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"La canción {song_id} no existe")

    like = Like(song_id=song_id, nickname=like_in.nickname)
    session.add(like)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya diste like a esta canción")
    session.refresh(like)

    return LikeOut(
        id=like.id,
        song_id=like.song_id,
        nickname=like.nickname,
        created_at=like.created_at,
        likes_count=_count_likes(session, song_id),
    )
