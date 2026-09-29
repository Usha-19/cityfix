"""CityMemoryService – application-level wrapper for Hindsight.

Each public method maps cleanly to the supported SDK:
  retain(bank_id, content, context, metadata)
  recall(bank_id, query, budget, max_tokens, types, include_entities)
  reflect(bank_id, query, context, budget)

The service never invents API methods that don't exist.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.memory.client import ensure_bank, get_client, health_check
from app.models import Complaint, MemoryOperation, OfficerAction
from app.models.enums import MemoryOpStatus, MemoryOpType

logger = logging.getLogger("cityfix.memory")

BANK = settings.hindsight_memory_bank


# ────────────────────────── helpers ──────────────────────────

def _complaint_memory_text(c: Complaint) -> str:
    """Structured text representation of a complaint for retain."""
    parts = [
        f"Civic complaint {c.reference_id} ({c.category}, {c.severity}).",
        f"Title: {c.title}",
        f"Description: {c.description}",
    ]
    if c.address:
        parts.append(f"Location: {c.address}")
    if c.latitude and c.longitude:
        parts.append(f"Coordinates: {c.latitude}, {c.longitude}")
    if c.observed_at:
        parts.append(f"Observed: {c.observed_at.isoformat()}")
    parts.append(f"Status: {c.status}")
    return " | ".join(parts)


def _action_memory_text(a: OfficerAction, complaint_ref: str) -> str:
    parts = [
        f"Officer action on complaint {complaint_ref}.",
        f"Type: {a.action_type}",
        f"Date: {a.action_date.isoformat()}",
        f"Description: {a.description}",
        f"Completion: {a.completion_status}",
    ]
    if a.observed_outcome:
        parts.append(f"Outcome: {a.observed_outcome} ({a.outcome_status})")
    if a.outcome_confirmed:
        parts.append("Outcome confirmed by officer.")
    return " | ".join(parts)


def _meta(complaint: Complaint) -> dict[str, str]:
    # Hindsight metadata values must be strings.
    m: dict[str, str] = {
        "complaint_id": str(complaint.id),
        "reference_id": str(complaint.reference_id),
        "category": str(complaint.category),
    }
    if complaint.latitude is not None:
        m["lat"] = str(complaint.latitude)
    if complaint.longitude is not None:
        m["lng"] = str(complaint.longitude)
    return m


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ────────────────────────── public service methods ──────────────────────────

def remember_complaint(db: Session, complaint: Complaint) -> Optional[str]:
    """Retain a new complaint as memory. Returns the memory operation ID or None."""
    client = get_client()
    if client is None:
        return _skip_op(db, MemoryOpType.REMEMBER_COMPLAINT, complaint)

    ensure_bank()
    idem_key = f"remember_complaint:{complaint.id}"

    # Guard against duplicate writes
    existing = db.query(MemoryOperation).filter_by(idempotency_key=idem_key).first()
    if existing and existing.status in (MemoryOpStatus.COMPLETED, MemoryOpStatus.PROCESSING):
        return existing.id

    op = _upsert_op(db, idem_key, MemoryOpType.REMEMBER_COMPLAINT, complaint.id)
    try:
        op.status = MemoryOpStatus.PROCESSING
        db.commit()

        client.retain(
            bank_id=BANK,
            content=_complaint_memory_text(complaint),
            context=f"New civic complaint submitted on {_now().date().isoformat()}",
            metadata=_meta(complaint),
        )
        op.status = MemoryOpStatus.COMPLETED
        op.processed_at = _now()
        complaint.memory_synced = True
        db.commit()
        return op.id

    except Exception as exc:
        logger.error("remember_complaint failed: %s", exc)
        op.status = MemoryOpStatus.FAILED
        op.last_error = str(exc)[:2000]
        op.retry_count += 1
        db.commit()
        return op.id


def recall_related_issues(
    db: Session, complaint: Complaint
) -> list[dict[str, Any]]:
    """Use Hindsight recall to find related past complaints/actions."""
    client = get_client()
    if client is None:
        return []

    ensure_bank()
    query_parts = [complaint.title, complaint.description[:500]]
    if complaint.address:
        query_parts.append(complaint.address)
    query = " | ".join(query_parts)

    idem_key = f"recall_related:{complaint.id}"
    op = _upsert_op(db, idem_key, MemoryOpType.RECALL_RELATED, complaint.id)
    try:
        op.status = MemoryOpStatus.PROCESSING
        db.commit()

        result = client.recall(
            bank_id=BANK,
            query=query,
            budget="mid",
            max_tokens=4096,
            include_entities=True,
        )

        recalled: list[dict[str, Any]] = []
        for mem in result.results:
            recalled.append({
                "text": mem.text if hasattr(mem, "text") else str(mem),
                "type": mem.type if hasattr(mem, "type") else "unknown",
            })

        op.status = MemoryOpStatus.COMPLETED
        op.result = json.dumps(recalled)[:10000]
        op.processed_at = _now()
        db.commit()
        return recalled

    except Exception as exc:
        logger.error("recall_related_issues failed: %s", exc)
        op.status = MemoryOpStatus.FAILED
        op.last_error = str(exc)[:2000]
        op.retry_count += 1
        db.commit()
        return []


def remember_officer_action(
    db: Session, action: OfficerAction, complaint: Complaint
) -> Optional[str]:
    """Retain an officer action as memory."""
    client = get_client()
    if client is None:
        return _skip_op(db, MemoryOpType.REMEMBER_ACTION, complaint, action_id=action.id)

    ensure_bank()
    idem_key = f"remember_action:{action.id}"
    op = _upsert_op(
        db, idem_key, MemoryOpType.REMEMBER_ACTION, complaint.id, action_id=action.id
    )
    try:
        op.status = MemoryOpStatus.PROCESSING
        db.commit()

        client.retain(
            bank_id=BANK,
            content=_action_memory_text(action, complaint.reference_id),
            context=f"Officer action recorded for complaint {complaint.reference_id}",
            metadata={**_meta(complaint), "action_id": str(action.id), "action_type": str(action.action_type)},
        )
        op.status = MemoryOpStatus.COMPLETED
        op.processed_at = _now()
        db.commit()
        return op.id

    except Exception as exc:
        logger.error("remember_officer_action failed: %s", exc)
        op.status = MemoryOpStatus.FAILED
        op.last_error = str(exc)[:2000]
        op.retry_count += 1
        db.commit()
        return op.id


def remember_resolution_outcome(
    db: Session, complaint: Complaint, outcome_text: str, confirmed: bool
) -> Optional[str]:
    """Retain a resolution/outcome as memory."""
    client = get_client()
    if client is None:
        return _skip_op(db, MemoryOpType.REMEMBER_OUTCOME, complaint)

    ensure_bank()
    idem_key = f"remember_outcome:{complaint.id}:{_now().date().isoformat()}"
    op = _upsert_op(db, idem_key, MemoryOpType.REMEMBER_OUTCOME, complaint.id)
    try:
        op.status = MemoryOpStatus.PROCESSING
        db.commit()

        status_word = "confirmed" if confirmed else "reported (unconfirmed)"
        text = (
            f"Resolution outcome for complaint {complaint.reference_id}: "
            f"{outcome_text}. Status: {status_word}."
        )
        client.retain(
            bank_id=BANK,
            content=text,
            context=f"Outcome recorded on {_now().date().isoformat()}",
            metadata=_meta(complaint),
        )
        op.status = MemoryOpStatus.COMPLETED
        op.processed_at = _now()
        db.commit()
        return op.id

    except Exception as exc:
        logger.error("remember_resolution_outcome failed: %s", exc)
        op.status = MemoryOpStatus.FAILED
        op.last_error = str(exc)[:2000]
        op.retry_count += 1
        db.commit()
        return op.id


def generate_issue_brief(db: Session, complaint: Complaint) -> dict[str, Any]:
    """Use Hindsight reflect to produce an AI-grounded investigation brief."""
    client = get_client()
    result_base = {
        "complaint_id": complaint.id,
        "current_summary": f"{complaint.title} — {complaint.description[:300]}",
        "historical_incidents": [],
        "previous_actions": [],
        "recorded_outcomes": [],
        "possible_recurring_pattern": None,
        "supporting_evidence": [],
        "recommended_investigation": [],
        "uncertainties": [],
        "confidence": "unknown",
        "grounded": True,
        "degraded": client is None,
        "generated_at": _now().isoformat(),
    }

    if client is None:
        result_base["uncertainties"] = [
            "Hindsight is not configured; this brief is based on database records only."
        ]
        return _brief_from_db_only(db, complaint, result_base)

    ensure_bank()
    context_parts = [
        f"Investigating civic complaint {complaint.reference_id}.",
        f"Category: {complaint.category}. Severity: {complaint.severity}.",
        f"Location: {complaint.address or 'not specified'}.",
    ]
    if complaint.latitude and complaint.longitude:
        context_parts.append(f"Coordinates: {complaint.latitude}, {complaint.longitude}.")

    query = (
        "What is the full history related to this civic issue? "
        "What previous complaints, repairs, inspections, and outcomes are relevant? "
        "Which past actions were successful or unsuccessful? "
        "Is there evidence of a recurring pattern? "
        "What should be investigated next? "
        "Be specific: cite complaint reference IDs and dates."
    )

    idem_key = f"generate_brief:{complaint.id}:{_now().date().isoformat()}"
    op = _upsert_op(db, idem_key, MemoryOpType.GENERATE_BRIEF, complaint.id)
    try:
        op.status = MemoryOpStatus.PROCESSING
        db.commit()

        response = client.reflect(
            bank_id=BANK,
            query=query,
            context=" ".join(context_parts),
            budget="high",
        )

        brief_text = response.text if hasattr(response, "text") else str(response)
        based_on = response.based_on if hasattr(response, "based_on") else []

        result_base["ai_response"] = brief_text
        result_base["based_on"] = [str(s) for s in based_on]
        result_base["confidence"] = "grounded" if based_on else "low"
        _enrich_brief_from_ai(result_base, brief_text)

        op.status = MemoryOpStatus.COMPLETED
        op.result = json.dumps(result_base)[:10000]
        op.processed_at = _now()
        db.commit()
        return result_base

    except Exception as exc:
        logger.error("generate_issue_brief failed: %s", exc)
        op.status = MemoryOpStatus.FAILED
        op.last_error = str(exc)[:2000]
        op.retry_count += 1
        db.commit()
        result_base["degraded"] = True
        result_base["uncertainties"].append(
            f"Hindsight reflect unavailable: {str(exc)[:200]}"
        )
        return _brief_from_db_only(db, complaint, result_base)


def get_memory_status(db: Session) -> dict[str, Any]:
    """Memory system health + queue metrics."""
    healthy, detail = health_check()
    counts = {}
    for status in MemoryOpStatus:
        counts[status.value] = (
            db.query(MemoryOperation).filter_by(status=status.value).count()
        )

    last_success = (
        db.query(MemoryOperation)
        .filter_by(status=MemoryOpStatus.COMPLETED)
        .order_by(MemoryOperation.processed_at.desc())
        .first()
    )
    return {
        "hindsight_enabled": settings.hindsight_enabled,
        "healthy": healthy,
        "bank": BANK,
        "pending": counts.get("pending", 0),
        "processing": counts.get("processing", 0),
        "completed": counts.get("completed", 0),
        "failed": counts.get("failed", 0),
        "skipped": counts.get("skipped", 0),
        "last_success_at": last_success.processed_at.isoformat() if last_success and last_success.processed_at else None,
        "detail": detail,
    }


def retry_failed_memory_operations(db: Session, max_retries: int | None = None) -> int:
    """Reset failed ops below retry limit back to pending. Return count retried."""
    limit = max_retries or settings.memory_max_retries
    ops = (
        db.query(MemoryOperation)
        .filter(
            MemoryOperation.status == MemoryOpStatus.FAILED,
            MemoryOperation.retry_count < limit,
        )
        .all()
    )
    for op in ops:
        op.status = MemoryOpStatus.PENDING
    db.commit()
    return len(ops)


# ────────────────────────── internal helpers ──────────────────────────

def _upsert_op(
    db: Session,
    idem_key: str,
    op_type: MemoryOpType,
    complaint_id: Optional[str] = None,
    action_id: Optional[str] = None,
) -> MemoryOperation:
    existing = db.query(MemoryOperation).filter_by(idempotency_key=idem_key).first()
    if existing:
        return existing
    op = MemoryOperation(
        op_type=op_type.value,
        status=MemoryOpStatus.PENDING.value,
        idempotency_key=idem_key,
        complaint_id=complaint_id,
        action_id=action_id,
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return op


def _skip_op(
    db: Session,
    op_type: MemoryOpType,
    complaint: Complaint,
    action_id: Optional[str] = None,
) -> Optional[str]:
    """Record a skipped memory operation when Hindsight is not configured."""
    idem_key = f"skipped:{op_type.value}:{complaint.id}:{_now().isoformat()}"
    op = MemoryOperation(
        op_type=op_type.value,
        status=MemoryOpStatus.SKIPPED.value,
        idempotency_key=idem_key,
        complaint_id=complaint.id,
        action_id=action_id,
        last_error="Hindsight not configured",
    )
    db.add(op)
    db.commit()
    return op.id


def _brief_from_db_only(
    db: Session, complaint: Complaint, base: dict[str, Any]
) -> dict[str, Any]:
    """Populate brief from PostgreSQL when Hindsight is unavailable."""
    from app.models import OfficerAction as OA
    actions = db.query(OA).filter_by(complaint_id=complaint.id).order_by(OA.action_date).all()
    for a in actions:
        base["previous_actions"].append(
            f"{a.action_type} on {a.action_date.date().isoformat()}: {a.description[:200]}"
        )
        if a.observed_outcome:
            base["recorded_outcomes"].append(
                f"Outcome ({a.outcome_status}): {a.observed_outcome[:200]}"
            )
    if not base["recommended_investigation"]:
        base["recommended_investigation"] = [
            "Review complaint details and associated DB records manually."
        ]
    return base


def _enrich_brief_from_ai(brief: dict[str, Any], ai_text: str) -> None:
    """Parse AI text into structured brief fields on a best-effort basis."""
    brief["historical_incidents"].append(ai_text[:3000])
