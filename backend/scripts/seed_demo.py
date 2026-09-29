"""Seed a realistic demo dataset demonstrating civic memory & recurrence.

Scenario:
  Issue A: pothole reported -> temporary repair -> resolved -> returns after rain.
  Issue B: water accumulation near park -> drain cleaning -> recurs -> blocked outlet.
  Issue C: garbage near market -> collection -> recurs on later dates.

All records are flagged is_demo=True and use fictional locations.
"""
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Complaint,
    ComplaintStatusHistory,
    Department,
    OfficerAction,
    User,
)
from app.models.enums import (
    ActionType,
    ComplaintCategory,
    ComplaintStatus,
    OutcomeStatus,
    Severity,
    UserRole,
)
from app.services import detection
from scripts.seed_admin import seed_admin

NOW = datetime.now(timezone.utc)


def _days_ago(n: int) -> datetime:
    return NOW - timedelta(days=n)


def _get_or_create_user(db, email, name, role, password="Demo1234!"):
    u = db.query(User).filter(User.email == email).first()
    if u:
        return u
    u = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=name,
        role=role.value,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _dept(db, name, categories, desc):
    d = db.query(Department).filter(Department.name == name).first()
    if d:
        return d
    d = Department(name=name, categories=categories, description=desc)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def _department_for_category(db, category_value):
    from app.models import Department
    for d in db.query(Department).all():
        if d.categories and category_value in [c.strip() for c in d.categories.split(",")]:
            return d
    return None


