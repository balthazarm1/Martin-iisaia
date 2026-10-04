from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import List
from backend.db import get_session
from backend.models import Song, Like
from backend.schemas import SongOut, LikeIn, LikeOut

router = APIRouter(prefix="/songs", tags=["songs"])

@router.get("", response_model=List[SongOut])
def get_songs(session: Session = Depends(get_session)) -> List[SongOut]:
    """Gets all songs with their respective total likes count."""
    statement = (
        select(Song, func.count(Like.id).label("likes_count"))
        .outerjoin(Like, Song.id == Like.song_id)
        .group_by(Song.id)
    )
    results = session.exec(statement).all()
    
    return [
        SongOut(
            id=song.id,
            title=song.title,
            artist=song.artist,
            audio_url=song.audio_url,
            likes_count=likes_count
        )
        for song, likes_count in results
    ]

@router.post("/{song_id}/like", response_model=LikeOut, status_code=status.HTTP_201_CREATED)
def like_song(
    song_id: int, 
    like_in: LikeIn, 
    session: Session = Depends(get_session)
) -> Like:
    """Registers a 'like' for a specific song by a user nickname."""
    song = session.get(Song, song_id)
    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Song with id {song_id} not found"
        )
    
    new_like = Like(
        song_id=song_id,
        player_nickname=like_in.player_nickname
    )
    session.add(new_like)
    session.commit()
    session.refresh(new_like)
    return new_like
