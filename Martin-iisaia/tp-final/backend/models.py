from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel

class Song(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    artist: str
    audio_url: str

class Like(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    song_id: int = Field(foreign_key="song.id")
    player_nickname: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
