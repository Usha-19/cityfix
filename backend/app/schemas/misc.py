from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import MemoryOpStatus, MemoryOpType, NotificationType, UserRole


class NotificationOut(BaseModel):
    id: str
    type: NotificationType
    title: str
    body: Optional[str] = None
    complaint_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = None
    categories: Optional[str] = None


class DepartmentOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    categories: Optional[str] = None

    class Config:
        from_attributes = True


class UserAdminOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: UserRole


class OfficerAssignRequest(BaseModel):
    officer_id: str
    department_id: str
    is_lead: bool = False


class MemoryOperationOut(BaseModel):
    id: str
    op_type: MemoryOpType
    status: MemoryOpStatus
    complaint_id: Optional[str] = None
    retry_count: int
    last_error: Optional[str] = None
    processed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MemoryStatusOut(BaseModel):
    hindsight_enabled: bool
    healthy: bool
    bank: str
    pending: int
    processing: int
    completed: int
    failed: int
    skipped: int
    last_success_at: Optional[datetime] = None
    detail: Optional[str] = None


class AuditLogOut(BaseModel):
    id: str
    actor_id: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    detail: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class IssueBriefEvidence(BaseModel):
    complaint_id: str
    reference_id: Optional[str] = None
    date: Optional[str] = None
    summary: str
    kind: str = "record"  # record | memory | citizen_report | hypothesis


class IssueBrief(BaseModel):
    complaint_id: str
    current_summary: str
    historical_incidents: list[str] = []
    previous_actions: list[str] = []
    recorded_outcomes: list[str] = []
    possible_recurring_pattern: Optional[str] = None
    supporting_evidence: list[IssueBriefEvidence] = []
    recommended_investigation: list[str] = []
    uncertainties: list[str] = []
    confidence: str = "unknown"  # qualitative
    grounded: bool = True
    degraded: bool = False
    generated_at: datetime
