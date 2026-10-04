"""Engine de SQLite y dependencia de sesión."""

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from backend.config import DB_PATH

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)


def create_db() -> None:
    """Crea las tablas si no existen."""
    # Importar los modelos registra las tablas en SQLModel.metadata.
    from backend import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """Entrega una sesión por request y la cierra al terminar."""
    with Session(engine) as session:
        yield session
