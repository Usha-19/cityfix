from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import (
    ComplaintCategory,
    ComplaintStatus,
    Severity,
)


class AttachmentOut(BaseModel):
    id: str
    file_url: str
    file_name: str
    content_type: Optional[str] = None

    class Config:
        from_attributes = True


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=4, max_length=255)
    description: str = Field(min_length=10)
    category: ComplaintCategory
    address: Optional[str] = Field(default=None, max_length=500)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    observed_at: Optional[datetime] = None
    severity: Severity = Severity.MEDIUM
    extra_notes: Optional[str] = None


class ComplaintUpdateInfo(BaseModel):
    extra_notes: Optional[str] = None
    body: Optional[str] = None


class StatusHistoryOut(BaseModel):
    id: str
    from_status: Optional[str] = None
    to_status: str
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ComplaintListItem(BaseModel):
    id: str
    reference_id: str
    title: str
    category: ComplaintCategory
    severity: Severity
    status: ComplaintStatus
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_recurring: bool
    department_id: Optional[str] = None
    assigned_officer_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplaintDetail(ComplaintListItem):
    description: str
    observed_at: Optional[datetime] = None
    extra_notes: Optional[str] = None
    citizen_id: str
    attachments: list[AttachmentOut] = []
    status_history: list[StatusHistoryOut] = []


class PaginatedComplaints(BaseModel):
    items: list[ComplaintListItem]
    total: int
    page: int
    page_size: int


class StatusChangeRequest(BaseModel):
    to_status: ComplaintStatus
    note: Optional[str] = None
    visible_to_citizen: bool = True


class AssignRequest(BaseModel):
    department_id: Optional[str] = None
    officer_id: Optional[str] = None


class FeedbackCreate(BaseModel):
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    still_unresolved: bool = False
    comment: Optional[str] = None
