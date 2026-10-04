"""Tablas de la base de datos (SQLModel). No se exponen directamente en la API."""

from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Song(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    artist: str
    audio_path: str = Field(unique=True)
    duration_s: int | None = None


class Like(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("song_id", "nickname"),)

    id: int | None = Field(default=None, primary_key=True)
    song_id: int = Field(foreign_key="song.id", index=True)
    nickname: str = Field(index=True)
    created_at: datetime = Field(default_factory=_utcnow)
