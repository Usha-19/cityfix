from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import ActionCompletionStatus, ActionType, OutcomeStatus


class ActionCreate(BaseModel):
    action_type: ActionType
    action_date: datetime
    description: str = Field(min_length=4)
    assigned_team: Optional[str] = None
    materials_used: Optional[str] = None
    completion_status: ActionCompletionStatus = ActionCompletionStatus.COMPLETED
    observed_outcome: Optional[str] = None
    outcome_status: OutcomeStatus = OutcomeStatus.UNKNOWN
    outcome_confirmed: bool = False
    follow_up_date: Optional[datetime] = None
    officer_notes: Optional[str] = None


class ActionOut(BaseModel):
    id: str
    complaint_id: str
    action_type: ActionType
    action_date: datetime
    description: str
    assigned_team: Optional[str] = None
    materials_used: Optional[str] = None
    completion_status: ActionCompletionStatus
    observed_outcome: Optional[str] = None
    outcome_status: OutcomeStatus
    outcome_confirmed: bool
    follow_up_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
