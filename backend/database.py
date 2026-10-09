"""
backend/database.py
SQLAlchemy Database Configuration and Session Management for SQLite.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "warehouse.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# For SQLite, check_same_thread=False is needed for multi-threaded access in FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for obtaining database sessions in FastAPI route handlers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
