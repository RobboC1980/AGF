"""
AgileForge Complete Database Schema
This file contains the complete database schema for the AgileForge platform
covering all entities and their relationships with no gaps.
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, ForeignKey, 
    Enum, JSON, Numeric, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()

# =====================================
# ENUMS
# =====================================

class PriorityLevel(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class StatusType(enum.Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    READY = "ready"
    IN_PROGRESS = "in-progress"
    REVIEW = "review"
    TESTING = "testing"
    DONE = "done"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class EntityType(enum.Enum):
    PROJECT = "project"
    EPIC = "epic"
    STORY = "story"
    TASK = "task"
    SUBTASK = "subtask"
    BUG = "bug"
    SPIKE = "spike"

class UserRole(enum.Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    PRODUCT_OWNER = "product_owner"
    SCRUM_MASTER = "scrum_master"
    DEVELOPER = "developer"
    TESTER = "tester"
    DESIGNER = "designer"
    STAKEHOLDER = "stakeholder"

class NotificationType(enum.Enum):
    ASSIGNMENT = "assignment"
    STATUS_CHANGE = "status_change"
    COMMENT = "comment"
    MENTION = "mention"
    DUE_DATE = "due_date"
    OVERDUE = "overdue"

class ActivityType(enum.Enum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    ASSIGNED = "assigned"
    COMMENTED = "commented"
    STATUS_CHANGED = "status_changed"
    MOVED = "moved"

# =====================================
# USER MANAGEMENT
# =====================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500))
    bio = Column(Text)
    job_title = Column(String(100))
    department = Column(String(100))
    location = Column(String(100))
    timezone = Column(String(50), default="UTC")
    language = Column(String(10), default="en")
    
    # Authentication & Security
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True))
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True))
    password_reset_token = Column(String(255))
    password_reset_expires = Column(DateTime(timezone=True))
    verification_token = Column(String(255))
    
    # Preferences
    theme = Column(String(20), default="light")
    notifications_enabled = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    created_projects = relationship("Project", back_populates="creator", foreign_keys="Project.created_by")
    assigned_stories = relationship("Story", back_populates="assignee", foreign_keys="Story.assignee_id")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assignee_id")
    team_memberships = relationship("TeamMember", back_populates="user")
    comments = relationship("Comment", back_populates="author")
    activities = relationship("ActivityLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    token = Column(String(500), nullable=False, unique=True)
    refresh_token = Column(String(500), nullable=False, unique=True)
    device_info = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    user = relationship("User")

# =====================================
# ORGANIZATION & TEAMS
# =====================================

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    website = Column(String(500))
    logo_url = Column(String(500))
    
    # Settings
    default_timezone = Column(String(50), default="UTC")
    currency = Column(String(3), default="USD")
    date_format = Column(String(20), default="YYYY-MM-DD")
    
    # Subscription & Billing
    plan_type = Column(String(50), default="free")
    max_users = Column(Integer, default=10)
    max_projects = Column(Integer, default=5)
    billing_email = Column(String(255))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    projects = relationship("Project", back_populates="organization")
    teams = relationship("Team", back_populates="organization")

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    avatar_url = Column(String(500))
    color = Column(String(7))  # Hex color
    
    # Settings
    is_default = Column(Boolean, default=False)
    is_private = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    organization = relationship("Organization", back_populates="teams")
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("TeamMember", back_populates="team")
    projects = relationship("Project", back_populates="team")

class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(String(36), primary_key=True)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.DEVELOPER)
    
    # Permissions
    can_manage_team = Column(Boolean, default=False)
    can_manage_projects = Column(Boolean, default=False)
    can_assign_tasks = Column(Boolean, default=True)
    
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    invited_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")
    inviter = relationship("User", foreign_keys=[invited_by])
    
    __table_args__ = (
        UniqueConstraint('team_id', 'user_id', name='unique_team_member'),
    )

# =====================================
# PROJECT MANAGEMENT
# =====================================

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id"))
    
    # Basic Info
    name = Column(String(200), nullable=False)
    key = Column(String(10), nullable=False)  # Project key like "PROJ"
    description = Column(Text)
    vision = Column(Text)
    goals = Column(JSON)  # Array of goal objects
    
    # Visual
    avatar_url = Column(String(500))
    color = Column(String(7))  # Hex color
    
    # Dates & Timeline
    start_date = Column(DateTime(timezone=True))
    target_end_date = Column(DateTime(timezone=True))
    actual_end_date = Column(DateTime(timezone=True))
    
    # Status & Progress
    status = Column(Enum(StatusType), default=StatusType.BACKLOG, nullable=False)
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.MEDIUM)
    progress = Column(Integer, default=0)  # 0-100
    health_status = Column(String(20), default="green")  # green, yellow, red
    
    # Budget & Resources
    budget = Column(Numeric(15, 2))
    currency = Column(String(3), default="USD")
    estimated_hours = Column(Integer)
    actual_hours = Column(Integer, default=0)
    
    # Settings
    is_private = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    is_template = Column(Boolean, default=False)
    auto_assign = Column(Boolean, default=False)
    
    # Methodology Settings
    methodology = Column(String(50), default="scrum")  # scrum, kanban, waterfall
    sprint_duration = Column(Integer, default=14)  # days
    story_point_scale = Column(String(50), default="fibonacci")
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="projects")
    team = relationship("Team", back_populates="projects")
    creator = relationship("User", back_populates="created_projects", foreign_keys=[created_by])
    epics = relationship("Epic", back_populates="project")
    sprints = relationship("Sprint", back_populates="project")
    releases = relationship("Release", back_populates="project")
    
    __table_args__ = (
        UniqueConstraint('organization_id', 'key', name='unique_project_key'),
        Index('idx_project_status', 'status'),
        Index('idx_project_priority', 'priority'),
    )

class Epic(Base):
    __tablename__ = "epics"
    
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    
    # Basic Info
    title = Column(String(500), nullable=False)
    description = Column(Text)
    acceptance_criteria = Column(Text)
    business_value = Column(Text)
    
    # Hierarchy
    parent_epic_id = Column(String(36), ForeignKey("epics.id"))
    epic_key = Column(String(20), nullable=False)  # PROJ-123
    
    # Status & Priority
    status = Column(Enum(StatusType), default=StatusType.BACKLOG, nullable=False)
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.MEDIUM)
    
    # Timeline
    start_date = Column(DateTime(timezone=True))
    target_end_date = Column(DateTime(timezone=True))
    actual_end_date = Column(DateTime(timezone=True))
    
    # Estimation & Progress
    estimated_story_points = Column(Integer)
    actual_story_points = Column(Integer, default=0)
    progress = Column(Integer, default=0)  # 0-100
    
    # Business Metrics
    roi_estimate = Column(Numeric(10, 2))
    risk_level = Column(String(20), default="medium")
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    project = relationship("Project", back_populates="epics")
    parent_epic = relationship("Epic", remote_side=[id])
    child_epics = relationship("Epic")
    stories = relationship("Story", back_populates="epic")
    creator = relationship("User", foreign_keys=[created_by])
    
    __table_args__ = (
        UniqueConstraint('project_id', 'epic_key', name='unique_epic_key'),
        Index('idx_epic_status', 'status'),
        Index('idx_epic_priority', 'priority'),
    )

class Story(Base):
    __tablename__ = "stories"
    
    id = Column(String(36), primary_key=True)
    epic_id = Column(String(36), ForeignKey("epics.id"), nullable=False)
    sprint_id = Column(String(36), ForeignKey("sprints.id"))
    
    # Basic Info
    title = Column(String(500), nullable=False)
    description = Column(Text)
    story_key = Column(String(20), nullable=False)  # PROJ-456
    
    # User Story Format
    as_a = Column(String(200))  # User role
    i_want = Column(Text)       # Goal
    so_that = Column(Text)      # Benefit
    
    # Acceptance Criteria
    acceptance_criteria = Column(Text, nullable=False)
    definition_of_done = Column(Text)
    
    # Status & Priority
    status = Column(Enum(StatusType), default=StatusType.BACKLOG, nullable=False)
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.MEDIUM)
    story_type = Column(Enum(EntityType), default=EntityType.STORY)
    
    # Assignment
    assignee_id = Column(String(36), ForeignKey("users.id"))
    reporter_id = Column(String(36), ForeignKey("users.id"))
    
    # Estimation & Tracking
    story_points = Column(Integer)
    estimated_hours = Column(Numeric(5, 2))
    actual_hours = Column(Numeric(5, 2), default=0)
    remaining_hours = Column(Numeric(5, 2))
    
    # Timeline
    due_date = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Quality & Testing
    test_cases_count = Column(Integer, default=0)
    passed_tests_count = Column(Integer, default=0)
    bug_count = Column(Integer, default=0)
    
    # Business Value
    business_value = Column(Integer)  # 1-100
    customer_priority = Column(Integer)  # 1-100
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    epic = relationship("Epic", back_populates="stories")
    sprint = relationship("Sprint", back_populates="stories")
    assignee = relationship("User", back_populates="assigned_stories", foreign_keys=[assignee_id])
    reporter = relationship("User", foreign_keys=[reporter_id])
    creator = relationship("User", foreign_keys=[created_by])
    tasks = relationship("Task", back_populates="story")
    
    __table_args__ = (
        Index('idx_story_status', 'status'),
        Index('idx_story_priority', 'priority'),
        Index('idx_story_assignee', 'assignee_id'),
        Index('idx_story_sprint', 'sprint_id'),
    )

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String(36), primary_key=True)
    story_id = Column(String(36), ForeignKey("stories.id"), nullable=False)
    parent_task_id = Column(String(36), ForeignKey("tasks.id"))
    
    # Basic Info
    title = Column(String(500), nullable=False)
    description = Column(Text)
    task_key = Column(String(20), nullable=False)  # PROJ-789
    task_type = Column(Enum(EntityType), default=EntityType.TASK)
    
    # Status & Priority
    status = Column(Enum(StatusType), default=StatusType.TODO, nullable=False)
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.MEDIUM)
    
    # Assignment
    assignee_id = Column(String(36), ForeignKey("users.id"))
    reviewer_id = Column(String(36), ForeignKey("users.id"))
    
    # Time Tracking
    estimated_hours = Column(Numeric(5, 2), nullable=False)
    actual_hours = Column(Numeric(5, 2), default=0)
    remaining_hours = Column(Numeric(5, 2))
    
    # Timeline
    due_date = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Technical Details
    technical_notes = Column(Text)
    blockers = Column(JSON)  # Array of blocker objects
    dependencies = Column(JSON)  # Array of dependency task IDs
    
    # Quality
    is_blocked = Column(Boolean, default=False)
    blocker_reason = Column(Text)
    review_required = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    story = relationship("Story", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id])
    subtasks = relationship("Task")
    assignee = relationship("User", back_populates="assigned_tasks", foreign_keys=[assignee_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    creator = relationship("User", foreign_keys=[created_by])
    time_logs = relationship("TimeLog", back_populates="task")
    
    __table_args__ = (
        Index('idx_task_status', 'status'),
        Index('idx_task_assignee', 'assignee_id'),
        Index('idx_task_story', 'story_id'),
    )

# =====================================
# SPRINT & RELEASE MANAGEMENT
# =====================================

class Sprint(Base):
    __tablename__ = "sprints"
    
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    
    # Basic Info
    name = Column(String(200), nullable=False)
    goal = Column(Text)
    description = Column(Text)
    sprint_number = Column(Integer, nullable=False)
    
    # Timeline
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    actual_start_date = Column(DateTime(timezone=True))
    actual_end_date = Column(DateTime(timezone=True))
    
    # Status
    status = Column(String(20), default="planning")  # planning, active, completed, cancelled
    
    # Capacity & Planning
    team_capacity = Column(Numeric(5, 2))  # Total team capacity in hours
    planned_story_points = Column(Integer)
    completed_story_points = Column(Integer, default=0)
    
    # Metrics
    velocity = Column(Numeric(5, 2))
    burndown_data = Column(JSON)  # Daily burndown data
    scope_changes = Column(Integer, default=0)
    
    # Retrospective
    what_went_well = Column(Text)
    what_to_improve = Column(Text)
    action_items = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    project = relationship("Project", back_populates="sprints")
    creator = relationship("User", foreign_keys=[created_by])
    stories = relationship("Story", back_populates="sprint")
    
    __table_args__ = (
        UniqueConstraint('project_id', 'sprint_number', name='unique_sprint_number'),
        Index('idx_sprint_dates', 'start_date', 'end_date'),
    )

class Release(Base):
    __tablename__ = "releases"
    
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    
    # Basic Info
    name = Column(String(200), nullable=False)
    version = Column(String(50), nullable=False)
    description = Column(Text)
    release_notes = Column(Text)
    
    # Timeline
    planned_date = Column(DateTime(timezone=True))
    actual_date = Column(DateTime(timezone=True))
    
    # Status
    status = Column(String(20), default="planning")  # planning, in_progress, released, cancelled
    is_major = Column(Boolean, default=False)
    
    # Environment Info
    environment = Column(String(50))  # development, staging, production
    branch = Column(String(100))
    commit_hash = Column(String(40))
    
    # Metrics
    stories_count = Column(Integer, default=0)
    bugs_fixed = Column(Integer, default=0)
    features_added = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    project = relationship("Project", back_populates="releases")
    creator = relationship("User", foreign_keys=[created_by])

# =====================================
# TIME TRACKING & WORKLOG
# =====================================

class TimeLog(Base):
    __tablename__ = "time_logs"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    
    # Time Info
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer, nullable=False)
    
    # Work Details
    description = Column(Text)
    work_type = Column(String(50))  # development, testing, review, meeting, etc.
    
    # Status
    is_billable = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String(36), ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    task = relationship("Task", back_populates="time_logs")
    approver = relationship("User", foreign_keys=[approved_by])

# =====================================
# COLLABORATION & COMMUNICATION
# =====================================

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(String(36), primary_key=True)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Target Entity (polymorphic)
    entity_type = Column(Enum(EntityType), nullable=False)
    entity_id = Column(String(36), nullable=False)
    
    # Content
    content = Column(Text, nullable=False)
    formatted_content = Column(Text)  # HTML formatted content
    
    # Thread Management
    parent_comment_id = Column(String(36), ForeignKey("comments.id"))
    thread_root_id = Column(String(36), ForeignKey("comments.id"))
    
    # Status
    is_deleted = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))
    
    # Relationships
    author = relationship("User", back_populates="comments", foreign_keys=[author_id])
    parent_comment = relationship("Comment", remote_side=[id], foreign_keys=[parent_comment_id])
    thread_root = relationship("Comment", remote_side=[id], foreign_keys=[thread_root_id])
    reactions = relationship("CommentReaction", back_populates="comment")
    mentions = relationship("Mention", back_populates="comment")
    
    __table_args__ = (
        Index('idx_comment_entity', 'entity_type', 'entity_id'),
        Index('idx_comment_thread', 'thread_root_id'),
    )

class CommentReaction(Base):
    __tablename__ = "comment_reactions"
    
    id = Column(String(36), primary_key=True)
    comment_id = Column(String(36), ForeignKey("comments.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    reaction_type = Column(String(20), nullable=False)  # 👍, 👎, ❤️, 😄, 😮, 😢, 😡
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    comment = relationship("Comment", back_populates="reactions")
    user = relationship("User")
    
    __table_args__ = (
        UniqueConstraint('comment_id', 'user_id', 'reaction_type', name='unique_comment_reaction'),
    )

class Mention(Base):
    __tablename__ = "mentions"
    
    id = Column(String(36), primary_key=True)
    comment_id = Column(String(36), ForeignKey("comments.id"), nullable=False)
    mentioned_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    mentioned_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    comment = relationship("Comment", back_populates="mentions")
    mentioned_user = relationship("User", foreign_keys=[mentioned_user_id])
    mentioned_by = relationship("User", foreign_keys=[mentioned_by_id])

# =====================================
# FILE & ATTACHMENT MANAGEMENT
# =====================================

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(String(36), primary_key=True)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Target Entity (polymorphic)
    entity_type = Column(Enum(EntityType), nullable=False)
    entity_id = Column(String(36), nullable=False)
    
    # File Info
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_url = Column(String(500))
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Image Specific
    width = Column(Integer)
    height = Column(Integer)
    thumbnail_url = Column(String(500))
    
    # Status
    is_deleted = Column(Boolean, default=False)
    virus_scan_status = Column(String(20), default="pending")  # pending, clean, infected
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True))
    
    # Relationships
    uploader = relationship("User")
    
    __table_args__ = (
        Index('idx_attachment_entity', 'entity_type', 'entity_id'),
    )

# =====================================
# NOTIFICATIONS & ACTIVITY
# =====================================

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Notification Content
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Target Entity
    entity_type = Column(Enum(EntityType))
    entity_id = Column(String(36))
    
    # Action Info
    action_url = Column(String(500))
    action_text = Column(String(100))
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    is_email_sent = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    __table_args__ = (
        Index('idx_notification_user_unread', 'user_id', 'is_read'),
        Index('idx_notification_entity', 'entity_type', 'entity_id'),
    )

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Activity Details
    activity_type = Column(Enum(ActivityType), nullable=False)
    description = Column(Text, nullable=False)
    
    # Target Entity
    entity_type = Column(Enum(EntityType), nullable=False)
    entity_id = Column(String(36), nullable=False)
    
    # Change Details
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # Context
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="activities")
    
    __table_args__ = (
        Index('idx_activity_entity', 'entity_type', 'entity_id'),
        Index('idx_activity_user_date', 'user_id', 'created_at'),
    )

# =====================================
# TAGS & LABELS
# =====================================

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    
    # Tag Info
    name = Column(String(100), nullable=False)
    color = Column(String(7), nullable=False)  # Hex color
    description = Column(Text)
    
    # Usage
    usage_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    project = relationship("Project")
    creator = relationship("User", foreign_keys=[created_by])
    
    __table_args__ = (
        UniqueConstraint('project_id', 'name', name='unique_project_tag'),
    )

class EntityTag(Base):
    __tablename__ = "entity_tags"
    
    id = Column(String(36), primary_key=True)
    tag_id = Column(String(36), ForeignKey("tags.id"), nullable=False)
    
    # Target Entity
    entity_type = Column(Enum(EntityType), nullable=False)
    entity_id = Column(String(36), nullable=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    tag = relationship("Tag")
    creator = relationship("User", foreign_keys=[created_by])
    
    __table_args__ = (
        UniqueConstraint('tag_id', 'entity_type', 'entity_id', name='unique_entity_tag'),
        Index('idx_entity_tag_target', 'entity_type', 'entity_id'),
    )

# =====================================
# SEARCH & INDEXING
# =====================================

class SearchIndex(Base):
    __tablename__ = "search_index"
    
    id = Column(String(36), primary_key=True)
    
    # Target Entity
    entity_type = Column(Enum(EntityType), nullable=False)
    entity_id = Column(String(36), nullable=False)
    
    # Search Content
    title = Column(String(500))
    content = Column(Text)
    tags = Column(String(500))  # Comma-separated tags
    
    # Metadata
    project_id = Column(String(36), ForeignKey("projects.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project")
    
    __table_args__ = (
        UniqueConstraint('entity_type', 'entity_id', name='unique_search_entity'),
        Index('idx_search_content', 'title', 'content'),  # Full-text search index
        Index('idx_search_project', 'project_id'),
    )

# =====================================
# CONFIGURATION & SETTINGS
# =====================================

class ProjectSetting(Base):
    __tablename__ = "project_settings"
    
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    
    # Setting
    key = Column(String(100), nullable=False)
    value = Column(Text)
    value_type = Column(String(20), default="string")  # string, number, boolean, json
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    project = relationship("Project")
    updater = relationship("User", foreign_keys=[updated_by])
    
    __table_args__ = (
        UniqueConstraint('project_id', 'key', name='unique_project_setting'),
    )

# =====================================
# IMPORT UUID FOR PRIMARY KEYS
# =====================================

import uuid 