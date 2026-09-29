from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Complaint, IssueCluster, OfficerAction
from app.models.enums import ComplaintStatus

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/scenario")
def demo_scenario(db: Session = Depends(get_db)):
    """Public read-only snapshot of the seeded demo scenario for the landing/demo page."""
    complaints = (
        db.query(Complaint)
        .filter(Complaint.is_demo == True)  # noqa: E712
        .order_by(Complaint.created_at)
        .all()
    )
    clusters = db.query(IssueCluster).filter(IssueCluster.is_demo == True).all()  # noqa: E712

    return {
        "stats": {
            "complaints": len(complaints),
            "resolved": sum(1 for c in complaints if c.status == ComplaintStatus.RESOLVED.value),
            "recurring": sum(1 for c in complaints if c.is_recurring),
            "clusters": len(clusters),
        },
        "complaints": [
            {
                "id": c.id,
                "reference_id": c.reference_id,
                "title": c.title,
                "description": c.description,
                "category": c.category,
                "status": c.status,
                "is_recurring": c.is_recurring,
                "address": c.address,
                "lat": c.latitude,
                "lng": c.longitude,
                "created_at": c.created_at.isoformat(),
                "actions": [
                    {
                        "type": a.action_type,
                        "date": a.action_date.isoformat(),
                        "description": a.description,
                        "outcome": a.observed_outcome,
                        "outcome_status": a.outcome_status,
                    }
                    for a in sorted(c.actions, key=lambda x: x.action_date)
                ],
            }
            for c in complaints
        ],
        "clusters": [
            {
                "id": cl.id,
                "code": cl.code,
                "title": cl.title,
                "status": cl.status,
                "recurrence_count": cl.recurrence_count,
                "ai_explanation": cl.ai_explanation,
            }
            for cl in clusters
        ],
    }
