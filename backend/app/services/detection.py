"""Recurring-issue detection & failed-fix intelligence.

Multi-signal scoring combines:
  - semantic similarity (token overlap as a lightweight local proxy; Hindsight
    recall provides the true semantic layer during the memory workflow)
  - geographic proximity (haversine distance)
  - category compatibility
  - temporal gap between reports
  - prior actions / outcomes

Officers must confirm proposed matches; nothing is auto-merged on wording alone.
"""
from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models import Complaint, IssueCluster, IssueClusterMembership, OfficerAction
from app.models.enums import ClusterStatus, ComplaintStatus, MembershipStatus, OutcomeStatus

# Configurable thresholds
GEO_MAX_METERS = 250.0          # complaints beyond this are unlikely the same physical issue
GEO_STRONG_METERS = 60.0
SEMANTIC_MIN = 0.18             # minimum token-overlap similarity to consider
MATCH_THRESHOLD = 0.55         # composite score to propose a cluster membership
STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "at", "in", "on", "of", "and",
    "to", "for", "near", "there", "this", "that", "it", "has", "have", "with",
    "again", "still", "not", "no", "been", "by", "from", "as", "be",
}


def _as_naive(dt):
    """Normalize to naive UTC so SQLite (naive) and Postgres (aware) both work."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def haversine_m(lat1, lng1, lat2, lng2) -> Optional[float]:
    if None in (lat1, lng1, lat2, lng2):
        return None
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def semantic_similarity(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union if union else 0.0


def _score_pair(new: Complaint, old: Complaint) -> tuple[float, dict[str, Any]]:
    """Composite match score with per-signal evidence."""
    evidence: dict[str, Any] = {}

    sem = semantic_similarity(
        f"{new.title} {new.description}", f"{old.title} {old.description}"
    )
    evidence["semantic_similarity"] = round(sem, 3)

    dist = haversine_m(new.latitude, new.longitude, old.latitude, old.longitude)
    evidence["distance_m"] = round(dist, 1) if dist is not None else None

    cat_match = new.category == old.category
    evidence["category_match"] = cat_match

    # temporal gap in days
    gap_days = None
    nc, oc = _as_naive(new.created_at), _as_naive(old.created_at)
    if nc and oc:
        gap_days = abs((nc - oc).days)
    evidence["gap_days"] = gap_days

    # Composite weighting
    score = 0.0
    if sem >= SEMANTIC_MIN:
        score += 0.45 * min(sem / 0.6, 1.0)

    if dist is not None:
        if dist <= GEO_STRONG_METERS:
            score += 0.35
        elif dist <= GEO_MAX_METERS:
            score += 0.35 * (1 - (dist - GEO_STRONG_METERS) / (GEO_MAX_METERS - GEO_STRONG_METERS))
        else:
            # far apart: strong penalty against grouping
            score -= 0.25
    # if no coords, neutral (rely on semantics + category)

    if cat_match:
        score += 0.20
    else:
        score -= 0.10

    # recurrence signal: old complaint was resolved but issue reappears
    if old.status in (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED):
        evidence["previously_resolved"] = True
        score += 0.05

    return max(0.0, min(score, 1.0)), evidence


def find_related_complaints(
    db: Session, complaint: Complaint, limit: int = 10
) -> list[dict[str, Any]]:
    """Return candidate related complaints with scores + evidence."""
    candidates = (
        db.query(Complaint)
        .filter(
            Complaint.id != complaint.id,
            or_(
                Complaint.category == complaint.category,
                Complaint.is_demo == complaint.is_demo,
            ),
        )
        .order_by(Complaint.created_at.desc())
        .limit(300)
        .all()
    )

    scored = []
    for old in candidates:
        score, evidence = _score_pair(complaint, old)
        if score >= SEMANTIC_MIN:
            scored.append({"complaint": old, "score": score, "evidence": evidence})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


def _next_cluster_code(db: Session) -> str:
    count = db.query(IssueCluster).count()
    return f"CL-{count + 1:04d}"


def detect_and_cluster(db: Session, complaint: Complaint) -> Optional[IssueCluster]:
    """Detect recurring pattern for a complaint and propose/update a cluster."""
    related = [r for r in find_related_complaints(db, complaint) if r["score"] >= MATCH_THRESHOLD]
    if not related:
        return None

    # Reuse an existing cluster if a strong match already belongs to one
    cluster: Optional[IssueCluster] = None
    for r in related:
        membership = (
            db.query(IssueClusterMembership)
            .filter_by(complaint_id=r["complaint"].id)
            .filter(IssueClusterMembership.status != MembershipStatus.REJECTED)
            .first()
        )
        if membership:
            cluster = db.get(IssueCluster, membership.cluster_id)
            break

    if cluster is None:
        cluster = IssueCluster(
            code=_next_cluster_code(db),
            title=f"Possible recurring issue: {complaint.title[:120]}",
            category=complaint.category,
            status=ClusterStatus.PROPOSED.value,
            center_lat=complaint.latitude,
            center_lng=complaint.longitude,
            locality=complaint.address,
            first_reported_at=complaint.created_at,
            last_reported_at=complaint.created_at,
            is_demo=complaint.is_demo,
        )
        db.add(cluster)
        db.commit()
        db.refresh(cluster)

    # Ensure the new complaint is a member
    _add_membership(db, cluster, complaint, score=1.0, evidence={"anchor": True})
    for r in related:
        _add_membership(db, cluster, r["complaint"], r["score"], r["evidence"])

    _recompute_cluster(db, cluster)
    return cluster


def _add_membership(
    db: Session,
    cluster: IssueCluster,
    complaint: Complaint,
    score: float,
    evidence: dict[str, Any],
) -> None:
    existing = (
        db.query(IssueClusterMembership)
        .filter_by(cluster_id=cluster.id, complaint_id=complaint.id)
        .first()
    )
    if existing:
        if existing.status != MembershipStatus.REJECTED:
            existing.match_score = max(existing.match_score or 0, score)
            existing.evidence = json.dumps(evidence)
        return
    db.add(
        IssueClusterMembership(
            cluster_id=cluster.id,
            complaint_id=complaint.id,
            status=MembershipStatus.PROPOSED.value,
            match_score=score,
            evidence=json.dumps(evidence),
        )
    )
    db.commit()


def _recompute_cluster(db: Session, cluster: IssueCluster) -> None:
    memberships = (
        db.query(IssueClusterMembership)
        .filter(
            IssueClusterMembership.cluster_id == cluster.id,
            IssueClusterMembership.status != MembershipStatus.REJECTED,
        )
        .all()
    )
    complaint_ids = [m.complaint_id for m in memberships]
    complaints = (
        db.query(Complaint).filter(Complaint.id.in_(complaint_ids)).all()
        if complaint_ids
        else []
    )
    cluster.recurrence_count = len(complaints)
    dates = [_as_naive(c.created_at) for c in complaints if c.created_at]
    if dates:
        cluster.first_reported_at = min(dates)
        cluster.last_reported_at = max(dates)
    lats = [c.latitude for c in complaints if c.latitude is not None]
    lngs = [c.longitude for c in complaints if c.longitude is not None]
    if lats and lngs:
        cluster.center_lat = sum(lats) / len(lats)
        cluster.center_lng = sum(lngs) / len(lngs)

    # Mark member complaints as recurring if cluster has >1 member
    if len(complaints) > 1:
        for c in complaints:
            c.is_recurring = True

    cluster.ai_explanation = (
        f"{len(complaints)} complaints appear related by location, category, and "
        f"description. This is a proposed grouping pending officer confirmation."
    )
    db.commit()


def analyze_failed_fix(db: Session, complaint: Complaint) -> Optional[dict[str, Any]]:
    """Detect a possible failed fix: prior resolved complaint nearby with similar issue."""
    related = find_related_complaints(db, complaint)
    for r in related:
        old: Complaint = r["complaint"]
        if old.status not in (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED):
            continue
        # find the repair action(s) on the old complaint
        repairs = (
            db.query(OfficerAction)
            .filter(
                OfficerAction.complaint_id == old.id,
                OfficerAction.action_type.in_(
                    ["temporary_repair", "permanent_repair", "cleaning", "maintenance"]
                ),
            )
            .order_by(OfficerAction.action_date.desc())
            .all()
        )
        if not repairs:
            continue
        last_repair = repairs[0]
        days_to_recurrence = None
        if complaint.created_at and last_repair.action_date:
            days_to_recurrence = (complaint.created_at - last_repair.action_date).days
        return {
            "previous_complaint_id": old.id,
            "previous_reference_id": old.reference_id,
            "previous_repair": last_repair.description,
            "repair_type": last_repair.action_type,
            "repair_date": last_repair.action_date.isoformat(),
            "days_to_recurrence": days_to_recurrence,
            "match_score": round(r["score"], 3),
            "evidence": r["evidence"],
            "note": (
                "Possible recurring issue: the earlier intervention may not have "
                "resolved the underlying cause. Officer confirmation required."
            ),
        }
    return None
