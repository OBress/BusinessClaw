from businessclaw.core.audit import AuditLog
from businessclaw.core.models import (
    AuditEvent,
    CommandRequest,
    CommandResponse,
    CompanyTask,
    CompanyState,
    CompanyStatus,
    Employee,
    EmployeeMessageResponse,
    EmployeeStatus,
    ReportingPreferenceRequest,
    TaskCreateRequest,
    TaskStatus,
    utc_now,
)


class BusinessClawRuntime:
    def __init__(self, audit_log: AuditLog, max_employees: int) -> None:
        self.audit_log = audit_log
        self.max_employees = max_employees
        self.state = CompanyState()
        self._ensure_default_employees()

    def _ensure_default_employees(self) -> None:
        if self.state.employees:
            return
        self.state.employees.extend(
            [
                Employee(
                    name="Claw",
                    role="Chief Operator",
                    status=EmployeeStatus.IDLE,
                    daily_objective="Coordinate company operations and choose the next best legal action.",
                    weekly_objective="Develop repeatable revenue opportunities and improve company tools.",
                ),
                Employee(
                    name="Ledger",
                    role="Finance Analyst",
                    status=EmployeeStatus.IDLE,
                    daily_objective="Track wallet status, earned capital, and business spending.",
                    weekly_objective="Keep clean records separating owner funds from earned business funds.",
                ),
            ][: self.max_employees]
        )
        self.log("company.initialized", "Default AI employees initialized.")
        self._ensure_default_tasks()

    def _ensure_default_tasks(self) -> None:
        if self.state.tasks:
            return
        if not self.state.employees:
            return
        chief = self.state.employees[0]
        self.state.tasks.append(
            CompanyTask(
                title="Design the first legal revenue experiment",
                description=(
                    "Identify a small, legal, low-cost business experiment BusinessClaw can run "
                    "to create real value without owner-provided capital."
                ),
                status=TaskStatus.BACKLOG,
                priority="high",
                assigned_employee_id=chief.id,
                source="system",
                expected_value="A concrete first experiment with next actions.",
            )
        )

    def log(self, kind: str, message: str, actor: str = "businessclaw", **data: object) -> AuditEvent:
        event = AuditEvent(kind=kind, actor=actor, message=message, data=dict(data))
        self.audit_log.append(event)
        return event

    def status(self) -> CompanyState:
        return self.state

    def pause(self, actor: str = "owner") -> CommandResponse:
        self.state.status = CompanyStatus.PAUSED
        self.state.updated_at = utc_now()
        for employee in self.state.employees:
            employee.status = EmployeeStatus.PAUSED
            employee.updated_at = utc_now()
        self.log("company.paused", "Company paused by owner command.", actor=actor)
        return CommandResponse(ok=True, message="BusinessClaw is paused.")

    def resume(self, actor: str = "owner") -> CommandResponse:
        self.state.status = CompanyStatus.RUNNING
        self.state.updated_at = utc_now()
        for employee in self.state.employees:
            if employee.status == EmployeeStatus.PAUSED:
                employee.status = EmployeeStatus.IDLE
                employee.updated_at = utc_now()
        self.log("company.resumed", "Company resumed by owner command.", actor=actor)
        return CommandResponse(ok=True, message="BusinessClaw is running.")

    def set_goal(self, goal: str, actor: str = "owner") -> CommandResponse:
        self.state.goal = goal
        self.state.updated_at = utc_now()
        self.log("goal.updated", "Company goal updated.", actor=actor, goal=goal)
        return CommandResponse(ok=True, message="Goal updated.", data={"goal": goal})

    def list_employees(self) -> CommandResponse:
        return CommandResponse(
            ok=True,
            message="Current AI employee roster.",
            data={"employees": [employee.model_dump(mode="json") for employee in self.state.employees]},
        )

    def list_tasks(self, include_done: bool = False) -> CommandResponse:
        tasks = [
            task
            for task in self.state.tasks
            if include_done or task.status not in {TaskStatus.DONE, TaskStatus.ABANDONED}
        ]
        return CommandResponse(
            ok=True,
            message="Company task list.",
            data={"tasks": [task.model_dump(mode="json") for task in tasks]},
        )

    def create_task(self, request: TaskCreateRequest) -> CommandResponse:
        employee_id = None
        if request.employee:
            employee = self.find_employee(request.employee)
            if not employee:
                return CommandResponse(ok=False, message=f"Could not find employee: {request.employee}")
            employee_id = employee.id
        task = CompanyTask(
            title=request.title.strip(),
            description=request.description.strip(),
            priority=request.priority,
            assigned_employee_id=employee_id,
            source=request.source,
            expected_value=request.expected_value,
        )
        if not task.title:
            return CommandResponse(ok=False, message="Task title cannot be empty.")
        self.state.tasks.append(task)
        self.state.updated_at = utc_now()
        self.log(
            "task.created",
            f"Task created: {task.title}",
            actor=request.source,
            task_id=task.id,
            assigned_employee_id=employee_id,
        )
        return CommandResponse(ok=True, message="Task created.", data={"task": task.model_dump(mode="json")})

    def find_task(self, query: str) -> CompanyTask | None:
        normalized = query.strip().lower()
        if not normalized:
            return None
        for task in self.state.tasks:
            if task.id.lower() == normalized:
                return task
        for task in self.state.tasks:
            if normalized in task.title.lower():
                return task
        return None

    def update_reporting_preferences(self, request: ReportingPreferenceRequest) -> CommandResponse:
        employee = self.find_employee(request.employee)
        if not employee:
            return CommandResponse(ok=False, message=f"Could not find employee: {request.employee}")
        preferences = request.preferences.strip()
        if not preferences:
            return CommandResponse(ok=False, message="Reporting preferences cannot be empty.")
        employee.reporting_preferences = preferences
        employee.updated_at = utc_now()
        self.log(
            "employee.reporting_preferences_updated",
            f"{employee.name} reporting preferences updated.",
            actor=request.owner_id,
            owner_name=request.owner_name,
            employee_id=employee.id,
            preferences=preferences,
        )
        return CommandResponse(
            ok=True,
            message=f"Updated reporting preferences for {employee.name}.",
            data={"employee": employee.model_dump(mode="json")},
        )

    def find_employee(self, query: str) -> Employee | None:
        normalized = query.strip().lower()
        if not normalized:
            return None
        for employee in self.state.employees:
            if employee.id.lower() == normalized:
                return employee
            if employee.name.lower() == normalized:
                return employee
        for employee in self.state.employees:
            searchable = f"{employee.name} {employee.role}".lower()
            if normalized in searchable:
                return employee
        return None

    def get_employee_response(self, query: str) -> CommandResponse:
        employee = self.find_employee(query)
        if not employee:
            return CommandResponse(ok=False, message=f"Could not find employee: {query}")
        return CommandResponse(
            ok=True,
            message=f"Employee found: {employee.name}",
            data={"employee": employee.model_dump(mode="json")},
        )

    def record_employee_message(
        self,
        employee: Employee,
        owner_id: str,
        owner_name: str,
        message: str,
        response_markdown: str,
        discord_context: dict,
    ) -> EmployeeMessageResponse:
        employee.status = EmployeeStatus.WORKING
        employee.current_task = f"Responding to {owner_name} in Discord"
        employee.memory.append(f"{owner_name} asked: {message[:300]}")
        employee.memory = employee.memory[-25:]
        employee.updated_at = utc_now()
        self.state.updated_at = utc_now()
        self.log(
            "discord.employee_message",
            f"{owner_name} messaged {employee.name}.",
            actor=owner_id,
            owner_name=owner_name,
            employee_id=employee.id,
            employee_name=employee.name,
            owner_message=message,
            discord=discord_context,
        )
        self.log(
            "discord.employee_response",
            f"{employee.name} responded in Discord.",
            actor=employee.id,
            owner_id=owner_id,
            employee_id=employee.id,
            markdown=response_markdown,
        )
        return EmployeeMessageResponse(
            ok=True,
            employee_id=employee.id,
            employee_name=employee.name,
            employee_role=employee.role,
            speaker=f"{employee.name} - {employee.role}",
            markdown=response_markdown,
        )

    def handle_command(self, request: CommandRequest) -> CommandResponse:
        command = request.command.lower().strip()
        if command == "status":
            return CommandResponse(ok=True, message="Company status.", data=self.state.model_dump(mode="json"))
        if command == "pause":
            return self.pause(actor=request.actor)
        if command == "resume":
            return self.resume(actor=request.actor)
        if command == "goal":
            goal = str(request.args.get("goal", "")).strip()
            if not goal:
                return CommandResponse(ok=False, message="Missing goal.")
            return self.set_goal(goal, actor=request.actor)
        if command in {"employees", "employee_status"}:
            return self.list_employees()
        if command == "employee":
            query = str(request.args.get("employee", "")).strip()
            if not query:
                return CommandResponse(ok=False, message="Missing employee.")
            return self.get_employee_response(query)
        if command == "tasks":
            return self.list_tasks(include_done=bool(request.args.get("include_done", False)))
        if command == "task":
            title = str(request.args.get("title", "")).strip()
            if not title:
                return CommandResponse(ok=False, message="Missing task title.")
            return self.create_task(
                TaskCreateRequest(
                    title=title,
                    description=str(request.args.get("description", "")),
                    employee=request.args.get("employee"),
                    expected_value=request.args.get("expected_value"),
                    source=request.actor,
                )
            )
        if command == "reporting":
            return self.update_reporting_preferences(
                ReportingPreferenceRequest(
                    employee=str(request.args.get("employee", "")),
                    preferences=str(request.args.get("preferences", "")),
                    owner_id=request.actor,
                    owner_name=request.actor_name,
                )
            )
        self.log("command.unknown", "Unknown command received.", actor=request.actor, command=command)
        return CommandResponse(ok=False, message=f"Unknown command: {command}")
