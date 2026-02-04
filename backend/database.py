from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from .config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String, index=True)
    resource_type = Column(String, index=True)
    resource_id = Column(String)
    user = Column(String)
    details = Column(String)


class UserCache(Base):
    __tablename__ = "user_cache"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, index=True)
    display_name = Column(String)
    domain = Column(String, index=True)
    last_sign_in = Column(DateTime, nullable=True)
    account_enabled = Column(Integer)  # SQLite doesn't have boolean
    license_type = Column(String)
    cached_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
