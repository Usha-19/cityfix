import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.api.deps import require_officer
from app.db.session import get_db
from app.memory import service as mem
from app.models import (
    Complaint,
    IssueCluster,
    IssueClusterMembership,
    OfficerAction,
)
from app.models.enums import (
    ClusterStatus,
    ComplaintStatus,
    MembershipStatus,
    OutcomeStatus,
)
from app.schemas.action import ActionCreate, ActionOut
from app.schemas.cluster import (
    ClusterDetail,
    ClusterMemberOut,
    ClusterOut,
    MatchDecision,
    RootCauseUpdate,
)
from app.schemas.complaint import (
    AssignRequest,
    ComplaintDetail,
    ComplaintListItem,
    PaginatedComplaints,
    StatusChangeRequest,
)
from app.schemas.misc import IssueBrief
from app.services import detection
from app.services.actions import record_action
from app.services.audit import log_action
from app.services.complaints import assign_complaint, change_status

router = APIRouter(prefix="/api/officer", tags=["officer"])


@router.get("/complaints", response_model=PaginatedComplaints)
def list_complaints(
    db: Session = Depends(get_db),
    officer=Depends(require_officer),
    search: Optional[str] = None,
    status_filter: Optional[ComplaintStatus] = Query(default=None, alias="status"),
    category: Optional[str] = None,
    department_id: Optional[str] = None,
    recurring: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "created_desc",
):
    q = db.query(Complaint)
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                Complaint.title.ilike(like),
                Complaint.description.ilike(like),
                Complaint.reference_id.ilike(like),
                Complaint.address.ilike(like),
            )
        )
    if status_filter:
        q = q.filter(Complaint.status == status_filter.value)
    if category:
        q = q.filter(Complaint.category == category)
    if department_id:
        q = q.filter(Complaint.department_id == department_id)
    if recurring is not None:
        q = q.filter(Complaint.is_recurring == recurring)

    total = q.count()
    order = desc(Complaint.created_at) if sort == "created_desc" else Complaint.created_at
    items = q.order_by(order).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedComplaints(
        items=[ComplaintListItem.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), officer=Depends(require_officer)):
    def count(**kw):
        q = db.query(Complaint)
        for k, v in kw.items():
            q = q.filter(getattr(Complaint, k) == v)
        return q.count()

    by_category = dict(
        db.query(Complaint.category, func.count()).group_by(Complaint.category).all()
    )
    by_status = dict(
        db.query(Complaint.status, func.count()).group_by(Complaint.status).all()
    )
    return {
        "total": db.query(Complaint).count(),
        "new": count(status=ComplaintStatus.NEW.value),
        "assigned": count(status=ComplaintStatus.ASSIGNED.value),
        "in_progress": count(status=ComplaintStatus.IN_PROGRESS.value),
        "resolved": count(status=ComplaintStatus.RESOLVED.value),
        "reopened": count(status=ComplaintStatus.REOPENED.value),
        "recurring": db.query(Complaint).filter(Complaint.is_recurring == True).count(),  # noqa: E712
        "clusters": db.query(IssueCluster).count(),
        "by_category": by_category,
        "by_status": by_status,
    }


