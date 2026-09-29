"""Memory service tests with a mocked Hindsight client."""
import uuid
from types import SimpleNamespace

import pytest

from app.db.session import SessionLocal
from app.memory import service as mem
from app.models import Complaint, MemoryOperation, User
from app.models.enums import MemoryOpStatus


class FakeHindsight:
    """Minimal stand-in matching the used SDK surface."""

    def __init__(self):
        self.retained = []

    def create_bank(self, **kw):
        return SimpleNamespace(bank_id=kw.get("bank_id"))

    def retain(self, **kw):
        self.retained.append(kw)
        return SimpleNamespace(id="mem-1")

    def recall(self, **kw):
        return SimpleNamespace(
            results=[SimpleNamespace(text="Prior pothole complaint CP-1", type="observation", id="m1")]
        )

    def reflect(self, **kw):
        return SimpleNamespace(
            text="History shows a prior repair on CP-1 that may have failed.",
            based_on=["CP-1"],
            structured_output=None,
        )


def _make_complaint(db):
    from app.core.security import hash_password
    u = db.query(User).first()
    if not u:
        u = User(email=f"m_{uuid.uuid4().hex[:6]}@example.com", hashed_password=hash_password("x"),
                 full_name="M", role="citizen")
        db.add(u)
        db.commit()
    import secrets
    c = Complaint(
        reference_id=f"CP-M-{secrets.token_hex(3).upper()}",
        title="Pothole",
        description="Deep pothole at the junction",
        category="roads_potholes",
        severity="high",
        status="new",
        latitude=28.61,
        longitude=77.20,
        citizen_id=u.id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_remember_complaint_with_mock(monkeypatch):
    fake = FakeHindsight()
    monkeypatch.setattr(mem, "get_client", lambda: fake)
    monkeypatch.setattr(mem, "ensure_bank", lambda: True)
    db = SessionLocal()
    try:
        c = _make_complaint(db)
        op_id = mem.remember_complaint(db, c)
        assert op_id is not None
        assert len(fake.retained) == 1
        op = db.get(MemoryOperation, op_id)
        assert op.status == MemoryOpStatus.COMPLETED
        db.refresh(c)
        assert c.memory_synced is True
    finally:
        db.close()


def test_recall_related_with_mock(monkeypatch):
    fake = FakeHindsight()
    monkeypatch.setattr(mem, "get_client", lambda: fake)
    monkeypatch.setattr(mem, "ensure_bank", lambda: True)
    db = SessionLocal()
    try:
        c = _make_complaint(db)
        results = mem.recall_related_issues(db, c)
        assert len(results) == 1
        assert "CP-1" in results[0]["text"]
    finally:
        db.close()


def test_generate_brief_with_mock(monkeypatch):
    fake = FakeHindsight()
    monkeypatch.setattr(mem, "get_client", lambda: fake)
    monkeypatch.setattr(mem, "ensure_bank", lambda: True)
    db = SessionLocal()
    try:
        c = _make_complaint(db)
        brief = mem.generate_issue_brief(db, c)
        assert brief["degraded"] is False
        assert brief["based_on"] == ["CP-1"]
        assert brief["confidence"] == "grounded"
    finally:
        db.close()


def test_degraded_mode_when_no_client(monkeypatch):
    monkeypatch.setattr(mem, "get_client", lambda: None)
    db = SessionLocal()
    try:
        c = _make_complaint(db)
        op_id = mem.remember_complaint(db, c)
        op = db.get(MemoryOperation, op_id)
        assert op.status == MemoryOpStatus.SKIPPED  # not faked as success
        brief = mem.generate_issue_brief(db, c)
        assert brief["degraded"] is True
    finally:
        db.close()


def test_retry_resets_failed_ops(monkeypatch):
    db = SessionLocal()
    try:
        op = MemoryOperation(
            op_type="remember_complaint",
            status=MemoryOpStatus.FAILED,
            idempotency_key=f"retrytest:{uuid.uuid4().hex}",
            retry_count=1,
        )
        db.add(op)
        db.commit()
        count = mem.retry_failed_memory_operations(db)
        assert count >= 1
        db.refresh(op)
        assert op.status == MemoryOpStatus.PENDING
    finally:
        db.close()


@pytest.mark.integration
def test_live_hindsight_connection():
    """Only runs when a real HINDSIGHT_API_KEY is configured."""
    from app.core.config import settings

    if not settings.hindsight_enabled:
        pytest.skip("HINDSIGHT_API_KEY not configured; skipping live integration test")
    from app.memory.client import health_check

    healthy, detail = health_check()
    assert healthy, f"Hindsight health check failed: {detail}"

