import uuid

from tests.conftest import auth


def _make_citizen(client):
    email = f"c_{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Passw0rd!", "full_name": "Cit"},
    )
    return r.json()["access_token"]


def _submit(client, token, **overrides):
    payload = {
        "title": "Pothole on Main St",
        "description": "A large pothole has formed on Main Street near the bank.",
        "category": "roads_potholes",
        "address": "Main St",
        "latitude": 28.61,
        "longitude": 77.20,
        "severity": "high",
    }
    payload.update(overrides)
    return client.post("/api/complaints", json=payload, headers=auth(token))


def test_submit_complaint(client):
    token = _make_citizen(client)
    r = _submit(client, token)
    assert r.status_code == 201
    body = r.json()
    assert body["reference_id"].startswith("CP-")
    assert body["status"] == "new"


def test_complaint_ownership_enforced(client):
    t1 = _make_citizen(client)
    t2 = _make_citizen(client)
    cid = _submit(client, t1).json()["id"]
    # other citizen cannot view
    r = client.get(f"/api/complaints/{cid}", headers=auth(t2))
    assert r.status_code == 403


def test_memory_operation_queued_on_submit(client):
    """Submitting a complaint must enqueue a pending memory operation."""
    from app.db.session import SessionLocal
    from app.models import MemoryOperation

    token = _make_citizen(client)
    cid = _submit(client, token).json()["id"]
    db = SessionLocal()
    try:
        op = (
            db.query(MemoryOperation)
            .filter_by(complaint_id=cid, op_type="remember_complaint")
            .first()
        )
        assert op is not None
        assert op.status in ("pending", "processing", "completed", "skipped")
    finally:
        db.close()


def test_list_my_complaints_pagination(client):
    token = _make_citizen(client)
    for _ in range(3):
        _submit(client, token)
    r = client.get("/api/complaints/mine?page=1&page_size=2", headers=auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 3
    assert len(body["items"]) == 2


def test_officer_role_required(client):
    token = _make_citizen(client)
    r = client.get("/api/officer/complaints", headers=auth(token))
    assert r.status_code == 403

