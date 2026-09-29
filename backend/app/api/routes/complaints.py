from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.memory import service as mem
from app.models import (
    CitizenFeedback,
    Complaint,
    ComplaintAttachment,
    ComplaintComment,
    IssueClusterMembership,
    MemoryOperation,
)
from app.models.enums import (
    ComplaintStatus,
    MemoryOpStatus,
    MemoryOpType,
    UserRole,
)
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintDetail,
    ComplaintListItem,
    FeedbackCreate,
    PaginatedComplaints,
)
from app.services import storage
from app.services.complaints import create_complaint

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


def _authorize_view(complaint: Complaint, user) -> None:
    if user.role in (UserRole.OFFICER.value, UserRole.ADMIN.value):
        return
    if complaint.citizen_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")


@router.post("", response_model=ComplaintDetail, status_code=201)
def submit_complaint(
    data: ComplaintCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    complaint = create_complaint(db, user, data)
    # Enqueue memory operation (non-blocking to the citizen)
    db.add(
        MemoryOperation(
            op_type=MemoryOpType.REMEMBER_COMPLAINT.value,
            status=MemoryOpStatus.PENDING.value,
            idempotency_key=f"queue_remember:{complaint.id}",
            complaint_id=complaint.id,
        )
    )
    db.commit()
    db.refresh(complaint)
    return ComplaintDetail.model_validate(complaint)


@router.post("/{complaint_id}/attachments", response_model=ComplaintDetail)
async def upload_attachment(
    complaint_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    _authorize_view(complaint, user)
    saved = await storage.save_upload(file, subdir="complaints")
    db.add(ComplaintAttachment(complaint_id=complaint.id, **saved))
    db.commit()
    db.refresh(complaint)
    return ComplaintDetail.model_validate(complaint)


@router.get("/mine", response_model=PaginatedComplaints)
def my_complaints(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    search: Optional[str] = None,
    status_filter: Optional[ComplaintStatus] = Query(default=None, alias="status"),
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "created_desc",
):
    q = db.query(Complaint).filter(Complaint.citizen_id == user.id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Complaint.title.ilike(like), Complaint.description.ilike(like)))
    if status_filter:
        q = q.filter(Complaint.status == status_filter.value)
    if category:
        q = q.filter(Complaint.category == category)

    total = q.count()
    order = desc(Complaint.created_at) if sort == "created_desc" else Complaint.created_at
    items = q.order_by(order).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedComplaints(
        items=[ComplaintListItem.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{complaint_id}", response_model=ComplaintDetail)
def complaint_detail(
    complaint_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    _authorize_view(complaint, user)
    detail = ComplaintDetail.model_validate(complaint)
    # citizens only see citizen-visible status history
    if user.role == UserRole.CITIZEN.value:
        detail.status_history = [
            s for s in detail.status_history
            if next(
                (h.visible_to_citizen for h in complaint.status_history if h.id == s.id),
                True,
            )
        ]
    return detail


@router.get("/{complaint_id}/related", response_model=list[ComplaintListItem])
def related_complaints(
    complaint_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    _authorize_view(complaint, user)
    # confirmed cluster members only for citizens
    memberships = (
        db.query(IssueClusterMembership)
        .filter(IssueClusterMembership.complaint_id == complaint.id)
        .all()
    )
    related_ids: set[str] = set()
    for m in memberships:
        others = (
            db.query(IssueClusterMembership)
            .filter(
                IssueClusterMembership.cluster_id == m.cluster_id,
                IssueClusterMembership.complaint_id != complaint.id,
            )
            .all()
        )
        related_ids.update(o.complaint_id for o in others)
    if not related_ids:
        return []
    complaints = db.query(Complaint).filter(Complaint.id.in_(related_ids)).all()
    return [ComplaintListItem.model_validate(c) for c in complaints]


@router.post("/{complaint_id}/feedback", response_model=ComplaintDetail)
def submit_feedback(
    complaint_id: str,
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.citizen_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.add(
        CitizenFeedback(
            complaint_id=complaint.id,
            citizen_id=user.id,
            rating=data.rating,
            still_unresolved=data.still_unresolved,
            comment=data.comment,
        )
    )
    # If citizen says still unresolved on a resolved complaint, reopen it
    if data.still_unresolved and complaint.status == ComplaintStatus.RESOLVED.value:
        complaint.status = ComplaintStatus.REOPENED.value
    db.commit()
    db.refresh(complaint)
    return ComplaintDetail.model_validate(complaint)
