from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Complaint, IssueCluster
from app.models.enums import UserRole

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/markers")
def markers(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    category: Optional[str] = None,
    status: Optional[str] = None,
):
    q = db.query(Complaint).filter(
        Complaint.latitude.isnot(None), Complaint.longitude.isnot(None)
    )
    # Citizens only see their own markers (privacy)
    if user.role == UserRole.CITIZEN.value:
        q = q.filter(Complaint.citizen_id == user.id)
    if category:
        q = q.filter(Complaint.category == category)
    if status:
        q = q.filter(Complaint.status == status)

    complaints = q.limit(1000).all()
    marker_list = [
        {
            "id": c.id,
            "reference_id": c.reference_id,
            "title": c.title,
            "category": c.category,
            "severity": c.severity,
            "status": c.status,
            "is_recurring": c.is_recurring,
            "lat": c.latitude,
            "lng": c.longitude,
            "address": c.address,
        }
        for c in complaints
    ]

    clusters = []
    if user.role in (UserRole.OFFICER.value, UserRole.ADMIN.value):
        for cl in db.query(IssueCluster).filter(IssueCluster.center_lat.isnot(None)).all():
            clusters.append(
                {
                    "id": cl.id,
                    "code": cl.code,
                    "title": cl.title,
                    "category": cl.category,
                    "status": cl.status,
                    "lat": cl.center_lat,
                    "lng": cl.center_lng,
                    "count": cl.recurrence_count,
                }
            )
    return {"markers": marker_list, "clusters": clusters}
