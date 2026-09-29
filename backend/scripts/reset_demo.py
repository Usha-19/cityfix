"""Reset the demo environment: remove demo rows, then re-seed.

Only removes rows flagged is_demo=True (and their dependents). Never touches
production/non-demo data.
"""
from app.db.session import SessionLocal
from app.models import (
    Complaint,
    IssueCluster,
    IssueClusterMembership,
    MemoryOperation,
)
from scripts.seed_demo import seed_demo


def reset_demo() -> None:
    db = SessionLocal()
    try:
        demo_complaints = db.query(Complaint).filter(Complaint.is_demo == True).all()  # noqa: E712
        demo_ids = [c.id for c in demo_complaints]

        if demo_ids:
            db.query(MemoryOperation).filter(
                MemoryOperation.complaint_id.in_(demo_ids)
            ).delete(synchronize_session=False)
            memberships = (
                db.query(IssueClusterMembership)
                .filter(IssueClusterMembership.complaint_id.in_(demo_ids))
                .all()
            )
            cluster_ids = {m.cluster_id for m in memberships}
            for m in memberships:
                db.delete(m)
            db.commit()
            # cascades handle attachments/actions/status history
            for c in demo_complaints:
                db.delete(c)
            db.commit()
            for cl in db.query(IssueCluster).filter(IssueCluster.is_demo == True).all():  # noqa: E712
                db.delete(cl)
            db.commit()
        print(f"Removed {len(demo_ids)} demo complaints and related rows.")
    finally:
        db.close()

    seed_demo()


if __name__ == "__main__":
    reset_demo()
