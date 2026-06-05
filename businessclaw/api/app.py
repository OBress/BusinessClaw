import uvicorn
from fastapi import FastAPI

from businessclaw.core.audit import AuditLog
from businessclaw.core.models import (
    CommandRequest,
    CommandResponse,
    EmployeeMessageRequest,
    EmployeeMessageResponse,
    ReportingPreferenceRequest,
    TaskCreateRequest,
    WorkCycleRequest,
)
from businessclaw.core.runtime import BusinessClawRuntime
from businessclaw.core.workcycle import WorkCycleService
from businessclaw.llm.factory import build_llm_provider
from businessclaw.settings import get_settings
from businessclaw.tools.registry import build_default_registry
from businessclaw.wallet.base import TransactionProposal
from businessclaw.wallet.factory import build_wallet_adapter

settings = get_settings()
audit_log = AuditLog(settings.audit_log_path)
runtime = BusinessClawRuntime(audit_log=audit_log, max_employees=settings.agent_max_employees)
llm_provider = build_llm_provider(settings)
tool_registry = build_default_registry(settings, audit_log)
wallet_adapter = build_wallet_adapter(settings)
work_cycle_service = WorkCycleService(runtime=runtime, llm_provider=llm_provider)

app = FastAPI(title="BusinessClaw API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/status")
def status() -> dict:
    return runtime.status().model_dump(mode="json")


@app.get("/employees")
def employees() -> dict:
    return runtime.list_employees().data


@app.get("/employees/{employee_query}")
def employee(employee_query: str) -> dict:
    return runtime.get_employee_response(employee_query).model_dump(mode="json")


@app.post("/employees/reporting")
def employee_reporting(request: ReportingPreferenceRequest) -> dict:
    return runtime.update_reporting_preferences(request).model_dump(mode="json")


@app.get("/tasks")
def tasks(include_done: bool = False) -> dict:
    return runtime.list_tasks(include_done=include_done).data


@app.post("/tasks")
def create_task(request: TaskCreateRequest) -> dict:
    return runtime.create_task(request).model_dump(mode="json")


@app.post("/company/tick")
async def company_tick(request: WorkCycleRequest) -> dict:
    cycle_count = max(1, min(request.cycles, 5))
    results = []
    for _ in range(cycle_count):
        results.append((await work_cycle_service.run_cycle(request)).model_dump(mode="json"))
    return {"ok": all(result["ok"] for result in results), "results": results}


@app.get("/audit")
def audit(limit: int = 50) -> dict:
    return {"events": [event.model_dump(mode="json") for event in audit_log.tail(limit=limit)]}


@app.get("/tools")
def tools() -> dict:
    return {"tools": [tool.model_dump(mode="json") for tool in tool_registry.list_tools()]}


@app.post("/tools/{tool_name}/run")
async def run_tool(tool_name: str, payload: dict) -> dict:
    args = payload.get("args", payload)
    actor = str(payload.get("actor", "owner"))
    result = await tool_registry.run(tool_name, args=args, actor=actor)
    return result.model_dump(mode="json")


@app.get("/wallet/status")
async def wallet_status() -> dict:
    return (await wallet_adapter.status()).model_dump(mode="json")


@app.post("/wallet/propose")
async def wallet_propose(payload: dict) -> dict:
    proposal = TransactionProposal.model_validate(payload)
    result = await wallet_adapter.propose_transaction(proposal)
    runtime.log(
        "wallet.transaction_proposed",
        "Wallet transaction proposal created.",
        to_address=proposal.to_address,
        amount_native=proposal.amount_native,
        source=proposal.source,
    )
    return result


@app.post("/command", response_model=CommandResponse)
def command(request: CommandRequest) -> CommandResponse:
    return runtime.handle_command(request)


@app.post("/discord/employee-message", response_model=EmployeeMessageResponse)
async def discord_employee_message(request: EmployeeMessageRequest) -> EmployeeMessageResponse:
    employee = runtime.find_employee(request.employee)
    if not employee:
        return EmployeeMessageResponse(
            ok=False,
            markdown=(
                f"Could not find employee `{request.employee}`. "
                "Use `/employees` to see who is currently available."
            ),
        )

    system_prompt = (
        "You are an AI employee inside BusinessClaw, an autonomous AI business. "
        f"Your employee name is {employee.name}. Your role is {employee.role}. "
        f"Company goal: {runtime.state.goal}\n"
        f"Your daily objective: {employee.daily_objective or 'None set'}\n"
        f"Your weekly objective: {employee.weekly_objective or 'None set'}\n\n"
        "Reply directly to the owner in Discord. Use concise, proper Discord markdown. "
        "Make it obvious what you are doing next when useful. "
        "Do not claim to have done external actions unless a tool or system state confirms it. "
        "Stay legal, platform-compliant, and protect company credentials, wallets, and infrastructure."
    )
    user_prompt = (
        f"Owner {request.owner_name} ({request.owner_id}) says to {employee.name}:\n"
        f"{request.message}"
    )
    result = await llm_provider.complete(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    response = runtime.record_employee_message(
        employee=employee,
        owner_id=request.owner_id,
        owner_name=request.owner_name,
        message=request.message,
        response_markdown=result.content,
        discord_context=request.discord.model_dump(mode="json"),
    )
    runtime.log(
        "llm.employee_response",
        "LLM generated employee Discord response.",
        actor=employee.id,
        provider=result.provider,
        model=result.model,
        employee_id=employee.id,
    )
    return response


@app.post("/llm/complete")
async def complete(payload: dict) -> dict:
    messages = payload.get("messages", [])
    result = await llm_provider.complete(messages=messages)
    runtime.log(
        "llm.complete",
        "LLM completion requested.",
        provider=result.provider,
        model=result.model,
    )
    return result.model_dump(mode="json")


def run() -> None:
    uvicorn.run("businessclaw.api.app:app", host=settings.agent_api_host, port=settings.agent_api_port)
