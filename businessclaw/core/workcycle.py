from hashlib import sha256

from businessclaw.core.models import (
    CompanyTask,
    CompanyStatus,
    Employee,
    EmployeeStatus,
    TaskStatus,
    WorkCycleRequest,
    WorkCycleResult,
    utc_now,
)
from businessclaw.core.runtime import BusinessClawRuntime
from businessclaw.llm.base import LLMProvider


class WorkCycleService:
    def __init__(self, runtime: BusinessClawRuntime, llm_provider: LLMProvider) -> None:
        self.runtime = runtime
        self.llm_provider = llm_provider

    async def run_cycle(self, request: WorkCycleRequest) -> WorkCycleResult:
        if self.runtime.state.status == CompanyStatus.PAUSED:
            return WorkCycleResult(ok=False, markdown="BusinessClaw is paused.")

        employee = self._choose_employee(request.employee)
        if not employee:
            return WorkCycleResult(ok=False, markdown="No employee available for work.")

        task = self._choose_task(employee)
        if not task:
            task = self._create_self_directed_task(employee)

        return await self._advance_task(employee, task, owner_visible=request.owner_visible)

    def _choose_employee(self, query: str | None) -> Employee | None:
        if query:
            return self.runtime.find_employee(query)
        available = [
            employee
            for employee in self.runtime.state.employees
            if employee.status in {EmployeeStatus.IDLE, EmployeeStatus.WAITING, EmployeeStatus.WORKING}
        ]
        if not available:
            return None
        return min(available, key=lambda employee: len(employee.recent_action_fingerprints))

    def _choose_task(self, employee: Employee) -> CompanyTask | None:
        assigned = [
            task
            for task in self.runtime.state.tasks
            if task.status in {TaskStatus.BACKLOG, TaskStatus.ACTIVE, TaskStatus.BLOCKED}
            and task.assigned_employee_id == employee.id
        ]
        shared = [
            task
            for task in self.runtime.state.tasks
            if task.status in {TaskStatus.BACKLOG, TaskStatus.ACTIVE}
            and task.assigned_employee_id is None
        ]
        candidates = assigned or shared
        if not candidates:
            return None
        priority_rank = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
        return sorted(
            candidates,
            key=lambda task: (priority_rank.get(str(task.priority), 9), task.loop_count, task.created_at),
        )[0]

    def _create_self_directed_task(self, employee: Employee) -> CompanyTask:
        task = CompanyTask(
            title="Find the next useful business-building action",
            description=(
                "Create forward motion for BusinessClaw without repeating recent actions. "
                "Favor legal revenue, tool creation, market research, or operational improvements."
            ),
            status=TaskStatus.BACKLOG,
            priority="normal",
            assigned_employee_id=employee.id,
            source="self_directed",
            expected_value="A new, concrete action that moves the business forward.",
        )
        self.runtime.state.tasks.append(task)
        self.runtime.log(
            "task.self_directed_created",
            f"{employee.name} created a self-directed task.",
            actor=employee.id,
            task_id=task.id,
        )
        return task

    async def _advance_task(
        self,
        employee: Employee,
        task: CompanyTask,
        owner_visible: bool,
    ) -> WorkCycleResult:
        fingerprint = self._fingerprint(employee, task)
        repeated = fingerprint in employee.recent_action_fingerprints
        if repeated:
            task.loop_count += 1
            task.status = TaskStatus.BLOCKED
            task.next_action = (
                "Choose a different approach because the previous action fingerprint repeated."
            )

        employee.status = EmployeeStatus.WORKING
        employee.current_task = task.title
        task.status = TaskStatus.ACTIVE
        task.fingerprint = fingerprint
        task.updated_at = utc_now()
        employee.updated_at = utc_now()

        peer_context = self._relationship_context(employee)
        system_prompt = (
            "You are an AI employee in BusinessClaw, an autonomous AI business. "
            f"Employee: {employee.name}. Role: {employee.role}. "
            "You are trying to create a real, legal, self-sustaining business. "
            "Avoid loops: do not repeat recent actions unless you have new evidence. "
            "Prefer concrete next steps, useful tools, experiments, customer value, and revenue. "
            "Use Discord-friendly markdown. Do not invent completed external actions."
        )
        user_prompt = "\n".join(
            [
                f"Company goal: {self.runtime.state.goal}",
                f"Operating style: {self.runtime.state.operating_style}",
                f"Reporting preferences: {employee.reporting_preferences}",
                f"Daily objective: {employee.daily_objective or 'None set'}",
                f"Weekly objective: {employee.weekly_objective or 'None set'}",
                f"Employee memory: {employee.memory[-8:]}",
                f"Peer relationships: {peer_context}",
                f"Task title: {task.title}",
                f"Task description: {task.description}",
                f"Expected value: {task.expected_value or 'Not specified'}",
                f"Repeated action detected: {repeated}",
                "Return a compact progress update with: what I did/thought, why it matters, next action.",
            ]
        )
        result = await self.llm_provider.complete(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )

        markdown = result.content.strip()
        task.next_action = self._extract_next_action(markdown)
        task.result = markdown
        employee.memory.append(f"Worked on {task.title}: {self._shorten(markdown)}")
        employee.memory = employee.memory[-25:]
        employee.recent_action_fingerprints.append(fingerprint)
        employee.recent_action_fingerprints = employee.recent_action_fingerprints[-12:]
        self._refresh_relationships(employee)
        self.runtime.state.updated_at = utc_now()

        self.runtime.log(
            "work_cycle.completed",
            f"{employee.name} advanced task: {task.title}",
            actor=employee.id,
            employee_id=employee.id,
            task_id=task.id,
            provider=result.provider,
            model=result.model,
            repeated=repeated,
            owner_visible=owner_visible,
        )

        return WorkCycleResult(
            ok=True,
            markdown=markdown,
            employee_id=employee.id,
            employee_name=employee.name,
            task_id=task.id,
            data={"task": task.model_dump(mode="json"), "repeated": repeated},
        )

    def _fingerprint(self, employee: Employee, task: CompanyTask) -> str:
        raw = "|".join(
            [
                employee.id,
                task.title.lower().strip(),
                (task.next_action or task.description or "").lower().strip()[:300],
            ]
        )
        return sha256(raw.encode("utf-8")).hexdigest()[:16]

    def _relationship_context(self, employee: Employee) -> dict[str, str]:
        return {
            other.name: employee.relationships.get(other.id, "No relationship note yet.")
            for other in self.runtime.state.employees
            if other.id != employee.id
        }

    def _refresh_relationships(self, employee: Employee) -> None:
        for other in self.runtime.state.employees:
            if other.id == employee.id:
                continue
            employee.relationships.setdefault(
                other.id,
                f"{other.name} is a colleague in {other.role}; coordinate when work overlaps.",
            )

    def _extract_next_action(self, markdown: str) -> str:
        for line in markdown.splitlines():
            lower = line.lower()
            if "next" in lower or "action" in lower:
                return line.strip("- *")
        return self._shorten(markdown)

    def _shorten(self, text: str, limit: int = 240) -> str:
        compact = " ".join(text.split())
        if len(compact) <= limit:
            return compact
        return compact[: limit - 3] + "..."

