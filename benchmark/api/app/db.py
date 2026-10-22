"""Database engine and session.

DATABASE_URL picks the database:
- unset: a local SQLite file filled with demo data on first start
- postgresql+psycopg://...: Neon (or any Postgres) in production
"""

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DEMO_DB_PATH = Path(tempfile.gettempdir()) / "niera_bench_demo.db"


def database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        return f"sqlite:///{DEMO_DB_PATH}"
    # Neon and most hosts hand out postgres:// URLs; SQLAlchemy needs the driver name.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


class Base(DeclarativeBase):
    pass


engine = create_engine(database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
