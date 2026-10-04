import os
from pathlib import Path
from sqlmodel import create_engine, Session

# Define path for music.db inside the backend directory
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "music.db"

sqlite_url = f"sqlite:///{DATABASE_PATH}"

# check_same_thread=False is needed only for SQLite
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def get_session():
    """Dependency generator to provide database sessions."""
    with Session(engine) as session:
        yield session
