from typing import Optional

from sqlalchemy.orm import Session

from app.models import AuditLog


def log_action(
    db: Session,
    actor_id: Optional[str],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
    commit: bool = True,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(entry)
    if commit:
        db.commit()
    return entry
