"""
Shared test fixtures.
Uses a file-based SQLite database, cleaned (drop+recreate) before every test
so routes that call session.commit() don't corrupt subsequent tests.
"""

import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_centsyve.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", "")
os.environ.setdefault("ANTHROPIC_API_KEY", "")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from app.db.session import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.models.transaction import Transaction

TEST_DB_URL = "sqlite:///./test_centsyve.db"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})

# Enable FK enforcement in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(connection, _):
    connection.execute("PRAGMA foreign_keys=ON")

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create tables once for the whole test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def reset_tables():
    """Truncate all tables before every individual test for full isolation."""
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    yield


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    from main import app
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    user = User(email="test@example.com", password_hash=hash_password("password123"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_transactions(db, test_user):
    from datetime import date
    txs = [
        Transaction(user_id=test_user.id, type="income",  amount=3000.00, category="Salary",    merchant="Employer Inc",  date=date(2024, 1, 1)),
        Transaction(user_id=test_user.id, type="expense", amount=45.50,   category="Food",      merchant="Starbucks",     date=date(2024, 1, 5)),
        Transaction(user_id=test_user.id, type="expense", amount=120.00,  category="Shopping",  merchant="Amazon",        date=date(2024, 1, 10)),
        Transaction(user_id=test_user.id, type="expense", amount=60.00,   category="Transport", merchant="Shell",         date=date(2024, 1, 15)),
    ]
    for tx in txs:
        db.add(tx)
    db.commit()
    return txs
