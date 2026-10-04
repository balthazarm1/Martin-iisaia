from datetime import datetime
from pydantic import BaseModel, Field

class LikeIn(BaseModel):
    player_nickname: str = Field(..., min_length=1, description="Nickname of the player leaving a like")

class LikeOut(BaseModel):
    id: int
    song_id: int
    player_nickname: str
    created_at: datetime

    class Config:
        from_attributes = True

class SongOut(BaseModel):
    id: int
    title: str
    artist: str
    audio_url: str
    likes_count: int

    class Config:
        from_attributes = True
