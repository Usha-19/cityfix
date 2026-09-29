from typing import Optional

from sqlalchemy.orm import Session

from app.models import Notification
from app.models.enums import NotificationType


def notify(
    db: Session,
    user_id: str,
    ntype: NotificationType,
    title: str,
    body: Optional[str] = None,
    complaint_id: Optional[str] = None,
    commit: bool = True,
) -> Notification:
    n = Notification(
        user_id=user_id,
        type=ntype.value,
        title=title,
        body=body,
        complaint_id=complaint_id,
    )
    db.add(n)
    if commit:
        db.commit()
    return n
