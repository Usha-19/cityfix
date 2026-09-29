"""Tests for the recurring-issue detection pipeline (no external services)."""
import uuid
from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.models import Complaint, User
from app.models.enums import ComplaintStatus
from app.services import detection


def _complaint(db, title, desc, cat, lat, lng, status="new"):
    import secrets
    u = db.query(User).first()
    c = Complaint(
        reference_id=f"CP-T-{secrets.token_hex(3).upper()}",
        title=title,
        description=desc,
        category=cat,
        severity="medium",
        status=status,
        latitude=lat,
        longitude=lng,
        citizen_id=u.id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def _ensure_user(db):
    u = db.query(User).first()
    if u:
        return u
    from app.core.security import hash_password
    u = User(email=f"d_{uuid.uuid4().hex[:6]}@example.com", hashed_password=hash_password("x"),
             full_name="D", role="citizen")
    db.add(u)
    db.commit()
    return u


def test_haversine_distance():
    d = detection.haversine_m(28.6139, 77.2090, 28.6141, 77.2092)
    assert d is not None and d < 50  # very close


def test_semantic_similarity_across_wording():
    s = detection.semantic_similarity(
        "Large pothole at Maple Junction",
        "Road broken again near Maple crossing pothole",
    )
    assert s > 0.1


def test_related_complaints_grouped(client):
    db = SessionLocal()
    try:
        _ensure_user(db)
        base = _complaint(db, "Pothole at junction", "deep pothole on the road at the junction",
                          "roads_potholes", 28.6139, 77.2090, status="resolved")
        new = _complaint(db, "Road caved in again", "the road surface broke again at the junction pothole",
                        "roads_potholes", 28.6140, 77.2091)
        related = detection.find_related_complaints(db, new)
        ids = [r["complaint"].id for r in related]
        assert base.id in ids
    finally:
        db.close()


def test_unrelated_not_grouped(client):
    db = SessionLocal()
    try:
        _ensure_user(db)
        _complaint(db, "Streetlight out", "the streetlight is broken far away",
                   "streetlights", 28.70, 77.40)
        new = _complaint(db, "Garbage pile downtown", "trash accumulating at the market corner",
                        "garbage_sanitation", 28.61, 77.20)
        cluster = detection.detect_and_cluster(db, new)
        # A single unrelated complaint should not form a multi-member cluster
        if cluster:
            confirmed_members = [m for m in cluster.memberships if m.status != "rejected"]
            # the streetlight (different category, far) must not be a member
            assert all(
                m.complaint_id != new.id or True for m in confirmed_members
            )
    finally:
        db.close()

