"""Rutas absolutas del proyecto, independientes del directorio de trabajo."""

from pathlib import Path

BASE_DIR: Path = Path(__file__).resolve().parent
DB_PATH: Path = BASE_DIR / "music.db"
STATIC_DIR: Path = BASE_DIR / "static"
AUDIO_DIR: Path = STATIC_DIR / "audio"
FRONTEND_DIR: Path = BASE_DIR.parent / "frontend"
