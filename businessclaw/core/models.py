from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class CompanyStatus(StrEnum):
    RUNNING = "running"
    PAUSED = "paused"


class EmployeeStatus(StrEnum):
    IDLE = "idle"
    WORKING = "working"
    WAITING = "waiting"
    PAUSED = "paused"


class TaskStatus(StrEnum):
    BACKLOG = "backlog"
    ACTIVE = "active"
    BLOCKED = "blocked"
    DONE = "done"
    ABANDONED = "abandoned"


class TaskPriority(StrEnum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class AuditEvent(BaseModel):
    id: str = Field(default_factory=lambda: new_id("evt"))
    created_at: datetime = Field(default_factory=utc_now)
    kind: str
    actor: str = "businessclaw"
    message: str
    data: dict[str, Any] = Field(default_factory=dict)


class Employee(BaseModel):
    id: str = Field(default_factory=lambda: new_id("emp"))
    name: str
    role: str
    status: EmployeeStatus = EmployeeStatus.IDLE
    current_task: str | None = None
    daily_objective: str | None = None
    weekly_objective: str | None = None
    memory: list[str] = Field(default_factory=list)
    relationships: dict[str, str] = Field(default_factory=dict)
    reporting_preferences: str = (
        "Use concise Discord markdown. Report what changed, what is next, and any blocker. "
        "Owners may change this preference at any time."
    )
    recent_action_fingerprints: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class CompanyTask(BaseModel):
    id: str = Field(default_factory=lambda: new_id("task"))
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.BACKLOG
    priority: TaskPriority = TaskPriority.NORMAL
    assigned_employee_id: str | None = None
    source: str = "system"
    expected_value: str | None = None
    next_action: str | None = None
    result: str | None = None
    loop_count: int = 0
    fingerprint: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class CompanyState(BaseModel):
    status: CompanyStatus = CompanyStatus.RUNNING
    goal: str = "Make as much legal revenue as possible while protecting the business."
    employees: list[Employee] = Field(default_factory=list)
    tasks: list[CompanyTask] = Field(default_factory=list)
    active_tasks: list[str] = Field(default_factory=list)
    earned_capital_usd: float = 0
    owner_funds_usd: float = 0
    company_memory: list[str] = Field(default_factory=list)
    operating_style: str = (
        "Keep moving toward legal revenue. Avoid repeating the same action without new evidence. "
        "Prefer concrete experiments, useful tools, and clear owner-visible progress."
    )
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class CommandRequest(BaseModel):
    command: str
    args: dict[str, Any] = Field(default_factory=dict)
    actor: str = "owner"
    actor_name: str | None = None


class CommandResponse(BaseModel):
    ok: bool
    message: str
    data: dict[str, Any] = Field(default_factory=dict)


class DiscordContext(BaseModel):
    guild_id: str | None = None
    channel_id: str | None = None
    thread_id: str | None = None
    message_id: str | None = None


class EmployeeMessageRequest(BaseModel):
    employee: str
    message: str
    owner_id: str
    owner_name: str
    discord: DiscordContext = Field(default_factory=DiscordContext)


class EmployeeMessageResponse(BaseModel):
    ok: bool
    employee_id: str | None = None
    employee_name: str | None = None
    employee_role: str | None = None
    speaker: str | None = None
    markdown: str
    data: dict[str, Any] = Field(default_factory=dict)


class TaskCreateRequest(BaseModel):
    title: str
    description: str = ""
    employee: str | None = None
    priority: TaskPriority = TaskPriority.NORMAL
    expected_value: str | None = None
    source: str = "owner"


class ReportingPreferenceRequest(BaseModel):
    employee: str
    preferences: str
    owner_id: str = "owner"
    owner_name: str | None = None


class WorkCycleRequest(BaseModel):
    employee: str | None = None
    cycles: int = 1
    owner_visible: bool = True


class WorkCycleResult(BaseModel):
    ok: bool
    markdown: str
    employee_id: str | None = None
    employee_name: str | None = None
    task_id: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
