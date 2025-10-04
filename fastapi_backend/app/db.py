import os
from contextlib import contextmanager
from typing import Generator, Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base

# Load environment variables from .env if present
load_dotenv()

# Default to a local SQLite database file if DB_URL is not provided
DEFAULT_SQLITE_URL = "sqlite:///./app.db"

# Resolve DB URL from env, fallback to default
DB_URL: str = os.getenv("DB_URL", DEFAULT_SQLITE_URL).strip() or DEFAULT_SQLITE_URL

# SQLite specific connect args to allow usage across threads and ensure WAL-friendly pragmas if needed
connect_args = {}
if DB_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create the SQLAlchemy engine
engine: Engine = create_engine(DB_URL, connect_args=connect_args, future=True)

# Configure session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session, future=True)

# Base class for models
Base = declarative_base()


# PUBLIC_INTERFACE
def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI routes to provide a database session.

    Yields:
        A SQLAlchemy Session bound to the configured engine.
    Ensures:
        Session is closed after request lifecycle.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session() -> Generator[Session, None, None]:
    """
    Context manager helper to use a DB session in scripts or background jobs.

    Example:
        with db_session() as db:
            # use db
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# PUBLIC_INTERFACE
def init_db(models_module: Optional[object] = None) -> None:
    """
    Initialize the database by creating all tables defined on Base metadata.

    Parameters:
        models_module: Optional module to import/ensure models are registered before creating tables.
                       If provided, this function will import/refresh it to ensure model metadata is loaded.

    Behavior:
        - Calls Base.metadata.create_all(bind=engine) which creates tables if they do not exist.
        - Safe to call multiple times; no-op for existing tables.
    """
    # If a models module is provided, ensure it is imported so model classes are registered to Base
    if models_module is not None:
        # No action needed other than referencing to avoid linter removing it
        _ = models_module

    # Create tables
    Base.metadata.create_all(bind=engine)
