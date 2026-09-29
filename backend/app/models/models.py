from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_str


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="citizen", nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    complaints: Mapped[list["Complaint"]] = relationship(
        back_populates="citizen", foreign_keys="Complaint.citizen_id"
    )
    department_assignments: Mapped[list["OfficerDepartmentAssignment"]] = relationship(
        back_populates="officer"
    )


class Department(Base, TimestampMixin):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    # Comma-separated categories this department handles
    categories: Mapped[Optional[str]] = mapped_column(Text)

    assignments: Mapped[list["OfficerDepartmentAssignment"]] = relationship(
        back_populates="department"
    )


class OfficerDepartmentAssignment(Base, TimestampMixin):
    __tablename__ = "officer_department_assignments"
    __table_args__ = (
        UniqueConstraint("officer_id", "department_id", name="uq_officer_department"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    officer_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    department_id: Mapped[str] = mapped_column(
        ForeignKey("departments.id", ondelete="CASCADE"), index=True
    )
    is_lead: Mapped[bool] = mapped_column(Boolean, default=False)

    officer: Mapped["User"] = relationship(back_populates="department_assignments")
    department: Mapped["Department"] = relationship(back_populates="assignments")


class Complaint(Base, TimestampMixin):
    __tablename__ = "complaints"
    __table_args__ = (
        Index("ix_complaints_status_category", "status", "category"),
        Index("ix_complaints_geo", "latitude", "longitude"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    reference_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="new", index=True, nullable=False)

    address: Mapped[Optional[str]] = mapped_column(String(500))
    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)
    observed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    extra_notes: Mapped[Optional[str]] = mapped_column(Text)

    citizen_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    department_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )
    assigned_officer_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    memory_synced: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    citizen: Mapped["User"] = relationship(
        back_populates="complaints", foreign_keys=[citizen_id]
    )
    attachments: Mapped[list["ComplaintAttachment"]] = relationship(
        back_populates="complaint", cascade="all, delete-orphan"
    )
    status_history: Mapped[list["ComplaintStatusHistory"]] = relationship(
        back_populates="complaint", cascade="all, delete-orphan"
    )
    actions: Mapped[list["OfficerAction"]] = relationship(
        back_populates="complaint", cascade="all, delete-orphan"
    )
    comments: Mapped[list["ComplaintComment"]] = relationship(
        back_populates="complaint", cascade="all, delete-orphan"
    )
    feedback: Mapped[list["CitizenFeedback"]] = relationship(
        back_populates="complaint", cascade="all, delete-orphan"
    )


class ComplaintAttachment(Base, TimestampMixin):
    __tablename__ = "complaint_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), index=True
    )
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[Optional[str]] = mapped_column(String(100))
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer)

    complaint: Mapped["Complaint"] = relationship(back_populates="attachments")


class ComplaintStatusHistory(Base, TimestampMixin):
    __tablename__ = "complaint_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), index=True
    )
    from_status: Mapped[Optional[str]] = mapped_column(String(20))
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text)
    changed_by_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    visible_to_citizen: Mapped[bool] = mapped_column(Boolean, default=True)

    complaint: Mapped["Complaint"] = relationship(back_populates="status_history")


class IssueCluster(Base, TimestampMixin):
    __tablename__ = "issue_clusters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(20), default="proposed", index=True)
    center_lat: Mapped[Optional[float]] = mapped_column(Float)
    center_lng: Mapped[Optional[float]] = mapped_column(Float)
    locality: Mapped[Optional[str]] = mapped_column(String(255))
    first_reported_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_reported_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    recurrence_count: Mapped[int] = mapped_column(Integer, default=0)
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text)
    root_cause_hypothesis: Mapped[Optional[str]] = mapped_column(Text)
    verified_cause: Mapped[Optional[str]] = mapped_column(Text)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    memberships: Mapped[list["IssueClusterMembership"]] = relationship(
        back_populates="cluster", cascade="all, delete-orphan"
    )


class IssueClusterMembership(Base, TimestampMixin):
    __tablename__ = "issue_cluster_memberships"
    __table_args__ = (
        UniqueConstraint("cluster_id", "complaint_id", name="uq_cluster_complaint"),
        Index("ix_membership_status", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    cluster_id: Mapped[str] = mapped_column(
        ForeignKey("issue_clusters.id", ondelete="CASCADE"), index=True
    )
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="proposed")
    match_score: Mapped[Optional[float]] = mapped_column(Float)
    evidence: Mapped[Optional[str]] = mapped_column(Text)  # JSON string of evidence signals
    confirmed_by_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    cluster: Mapped["IssueCluster"] = relationship(back_populates="memberships")


class OfficerAction(Base, TimestampMixin):
    __tablename__ = "officer_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), index=True
    )
    officer_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    action_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    action_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    assigned_team: Mapped[Optional[str]] = mapped_column(String(255))
    materials_used: Mapped[Optional[str]] = mapped_column(Text)
    completion_status: Mapped[str] = mapped_column(String(20), default="completed")
    observed_outcome: Mapped[Optional[str]] = mapped_column(Text)
    outcome_status: Mapped[str] = mapped_column(String(30), default="unknown")
    outcome_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    follow_up_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    officer_notes: Mapped[Optional[str]] = mapped_column(Text)  # internal, not citizen-visible

    complaint: Mapped["Complaint"] = relationship(back_populates="actions")
    evidence: Mapped[list["ActionEvidence"]] = relationship(
        back_populates="action", cascade="all, delete-orphan"
    )


class ActionEvidence(Base, TimestampMixin):
    __tablename__ = "action_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    action_id: Mapped[str] = mapped_column(
        ForeignKey("officer_actions.id", ondelete="CASCADE"), index=True
    )
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[Optional[str]] = mapped_column(String(100))

    action: Mapped["OfficerAction"] = relationship(back_populates="evidence")


class ComplaintComment(Base, TimestampMixin):
    __tablename__ = "complaint_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)

    complaint: Mapped["Complaint"] = relationship(back_populates="comments")


class CitizenFeedback(Base, TimestampMixin):
    __tablename__ = "citizen_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    complaint_id: Mapped[str] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), index=True
    )
    citizen_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    still_unresolved: Mapped[bool] = mapped_column(Boolean, default=False)
    comment: Mapped[Optional[str]] = mapped_column(Text)

    complaint: Mapped["Complaint"] = relationship(back_populates="feedback")


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    complaint_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE")
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class MemoryOperation(Base, TimestampMixin):
    __tablename__ = "memory_operations"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_memory_idempotency"),
        Index("ix_memory_status_type", "status", "op_type"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    op_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)
    complaint_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"), index=True
    )
    action_id: Mapped[Optional[str]] = mapped_column(String(36))
    payload: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    result: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    actor_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(60))
    entity_id: Mapped[Optional[str]] = mapped_column(String(36))
    detail: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(String(60))