@router.get("/complaints/{complaint_id}/investigation")
def investigation(
    complaint_id: str, db: Session = Depends(get_db), officer=Depends(require_officer)
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    related = detection.find_related_complaints(db, complaint)
    related_out = [
        {
            "complaint": ComplaintListItem.model_validate(r["complaint"]).model_dump(),
            "score": round(r["score"], 3),
            "evidence": r["evidence"],
        }
        for r in related
    ]

    # civic memory timeline: status history + actions across the complaint
    timeline = []
    for h in sorted(complaint.status_history, key=lambda x: x.created_at):
        timeline.append(
            {"type": "status", "at": h.created_at.isoformat(), "detail": f"{h.from_status or 'new'} -> {h.to_status}", "note": h.note}
        )
    for a in sorted(complaint.actions, key=lambda x: x.action_date):
        timeline.append(
            {"type": "action", "at": a.action_date.isoformat(), "detail": a.action_type, "note": a.description, "outcome": a.observed_outcome}
        )
    timeline.sort(key=lambda x: x["at"])

    failed_fix = detection.analyze_failed_fix(db, complaint)

    return {
        "complaint": ComplaintDetail.model_validate(complaint).model_dump(),
        "related": related_out,
        "timeline": timeline,
        "failed_fix": failed_fix,
    }


@router.get("/complaints/{complaint_id}/brief", response_model=IssueBrief)
def generate_brief(
    complaint_id: str, db: Session = Depends(get_db), officer=Depends(require_officer)
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    raw = mem.generate_issue_brief(db, complaint)

    # Build grounded evidence from actual DB records + detection
    evidence = []
    related = detection.find_related_complaints(db, complaint)
    for r in related[:8]:
        c = r["complaint"]
        evidence.append({
            "complaint_id": c.id,
            "reference_id": c.reference_id,
            "date": c.created_at.isoformat() if c.created_at else None,
            "summary": f"{c.title} ({c.status}) — match {round(r['score'], 2)}",
            "kind": "record",
        })

    prev_actions, outcomes = [], []
    member_complaint_ids = {r["complaint"].id for r in related} | {complaint.id}
    actions = (
        db.query(OfficerAction)
        .filter(OfficerAction.complaint_id.in_(member_complaint_ids))
        .order_by(OfficerAction.action_date)
        .all()
    )
    for a in actions:
        prev_actions.append(f"{a.action_type} on {a.action_date.date().isoformat()}: {a.description[:160]}")
        if a.observed_outcome:
            outcomes.append(f"[{a.outcome_status}] {a.observed_outcome[:160]}")

    pattern = None
    ff = detection.analyze_failed_fix(db, complaint)
    if ff:
        pattern = (
            f"Possible recurrence of {ff['previous_reference_id']} "
            f"({ff.get('days_to_recurrence')} days after a {ff['repair_type']}). "
            "The earlier intervention may not have addressed the root cause."
        )

    return IssueBrief(
        complaint_id=complaint.id,
        current_summary=raw.get("current_summary", complaint.title),
        historical_incidents=raw.get("historical_incidents", []),
        previous_actions=prev_actions,
        recorded_outcomes=outcomes,
        possible_recurring_pattern=pattern,
        supporting_evidence=evidence,
        recommended_investigation=raw.get("recommended_investigation") or [
            "Verify on-site whether the reported issue matches the recalled history.",
            "Confirm or reject proposed cluster memberships.",
        ],
        uncertainties=raw.get("uncertainties", []),
        confidence=raw.get("confidence", "unknown"),
        grounded=bool(evidence) or not raw.get("degraded", False),
        degraded=raw.get("degraded", False),
        generated_at=datetime.now(timezone.utc),
    )


@router.post("/complaints/{complaint_id}/status", response_model=ComplaintDetail)
def update_status(
    complaint_id: str,
    data: StatusChangeRequest,
    db: Session = Depends(get_db),
    officer=Depends(require_officer),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    change_status(db, complaint, data.to_status, officer, data.note, data.visible_to_citizen)
    db.refresh(complaint)
    return ComplaintDetail.model_validate(complaint)


@router.post("/complaints/{complaint_id}/assign", response_model=ComplaintDetail)
def assign(
    complaint_id: str,
    data: AssignRequest,
    db: Session = Depends(get_db),
    officer=Depends(require_officer),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    assign_complaint(db, complaint, officer, data.department_id, data.officer_id)
    db.refresh(complaint)
    return ComplaintDetail.model_validate(complaint)


@router.post("/complaints/{complaint_id}/actions", response_model=ActionOut, status_code=201)
def create_action(
    complaint_id: str,
    data: ActionCreate,
    db: Session = Depends(get_db),
    officer=Depends(require_officer),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    action = record_action(db, complaint, officer, data)

    # Trigger memory: remember action + outcome (best effort, does not block)
    mem.remember_officer_action(db, action, complaint)
    if data.observed_outcome:
        mem.remember_resolution_outcome(
            db, complaint, data.observed_outcome, data.outcome_confirmed
        )
    # Move complaint to in_progress if it was new/assigned
    if complaint.status in (ComplaintStatus.NEW.value, ComplaintStatus.ASSIGNED.value):
        change_status(db, complaint, ComplaintStatus.IN_PROGRESS, officer, "Action recorded")
    db.refresh(action)
    return ActionOut.model_validate(action)


@router.get("/complaints/{complaint_id}/actions", response_model=list[ActionOut])
def list_actions(
    complaint_id: str, db: Session = Depends(get_db), officer=Depends(require_officer)
):
    actions = (
        db.query(OfficerAction)
        .filter(OfficerAction.complaint_id == complaint_id)
        .order_by(OfficerAction.action_date.desc())
        .all()
    )
    return [ActionOut.model_validate(a) for a in actions]


# ────────── recurring issue clusters ──────────

@router.get("/clusters", response_model=list[ClusterOut])
def list_clusters(db: Session = Depends(get_db), officer=Depends(require_officer)):
    clusters = db.query(IssueCluster).order_by(IssueCluster.last_reported_at.desc()).all()
    return [ClusterOut.model_validate(c) for c in clusters]


def _readable_evidence(evidence_json: str | None) -> str | None:
    """Turn the stored evidence JSON into a short human-readable summary."""
    if not evidence_json:
        return None
    try:
        e = json.loads(evidence_json)
    except (ValueError, TypeError):
        return None
    if e.get("anchor"):
        return "Original complaint in this cluster."
    parts = []
    if e.get("semantic_similarity") is not None:
        parts.append(f"{round(float(e['semantic_similarity']) * 100)}% description match")
    if e.get("distance_m") is not None:
        parts.append(f"{round(float(e['distance_m']))} m away")
    if e.get("category_match"):
        parts.append("same category")
    if e.get("gap_days") is not None:
        parts.append(f"{e['gap_days']} days apart")
    if e.get("previously_resolved"):
        parts.append("previously marked resolved")
    return " · ".join(parts) if parts else None


def _member_out(db: Session, m: IssueClusterMembership) -> ClusterMemberOut:
    out = ClusterMemberOut.model_validate(m)
    complaint = db.get(Complaint, m.complaint_id)
    if complaint:
        out.complaint_title = complaint.title
        out.complaint_reference = complaint.reference_id
    out.evidence_summary = _readable_evidence(m.evidence)
    return out


@router.get("/clusters/{cluster_id}", response_model=ClusterDetail)
def cluster_detail(
    cluster_id: str, db: Session = Depends(get_db), officer=Depends(require_officer)
):
    cluster = db.get(IssueCluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    detail = ClusterDetail.model_validate(cluster)
    detail.members = [_member_out(db, m) for m in cluster.memberships]
    return detail


@router.post("/clusters/{cluster_id}/decide", response_model=ClusterDetail)
def decide_match(
    cluster_id: str,
    data: MatchDecision,
    db: Session = Depends(get_db),
    officer=Depends(require_officer),
):
    membership = db.get(IssueClusterMembership, data.membership_id)
    if not membership or membership.cluster_id != cluster_id:
        raise HTTPException(status_code=404, detail="Membership not found")
    membership.status = (
        MembershipStatus.CONFIRMED.value if data.accept else MembershipStatus.REJECTED.value
    )
    membership.confirmed_by_id = officer.id
    db.commit()
    log_action(db, officer.id, "cluster.decide", "cluster_membership", membership.id,
               detail="accept" if data.accept else "reject")
    cluster = db.get(IssueCluster, cluster_id)
    detection._recompute_cluster(db, cluster)
    db.refresh(cluster)
    detail = ClusterDetail.model_validate(cluster)
    detail.members = [_member_out(db, m) for m in cluster.memberships]
    return detail


@router.post("/clusters/{cluster_id}/status")
def set_cluster_status(
    cluster_id: str,
    status_value: ClusterStatus,
    db: Session = Depends(get_db),
    officer=Depends(require_officer),
):
    cluster = db.get(IssueCluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    cluster.status = status_value.value
    db.commit()
    return {"detail": "updated", "status": cluster.status}


@router.post("/clusters/{cluster_id}/root-cause", response_model=ClusterDetail)
def update_root_cause(
    cluster_id: str,
    data: RootCauseUpdate,
    db: Session = Depends(get_db),
    officer=Depends(require_officer),
):
    cluster = db.get(IssueCluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    if data.root_cause_hypothesis is not None:
        cluster.root_cause_hypothesis = data.root_cause_hypothesis
    if data.verified_cause is not None:
        cluster.verified_cause = data.verified_cause
    db.commit()
    db.refresh(cluster)
    detail = ClusterDetail.model_validate(cluster)
    detail.members = [_member_out(db, m) for m in cluster.memberships]
    return detail
