from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Notification
from app.schemas.misc import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db), user=Depends(get_current_user), unread_only: bool = False
):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712
    items = q.order_by(Notification.created_at.desc()).limit(100).all()
    return [NotificationOut.model_validate(n) for n in items]


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    n.is_read = True
    db.commit()
    return {"detail": "read"}


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), user=Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"detail": "all read"}
