from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.memory import service as mem
from app.models import (
    AuditLog,
    Department,
    MemoryOperation,
    OfficerDepartmentAssignment,
    User,
)
from app.models.enums import MemoryOpStatus, UserRole
from app.schemas.misc import (
    AuditLogOut,
    DepartmentCreate,
    DepartmentOut,
    MemoryOperationOut,
    MemoryStatusOut,
    OfficerAssignRequest,
    RoleUpdate,
    UserAdminOut,
)
from app.services.audit import log_action

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── users ──
@router.get("/users", response_model=list[UserAdminOut])
def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return [UserAdminOut.model_validate(u) for u in db.query(User).order_by(User.created_at).all()]


@router.patch("/users/{user_id}/role", response_model=UserAdminOut)
def update_role(
    user_id: str, data: RoleUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = data.role.value
    db.commit()
    log_action(db, admin.id, "admin.role_change", "user", user.id, detail=data.role.value)
    db.refresh(user)
    return UserAdminOut.model_validate(user)


@router.patch("/users/{user_id}/active", response_model=UserAdminOut)
def toggle_active(
    user_id: str, is_active: bool, db: Session = Depends(get_db), admin=Depends(require_admin)
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return UserAdminOut.model_validate(user)


# ── departments ──
@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return [DepartmentOut.model_validate(d) for d in db.query(Department).all()]


@router.get("/departments/{department_id}")
def department_detail(
    department_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)
):
    from app.models import Complaint

    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    complaints = (
        db.query(Complaint)
        .filter(Complaint.department_id == department_id)
        .order_by(Complaint.created_at.desc())
        .limit(100)
        .all()
    )
    officer_count = (
        db.query(OfficerDepartmentAssignment)
        .filter(OfficerDepartmentAssignment.department_id == department_id)
        .count()
    )
    status_counts: dict[str, int] = {}
    for c in complaints:
        status_counts[c.status] = status_counts.get(c.status, 0) + 1

    return {
        "department": DepartmentOut.model_validate(dept).model_dump(),
        "officer_count": officer_count,
        "complaint_count": len(complaints),
        "status_counts": status_counts,
        "complaints": [
            {
                "id": c.id,
                "reference_id": c.reference_id,
                "title": c.title,
                "category": c.category,
                "status": c.status,
                "severity": c.severity,
                "is_recurring": c.is_recurring,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in complaints
        ],
    }


@router.post("/departments", response_model=DepartmentOut, status_code=201)
def create_department(
    data: DepartmentCreate, db: Session = Depends(get_db), admin=Depends(require_admin)
):
    dept = Department(name=data.name, description=data.description, categories=data.categories)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentOut.model_validate(dept)


@router.post("/assignments")
def assign_officer(
    data: OfficerAssignRequest, db: Session = Depends(get_db), admin=Depends(require_admin)
):
    officer = db.get(User, data.officer_id)
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    if officer.role == UserRole.CITIZEN.value:
        officer.role = UserRole.OFFICER.value
    existing = (
        db.query(OfficerDepartmentAssignment)
        .filter_by(officer_id=data.officer_id, department_id=data.department_id)
        .first()
    )
    if not existing:
        db.add(
            OfficerDepartmentAssignment(
                officer_id=data.officer_id,
                department_id=data.department_id,
                is_lead=data.is_lead,
            )
        )
    db.commit()
    log_action(db, admin.id, "admin.assign_officer", "user", data.officer_id)
    return {"detail": "assigned"}


# ── audit logs ──
@router.get("/audit-logs", response_model=list[AuditLogOut])
def audit_logs(db: Session = Depends(get_db), admin=Depends(require_admin), limit: int = 200):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [AuditLogOut.model_validate(x) for x in logs]


# ── memory monitoring ──
@router.get("/memory/status", response_model=MemoryStatusOut)
def memory_status(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return MemoryStatusOut(**mem.get_memory_status(db))


@router.get("/memory/operations", response_model=list[MemoryOperationOut])
def memory_operations(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
    status: MemoryOpStatus | None = None,
    limit: int = 100,
):
    q = db.query(MemoryOperation)
    if status:
        q = q.filter(MemoryOperation.status == status.value)
    ops = q.order_by(MemoryOperation.created_at.desc()).limit(limit).all()
    return [MemoryOperationOut.model_validate(o) for o in ops]


@router.post("/memory/retry")
def retry_memory(db: Session = Depends(get_db), admin=Depends(require_admin)):
    count = mem.retry_failed_memory_operations(db)
    log_action(db, admin.id, "admin.memory_retry", detail=f"{count} ops")
    return {"detail": "retried", "count": count}
