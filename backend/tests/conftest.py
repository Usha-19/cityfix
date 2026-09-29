import os
import tempfile

import pytest

# Use an isolated temp SQLite DB for tests before importing app modules.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ["JWT_SECRET"] = "test-secret-key-for-tests-only-1234567890"
os.environ["HINDSIGHT_API_KEY"] = ""  # degraded/mocked by default
os.environ["RUN_INLINE_WORKER"] = "false"
os.environ["ADMIN_SEED_EMAIL"] = "admin@example.com"
os.environ["ADMIN_SEED_PASSWORD"] = "AdminPass!123"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
get_settings.cache_clear()

from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import models  # noqa: F401,E402


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


def _register(client, email, password="Passw0rd!", name="Test User"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": name},
    )


@pytest.fixture
def citizen_token(client):
    import uuid
    email = f"citizen_{uuid.uuid4().hex[:8]}@example.com"
    r = _register(client, email)
    return r.json()["access_token"], email


def auth(token):
    return {"Authorization": f"Bearer {token}"}

