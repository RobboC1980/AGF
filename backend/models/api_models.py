"""
AgileForge API Models (Pydantic Schemas)
Complete set of Pydantic models for request/response validation
"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum
import re

# =====================================
# ENUMS
# =====================================

class PriorityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class StatusType(str, Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    READY = "ready"
    IN_PROGRESS = "in-progress"
    REVIEW = "review"
    TESTING = "testing"
    DONE = "done"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class EntityType(str, Enum):
    PROJECT = "project"
    EPIC = "epic"
    STORY = "story"
    TASK = "task"
    SUBTASK = "subtask"
    BUG = "bug"
    SPIKE = "spike"

class UserRole(str, Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    PRODUCT_OWNER = "product_owner"
    SCRUM_MASTER = "scrum_master"
    DEVELOPER = "developer"
    TESTER = "tester"
    DESIGNER = "designer"
    STAKEHOLDER = "stakeholder"

class NotificationType(str, Enum):
    ASSIGNMENT = "assignment"
    STATUS_CHANGE = "status_change"
    COMMENT = "comment"
    MENTION = "mention"
    DUE_DATE = "due_date"
    OVERDUE = "overdue"

class ActivityType(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    ASSIGNED = "assigned"
    COMMENTED = "commented"
    STATUS_CHANGED = "status_changed"
    MOVED = "moved"

# =====================================
# BASE MODELS
# =====================================

class BaseEntityModel(BaseModel):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BaseCreateModel(BaseModel):
    pass

class BaseUpdateModel(BaseModel):
    pass

# =====================================
# USER MODELS
# =====================================

class UserBase(BaseModel):
    email: str = Field(..., max_length=255)
    username: str = Field(..., max_length=50)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    bio: Optional[str] = None
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=100)
    timezone: str = Field("UTC", max_length=50)
    language: str = Field("en", max_length=10)
    avatar_url: Optional[str] = Field(None, max_length=500)
    
    @field_validator('email')
    def validate_email(cls, v):
        # Basic email validation
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v.lower()
    
    @field_validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v.lower()

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = None
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=100)
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)
    avatar_url: Optional[str] = Field(None, max_length=500)
    theme: Optional[str] = Field(None, max_length=20)
    notifications_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None

class UserResponse(UserBase, BaseEntityModel):
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    theme: str = "light"
    notifications_enabled: bool = True
    email_notifications: bool = True

class UserSimple(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    class Config:
        from_attributes = True

# =====================================
# AUTHENTICATION MODELS
# =====================================

class LoginRequest(BaseModel):
    username: str = Field(..., max_length=255)
    password: str = Field(..., max_length=100)
    remember_me: bool = False

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: str = Field(..., max_length=255)

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

# =====================================
# PROJECT MODELS
# =====================================

class ProjectBase(BaseModel):
    name: str = Field(..., max_length=200)
    key: str = Field(..., max_length=10, regex=r'^[A-Z0-9]+$')
    description: Optional[str] = None
    vision: Optional[str] = None
    goals: Optional[List[Dict[str, Any]]] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, regex=r'^#[0-9A-Fa-f]{6}$')
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    status: StatusType = StatusType.BACKLOG
    priority: PriorityLevel = PriorityLevel.MEDIUM
    budget: Optional[float] = Field(None, ge=0)
    currency: str = Field("USD", max_length=3)
    estimated_hours: Optional[int] = Field(None, ge=0)
    is_private: bool = False
    methodology: str = Field("scrum", max_length=50)
    sprint_duration: int = Field(14, ge=1, le=365)
    story_point_scale: str = Field("fibonacci", max_length=50)

class ProjectCreate(ProjectBase):
    organization_id: str
    team_id: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    vision: Optional[str] = None
    goals: Optional[List[Dict[str, Any]]] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, regex=r'^#[0-9A-Fa-f]{6}$')
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    status: Optional[StatusType] = None
    priority: Optional[PriorityLevel] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    health_status: Optional[str] = Field(None, max_length=20)
    budget: Optional[float] = Field(None, ge=0)
    estimated_hours: Optional[int] = Field(None, ge=0)
    actual_hours: Optional[int] = Field(None, ge=0)
    is_private: Optional[bool] = None
    is_archived: Optional[bool] = None
    methodology: Optional[str] = Field(None, max_length=50)
    sprint_duration: Optional[int] = Field(None, ge=1, le=365)

class ProjectResponse(ProjectBase, BaseEntityModel):
    organization_id: str
    team_id: Optional[str] = None
    actual_end_date: Optional[date] = None
    progress: int = 0
    health_status: str = "green"
    actual_hours: int = 0
    is_archived: bool = False
    is_template: bool = False
    created_by: str
    creator: Optional[UserSimple] = None

# =====================================
# EPIC MODELS
# =====================================

class EpicBase(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    business_value: Optional[str] = None
    status: StatusType = StatusType.BACKLOG
    priority: PriorityLevel = PriorityLevel.MEDIUM
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    estimated_story_points: Optional[int] = Field(None, ge=0)
    roi_estimate: Optional[float] = None
    risk_level: str = Field("medium", max_length=20)

class EpicCreate(EpicBase):
    project_id: str
    parent_epic_id: Optional[str] = None

class EpicUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    business_value: Optional[str] = None
    status: Optional[StatusType] = None
    priority: Optional[PriorityLevel] = None
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    estimated_story_points: Optional[int] = Field(None, ge=0)
    actual_story_points: Optional[int] = Field(None, ge=0)
    progress: Optional[int] = Field(None, ge=0, le=100)
    roi_estimate: Optional[float] = None
    risk_level: Optional[str] = Field(None, max_length=20)

class EpicResponse(EpicBase, BaseEntityModel):
    project_id: str
    parent_epic_id: Optional[str] = None
    epic_key: str
    actual_end_date: Optional[date] = None
    actual_story_points: int = 0
    progress: int = 0
    created_by: str
    creator: Optional[UserSimple] = None
    stories_count: Optional[int] = 0
    completed_stories_count: Optional[int] = 0

# =====================================
# STORY MODELS
# =====================================

class StoryBase(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    as_a: Optional[str] = Field(None, max_length=200)
    i_want: Optional[str] = None
    so_that: Optional[str] = None
    acceptance_criteria: str = Field(..., min_length=1)
    definition_of_done: Optional[str] = None
    status: StatusType = StatusType.BACKLOG
    priority: PriorityLevel = PriorityLevel.MEDIUM
    story_type: EntityType = EntityType.STORY
    story_points: Optional[int] = Field(None, ge=1, le=21)
    estimated_hours: Optional[float] = Field(None, ge=0)
    due_date: Optional[date] = None
    business_value: Optional[int] = Field(None, ge=1, le=100)
    customer_priority: Optional[int] = Field(None, ge=1, le=100)

class StoryCreate(StoryBase):
    epic_id: str
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None

class StoryUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    as_a: Optional[str] = Field(None, max_length=200)
    i_want: Optional[str] = None
    so_that: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    definition_of_done: Optional[str] = None
    status: Optional[StatusType] = None
    priority: Optional[PriorityLevel] = None
    story_type: Optional[EntityType] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    sprint_id: Optional[str] = None
    story_points: Optional[int] = Field(None, ge=1, le=21)
    estimated_hours: Optional[float] = Field(None, ge=0)
    actual_hours: Optional[float] = Field(None, ge=0)
    remaining_hours: Optional[float] = Field(None, ge=0)
    due_date: Optional[date] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    business_value: Optional[int] = Field(None, ge=1, le=100)
    customer_priority: Optional[int] = Field(None, ge=1, le=100)

class StoryResponse(StoryBase, BaseEntityModel):
    epic_id: str
    sprint_id: Optional[str] = None
    story_key: str
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    actual_hours: float = 0
    remaining_hours: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    test_cases_count: int = 0
    passed_tests_count: int = 0
    bug_count: int = 0
    created_by: str
    assignee: Optional[UserSimple] = None
    reporter: Optional[UserSimple] = None
    creator: Optional[UserSimple] = None
    tasks_count: Optional[int] = 0
    completed_tasks_count: Optional[int] = 0

# =====================================
# TASK MODELS
# =====================================

class TaskBase(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    task_type: EntityType = EntityType.TASK
    status: StatusType = StatusType.TODO
    priority: PriorityLevel = PriorityLevel.MEDIUM
    estimated_hours: float = Field(..., ge=0.5, le=40)
    due_date: Optional[date] = None
    technical_notes: Optional[str] = None
    blockers: Optional[List[Dict[str, Any]]] = None
    dependencies: Optional[List[str]] = None
    is_blocked: bool = False
    blocker_reason: Optional[str] = None
    review_required: bool = False

class TaskCreate(TaskBase):
    story_id: str
    parent_task_id: Optional[str] = None
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    task_type: Optional[EntityType] = None
    status: Optional[StatusType] = None
    priority: Optional[PriorityLevel] = None
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    estimated_hours: Optional[float] = Field(None, ge=0.5, le=40)
    actual_hours: Optional[float] = Field(None, ge=0)
    remaining_hours: Optional[float] = Field(None, ge=0)
    due_date: Optional[date] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    technical_notes: Optional[str] = None
    blockers: Optional[List[Dict[str, Any]]] = None
    dependencies: Optional[List[str]] = None
    is_blocked: Optional[bool] = None
    blocker_reason: Optional[str] = None
    review_required: Optional[bool] = None

class TaskResponse(TaskBase, BaseEntityModel):
    story_id: str
    parent_task_id: Optional[str] = None
    task_key: str
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    actual_hours: float = 0
    remaining_hours: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: str
    assignee: Optional[UserSimple] = None
    reviewer: Optional[UserSimple] = None
    creator: Optional[UserSimple] = None
    subtasks_count: Optional[int] = 0
    completed_subtasks_count: Optional[int] = 0

# =====================================
# SPRINT MODELS
# =====================================

class SprintBase(BaseModel):
    name: str = Field(..., max_length=200)
    goal: Optional[str] = None
    description: Optional[str] = None
    start_date: date
    end_date: date
    team_capacity: Optional[float] = Field(None, ge=0)
    planned_story_points: Optional[int] = Field(None, ge=0)

class SprintCreate(SprintBase):
    project_id: str

class SprintUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    goal: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=20)
    team_capacity: Optional[float] = Field(None, ge=0)
    planned_story_points: Optional[int] = Field(None, ge=0)
    completed_story_points: Optional[int] = Field(None, ge=0)
    velocity: Optional[float] = Field(None, ge=0)
    burndown_data: Optional[Dict[str, Any]] = None
    scope_changes: Optional[int] = Field(None, ge=0)
    what_went_well: Optional[str] = None
    what_to_improve: Optional[str] = None
    action_items: Optional[List[Dict[str, Any]]] = None

class SprintResponse(SprintBase, BaseEntityModel):
    project_id: str
    sprint_number: int
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    status: str = "planning"
    completed_story_points: int = 0
    velocity: Optional[float] = None
    burndown_data: Optional[Dict[str, Any]] = None
    scope_changes: int = 0
    what_went_well: Optional[str] = None
    what_to_improve: Optional[str] = None
    action_items: Optional[List[Dict[str, Any]]] = None
    created_by: str
    creator: Optional[UserSimple] = None
    stories_count: Optional[int] = 0

# =====================================
# COMMENT MODELS
# =====================================

class CommentBase(BaseModel):
    content: str = Field(..., min_length=1)
    entity_type: EntityType
    entity_id: str

class CommentCreate(CommentBase):
    parent_comment_id: Optional[str] = None

class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)

class CommentResponse(CommentBase, BaseEntityModel):
    author_id: str
    parent_comment_id: Optional[str] = None
    thread_root_id: Optional[str] = None
    formatted_content: Optional[str] = None
    is_deleted: bool = False
    is_pinned: bool = False
    is_resolved: bool = False
    deleted_at: Optional[datetime] = None
    author: UserSimple
    reactions_count: Optional[Dict[str, int]] = None
    replies_count: Optional[int] = 0

# =====================================
# TIME TRACKING MODELS
# =====================================

class TimeLogBase(BaseModel):
    task_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: int = Field(..., ge=1)
    description: Optional[str] = None
    work_type: Optional[str] = Field(None, max_length=50)
    is_billable: bool = True

class TimeLogCreate(TimeLogBase):
    pass

class TimeLogUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    description: Optional[str] = None
    work_type: Optional[str] = Field(None, max_length=50)
    is_billable: Optional[bool] = None

class TimeLogResponse(TimeLogBase, BaseEntityModel):
    user_id: str
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    user: UserSimple
    approver: Optional[UserSimple] = None

# =====================================
# NOTIFICATION MODELS
# =====================================

class NotificationResponse(BaseEntityModel):
    user_id: str
    type: NotificationType
    title: str
    message: str
    entity_type: Optional[EntityType] = None
    entity_id: Optional[str] = None
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    is_email_sent: bool = False
    expires_at: Optional[datetime] = None

# =====================================
# SEARCH MODELS
# =====================================

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=255)
    entity_types: Optional[List[EntityType]] = None
    project_id: Optional[str] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)

class SearchResult(BaseModel):
    entity_type: EntityType
    entity_id: str
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    url: str
    score: float

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_count: int
    query: str
    execution_time_ms: int

# =====================================
# ANALYTICS MODELS
# =====================================

class ProjectMetrics(BaseModel):
    project_id: str
    total_epics: int
    total_stories: int
    total_tasks: int
    completed_stories: int
    completed_tasks: int
    total_story_points: int
    completed_story_points: int
    total_hours_logged: float
    average_story_completion_time: Optional[float] = None
    average_task_completion_time: Optional[float] = None
    velocity: Optional[float] = None
    burndown_trend: Optional[List[Dict[str, Any]]] = None

class UserMetrics(BaseModel):
    user_id: str
    total_assigned_stories: int
    completed_stories: int
    total_assigned_tasks: int
    completed_tasks: int
    total_hours_logged: float
    average_story_completion_time: Optional[float] = None
    average_task_completion_time: Optional[float] = None
    productivity_score: Optional[float] = None

# =====================================
# BULK OPERATION MODELS
# =====================================

class BulkUpdateRequest(BaseModel):
    entity_ids: List[str] = Field(..., min_items=1, max_items=100)
    updates: Dict[str, Any]

class BulkOperationResponse(BaseModel):
    successful_ids: List[str]
    failed_ids: List[str]
    errors: Dict[str, str]
    total_processed: int

# =====================================
# PAGINATION MODELS
# =====================================

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool

# =====================================
# FILTER MODELS
# =====================================

class EntityFilter(BaseModel):
    status: Optional[List[StatusType]] = None
    priority: Optional[List[PriorityLevel]] = None
    assignee_ids: Optional[List[str]] = None
    creator_ids: Optional[List[str]] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    created_from: Optional[datetime] = None
    created_to: Optional[datetime] = None
    tags: Optional[List[str]] = None
    search: Optional[str] = None

class SortParams(BaseModel):
    field: str
    direction: str = Field("asc", regex=r"^(asc|desc)$")

# =====================================
# ERROR MODELS
# =====================================

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ValidationErrorResponse(BaseModel):
    error: str = "validation_error"
    message: str
    field_errors: Dict[str, List[str]]
    timestamp: datetime = Field(default_factory=datetime.utcnow) 