def _complaint(db, citizen, title, desc, category, lat, lng, address, status, days_ago, severity=Severity.MEDIUM):
    import secrets
    dept = _department_for_category(db, category.value)
    c = Complaint(
        reference_id=f"CP-DEMO-{secrets.token_hex(3).upper()}",
        title=title,
        description=desc,
        category=category.value,
        severity=severity.value,
        status=status.value,
        address=address,
        latitude=lat,
        longitude=lng,
        observed_at=_days_ago(days_ago),
        citizen_id=citizen.id,
        department_id=dept.id if dept else None,
        is_demo=True,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    # backdate created_at for realistic timelines
    c.created_at = _days_ago(days_ago)
    db.add(ComplaintStatusHistory(
        complaint_id=c.id, from_status=None, to_status=ComplaintStatus.NEW.value,
        note="Complaint submitted (demo)", changed_by_id=citizen.id,
    ))
    db.commit()
    return c


def _action(db, complaint, officer, atype, desc, days_ago, outcome=None, outcome_status=OutcomeStatus.UNKNOWN, confirmed=False):
    a = OfficerAction(
        complaint_id=complaint.id,
        officer_id=officer.id,
        action_type=atype.value,
        action_date=_days_ago(days_ago),
        description=desc,
        completion_status="completed",
        observed_outcome=outcome,
        outcome_status=outcome_status.value,
        outcome_confirmed=confirmed,
    )
    db.add(a)
    db.commit()
    return a


def seed_demo() -> None:
    seed_admin()
    db = SessionLocal()
    try:
        if db.query(Complaint).filter(Complaint.is_demo == True).first():  # noqa: E712
            print("Demo data already present. Run reset_demo to rebuild.")
            return

        citizen = _get_or_create_user(db, "citizen@demo.cityfix.app", "Asha Citizen", UserRole.CITIZEN)
        citizen2 = _get_or_create_user(db, "citizen2@demo.cityfix.app", "Ravi Resident", UserRole.CITIZEN)
        officer = _get_or_create_user(db, "officer@demo.cityfix.app", "Officer Mehta", UserRole.OFFICER)

        roads = _dept(db, "Roads & Infrastructure", "roads_potholes,electricity_infra,public_safety", "Roads, potholes, public infrastructure")
        sanitation = _dept(db, "Sanitation", "garbage_sanitation", "Garbage & sanitation")
        water = _dept(db, "Water & Drainage", "water_supply,drainage_flooding", "Water supply & drainage")

        # ── Issue A: pothole recurrence ──
        a1 = _complaint(
            db, citizen,
            "Large pothole at Maple Junction",
            "There is a deep pothole right at the Maple Junction crossing. Cars are swerving to avoid it.",
            ComplaintCategory.ROADS_POTHOLES, 28.6139, 77.2090, "Maple Junction, Fictional Nagar",
            ComplaintStatus.RESOLVED, days_ago=60, severity=Severity.HIGH,
        )
        _action(db, a1, officer, ActionType.TEMPORARY_REPAIR,
                "Filled the pothole with cold mix asphalt as a temporary measure.",
                days_ago=55, outcome="Pothole filled, surface levelled.",
                outcome_status=OutcomeStatus.IMPROVED, confirmed=True)
        db.add(ComplaintStatusHistory(complaint_id=a1.id, from_status="in_progress",
               to_status=ComplaintStatus.RESOLVED.value, note="Temporary repair completed", changed_by_id=officer.id))
        db.commit()

        a2 = _complaint(
            db, citizen2,
            "Road broken again near Maple crossing after rain",
            "After the heavy rain the road surface at the Maple crossing has caved in again. The patch did not hold.",
            ComplaintCategory.ROADS_POTHOLES, 28.6141, 77.2092, "Maple Junction, Fictional Nagar",
            ComplaintStatus.NEW, days_ago=8, severity=Severity.HIGH,
        )

        # ── Issue B: water accumulation near park ──
        b1 = _complaint(
            db, citizen,
            "Water logging near Green Park entrance",
            "Water keeps collecting near the Green Park gate. It doesn't drain for days.",
            ComplaintCategory.DRAINAGE_FLOODING, 28.6155, 77.2110, "Green Park Entrance, Fictional Nagar",
            ComplaintStatus.RESOLVED, days_ago=45,
        )
        _action(db, b1, officer, ActionType.CLEANING,
                "Cleaned the roadside drain and removed silt near the park gate.",
                days_ago=42, outcome="Drain cleared, water receded.",
                outcome_status=OutcomeStatus.IMPROVED, confirmed=True)
        db.add(ComplaintStatusHistory(complaint_id=b1.id, from_status="in_progress",
               to_status=ComplaintStatus.RESOLVED.value, note="Drain cleaned", changed_by_id=officer.id))
        db.commit()

        b2 = _complaint(
            db, citizen2,
            "Standing water returned at the park gate",
            "The flooding at the Green Park entrance is back. A neighbour thinks the outlet pipe is blocked further down.",
            ComplaintCategory.DRAINAGE_FLOODING, 28.6156, 77.2112, "Green Park Entrance, Fictional Nagar",
            ComplaintStatus.NEW, days_ago=5,
        )

        # ── Issue C: garbage near market ──
        c1 = _complaint(
            db, citizen,
            "Garbage pile at Central Market corner",
            "Trash is piling up at the corner of Central Market. Smells terrible.",
            ComplaintCategory.GARBAGE_SANITATION, 28.6180, 77.2050, "Central Market, Fictional Nagar",
            ComplaintStatus.RESOLVED, days_ago=30,
        )
        _action(db, c1, officer, ActionType.CLEANING,
                "Collected accumulated garbage and swept the corner.",
                days_ago=29, outcome="Garbage collected.",
                outcome_status=OutcomeStatus.IMPROVED, confirmed=True)
        c2 = _complaint(
            db, citizen2,
            "Rubbish dumped again at market corner",
            "Same spot near Central Market is full of rubbish again. This keeps happening every few weeks.",
            ComplaintCategory.GARBAGE_SANITATION, 28.6181, 77.2051, "Central Market, Fictional Nagar",
            ComplaintStatus.NEW, days_ago=3,
        )

        # ── Unrelated complaint (should NOT cluster) ──
        _complaint(
            db, citizen,
            "Streetlight not working on Elm Road",
            "The streetlight outside 14 Elm Road has been off for a week.",
            ComplaintCategory.STREETLIGHTS, 28.6300, 77.2300, "Elm Road, Fictional Nagar",
            ComplaintStatus.NEW, days_ago=4,
        )

        # Run detection on the recurring "new" complaints to build clusters
        for c in (a2, b2, c2):
            detection.detect_and_cluster(db, c)

        print("Demo data seeded successfully.")
        print("  Citizen: citizen@demo.cityfix.app / Demo1234!")
        print("  Officer: officer@demo.cityfix.app / Demo1234!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
