from enum import Enum


class UserRole(str, Enum):
    CITIZEN = "citizen"
    OFFICER = "officer"
    ADMIN = "admin"


class ComplaintCategory(str, Enum):
    ROADS_POTHOLES = "roads_potholes"
    GARBAGE_SANITATION = "garbage_sanitation"
    WATER_SUPPLY = "water_supply"
    DRAINAGE_FLOODING = "drainage_flooding"
    STREETLIGHTS = "streetlights"
    ELECTRICITY_INFRA = "electricity_infra"
    PUBLIC_SAFETY = "public_safety"
    OTHER = "other"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ComplaintStatus(str, Enum):
    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REOPENED = "reopened"
    CLOSED = "closed"


class ActionType(str, Enum):
    INSPECTION = "inspection"
    TEMPORARY_REPAIR = "temporary_repair"
    PERMANENT_REPAIR = "permanent_repair"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    ESCALATION = "escalation"
    REFERRAL = "referral"
    OTHER = "other"


class ActionCompletionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class OutcomeStatus(str, Enum):
    UNKNOWN = "unknown"
    IMPROVED = "improved"
    NO_CHANGE = "no_change"
    RECURRED = "recurred"
    RESOLVED_CONFIRMED = "resolved_confirmed"


class ClusterStatus(str, Enum):
    PROPOSED = "proposed"
    CONFIRMED = "confirmed"
    MONITORING = "monitoring"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class MembershipStatus(str, Enum):
    PROPOSED = "proposed"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class MemoryOpType(str, Enum):
    REMEMBER_COMPLAINT = "remember_complaint"
    RECALL_RELATED = "recall_related"
    REMEMBER_ACTION = "remember_action"
    REMEMBER_OUTCOME = "remember_outcome"
    GENERATE_BRIEF = "generate_brief"


class MemoryOpStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class NotificationType(str, Enum):
    COMPLAINT_RECEIVED = "complaint_received"
    COMPLAINT_ASSIGNED = "complaint_assigned"
    INSPECTION_RECORDED = "inspection_recorded"
    STATUS_CHANGED = "status_changed"
    REPAIR_RECORDED = "repair_recorded"
    RESOLVED = "resolved"
    INFO_REQUESTED = "info_requested"
    RECURRENCE_DETECTED = "recurrence_detected"
