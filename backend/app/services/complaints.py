from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    Complaint,
    ComplaintStatusHistory,
    Department,
    User,
)
from app.models.enums import ComplaintStatus, NotificationType
from app.schemas.complaint import ComplaintCreate
from app.services.audit import log_action
from app.services.notifications import notify


def generate_reference_id() -> str:
    year = datetime.now(timezone.utc).year
    suffix = secrets.token_hex(3).upper()
    return f"CP-{year}-{suffix}"


def _department_for_category(db: Session, category: str) -> Optional[Department]:
    depts = db.query(Department).all()
    for d in depts:
        if d.categories and category in [c.strip() for c in d.categories.split(",")]:
            return d
    return None


def create_complaint(
    db: Session, citizen: User, data: ComplaintCreate, is_demo: bool = False
) -> Complaint:
    dept = _department_for_category(db, data.category.value)
    complaint = Complaint(
        reference_id=generate_reference_id(),
        title=data.title,
        description=data.description,
        category=data.category.value,
        severity=data.severity.value,
        status=ComplaintStatus.NEW.value,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        observed_at=data.observed_at,
        extra_notes=data.extra_notes,
        citizen_id=citizen.id,
        department_id=dept.id if dept else None,
        is_demo=is_demo,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    db.add(
        ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=None,
            to_status=ComplaintStatus.NEW.value,
            note="Complaint submitted",
            changed_by_id=citizen.id,
        )
    )
    db.commit()

    notify(
        db,
        user_id=citizen.id,
        ntype=NotificationType.COMPLAINT_RECEIVED,
        title="Complaint received",
        body=f"Your complaint {complaint.reference_id} has been received.",
        complaint_id=complaint.id,
    )
    log_action(
        db, citizen.id, "complaint.create", "complaint", complaint.id,
        detail=complaint.reference_id,
    )
    return complaint


def change_status(
    db: Session,
    complaint: Complaint,
    to_status: ComplaintStatus,
    actor: User,
    note: Optional[str] = None,
    visible_to_citizen: bool = True,
) -> Complaint:
    from_status = complaint.status
    complaint.status = to_status.value
    db.add(
        ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=from_status,
            to_status=to_status.value,
            note=note,
            changed_by_id=actor.id,
            visible_to_citizen=visible_to_citizen,
        )
    )
    db.commit()

    ntype = NotificationType.STATUS_CHANGED
    if to_status == ComplaintStatus.RESOLVED:
        ntype = NotificationType.RESOLVED
    notify(
        db,
        user_id=complaint.citizen_id,
        ntype=ntype,
        title=f"Complaint {complaint.reference_id} status: {to_status.value}",
        body=note if visible_to_citizen else None,
        complaint_id=complaint.id,
    )
    log_action(
        db, actor.id, "complaint.status_change", "complaint", complaint.id,
        detail=f"{from_status} -> {to_status.value}",
    )
    return complaint


def assign_complaint(
    db: Session,
    complaint: Complaint,
    actor: User,
    department_id: Optional[str] = None,
    officer_id: Optional[str] = None,
) -> Complaint:
    if department_id:
        complaint.department_id = department_id
    if officer_id:
        complaint.assigned_officer_id = officer_id
    if complaint.status == ComplaintStatus.NEW.value:
        complaint.status = ComplaintStatus.ASSIGNED.value
        db.add(
            ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=ComplaintStatus.NEW.value,
                to_status=ComplaintStatus.ASSIGNED.value,
                note="Assigned",
                changed_by_id=actor.id,
            )
        )
    db.commit()
    notify(
        db,
        user_id=complaint.citizen_id,
        ntype=NotificationType.COMPLAINT_ASSIGNED,
        title=f"Complaint {complaint.reference_id} assigned",
        complaint_id=complaint.id,
    )
    if officer_id:
        notify(
            db,
            user_id=officer_id,
            ntype=NotificationType.COMPLAINT_ASSIGNED,
            title=f"Complaint {complaint.reference_id} assigned to you",
            complaint_id=complaint.id,
        )
    log_action(db, actor.id, "complaint.assign", "complaint", complaint.id)
    return complaint
