from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.enums import ClusterStatus, ComplaintCategory


class ClusterMemberOut(BaseModel):
    id: str
    complaint_id: str
    status: str
    match_score: Optional[float] = None
    evidence: Optional[str] = None
    complaint_title: Optional[str] = None
    complaint_reference: Optional[str] = None
    evidence_summary: Optional[str] = None

    class Config:
        from_attributes = True


class ClusterOut(BaseModel):
    id: str
    code: str
    title: str
    category: Optional[ComplaintCategory] = None
    status: ClusterStatus
    center_lat: Optional[float] = None
    center_lng: Optional[float] = None
    locality: Optional[str] = None
    first_reported_at: Optional[datetime] = None
    last_reported_at: Optional[datetime] = None
    recurrence_count: int
    ai_explanation: Optional[str] = None
    root_cause_hypothesis: Optional[str] = None
    verified_cause: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ClusterDetail(ClusterOut):
    members: list[ClusterMemberOut] = []


class MatchDecision(BaseModel):
    membership_id: str
    accept: bool


class RootCauseUpdate(BaseModel):
    root_cause_hypothesis: Optional[str] = None
    verified_cause: Optional[str] = None
