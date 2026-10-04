"""Esquemas Pydantic de entrada/salida de la API."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class SongOut(BaseModel):
    id: int
    title: str
    artist: str
    audio_url: str
    likes_count: int


class LikeIn(BaseModel):
    nickname: str = Field(min_length=2, max_length=30, pattern=r"^[\w\- ]+$")

    @field_validator("nickname", mode="before")
    @classmethod
    def strip_nickname(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class LikeOut(BaseModel):
    id: int
    song_id: int
    nickname: str
    created_at: datetime
    likes_count: int


class ErrorOut(BaseModel):
    detail: str
