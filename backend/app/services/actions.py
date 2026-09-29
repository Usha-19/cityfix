from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Complaint, OfficerAction, User
from app.models.enums import ActionType, NotificationType
from app.schemas.action import ActionCreate
from app.services.audit import log_action
from app.services.notifications import notify


def record_action(
    db: Session, complaint: Complaint, officer: User, data: ActionCreate
) -> OfficerAction:
    action = OfficerAction(
        complaint_id=complaint.id,
        officer_id=officer.id,
        action_type=data.action_type.value,
        action_date=data.action_date,
        description=data.description,
        assigned_team=data.assigned_team,
        materials_used=data.materials_used,
        completion_status=data.completion_status.value,
        observed_outcome=data.observed_outcome,
        outcome_status=data.outcome_status.value,
        outcome_confirmed=data.outcome_confirmed,
        follow_up_date=data.follow_up_date,
        officer_notes=data.officer_notes,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    ntype = NotificationType.INSPECTION_RECORDED
    if data.action_type in (ActionType.TEMPORARY_REPAIR, ActionType.PERMANENT_REPAIR):
        ntype = NotificationType.REPAIR_RECORDED
    notify(
        db,
        user_id=complaint.citizen_id,
        ntype=ntype,
        title=f"Update on complaint {complaint.reference_id}",
        body=f"An action was recorded: {data.action_type.value.replace('_', ' ')}.",
        complaint_id=complaint.id,
    )
    log_action(
        db, officer.id, "action.record", "officer_action", action.id,
        detail=f"{data.action_type.value} on {complaint.reference_id}",
    )
    return action
