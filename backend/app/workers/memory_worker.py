"""Database-backed memory queue worker.

Processes pending MemoryOperation rows: performs the Hindsight retain/recall,
runs recurring-issue detection, and marks operations complete/failed.
Runs inline as a background thread (default) or standalone via __main__.
"""
from __future__ import annotations

import logging
import threading
import time

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.memory import service as mem
from app.models import Complaint, MemoryOperation
from app.models.enums import MemoryOpStatus, MemoryOpType
from app.services import detection

logger = logging.getLogger("cityfix.worker")

_stop = threading.Event()


def process_once(db: Session) -> int:
    """Process a batch of pending complaint-memory operations. Returns count."""
    ops = (
        db.query(MemoryOperation)
        .filter(MemoryOperation.status == MemoryOpStatus.PENDING)
        .filter(MemoryOperation.op_type == MemoryOpType.REMEMBER_COMPLAINT)
        .order_by(MemoryOperation.created_at)
        .limit(10)
        .all()
    )
    processed = 0
    for op in ops:
        complaint = db.get(Complaint, op.complaint_id) if op.complaint_id else None
        if complaint is None:
            op.status = MemoryOpStatus.SKIPPED
            op.last_error = "Complaint not found"
            db.commit()
            continue
        try:
            # 1. retain complaint memory
            mem.remember_complaint(db, complaint)
            # 2. recall related issues (populates recall op)
            mem.recall_related_issues(db, complaint)
            # 3. run multi-signal detection / clustering
            detection.detect_and_cluster(db, complaint)
            processed += 1
        except Exception as exc:  # keep worker alive
            logger.error("worker error on op %s: %s", op.id, exc)
            op.status = MemoryOpStatus.FAILED
            op.last_error = str(exc)[:2000]
            op.retry_count += 1
            db.commit()
    return processed


def _loop() -> None:
    logger.info("Memory worker started (interval=%ss)", settings.memory_worker_interval_seconds)
    while not _stop.is_set():
        db = SessionLocal()
        try:
            process_once(db)
        except Exception as exc:  # pragma: no cover
            logger.error("worker loop error: %s", exc)
        finally:
            db.close()
        _stop.wait(settings.memory_worker_interval_seconds)


def start_inline_worker() -> threading.Thread:
    t = threading.Thread(target=_loop, name="memory-worker", daemon=True)
    t.start()
    return t


def stop_worker() -> None:
    _stop.set()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        _loop()
    except KeyboardInterrupt:
        stop_worker()
