from collections.abc import Iterable

DISCORD_MESSAGE_LIMIT = 2000
SAFE_MESSAGE_LIMIT = 1850


def inline_code(value: object) -> str:
    text = str(value).replace("`", "'")
    return f"`{text}`"


def employee_header(name: str, role: str | None = None) -> str:
    if role:
        return f"**{name}** _({role})_"
    return f"**{name}**"


def format_employee_response(name: str, role: str | None, markdown: str) -> str:
    body = markdown.strip() or "_No response._"
    return f"{employee_header(name, role)}\n{body}"


def format_employee_list(employees: Iterable[dict]) -> str:
    lines = ["**BusinessClaw Employees**"]
    for employee in employees:
        name = employee.get("name", "Unknown")
        role = employee.get("role", "No role")
        status = employee.get("status", "unknown")
        task = employee.get("current_task") or "No active task"
        daily = employee.get("daily_objective") or "No daily objective"
        weekly = employee.get("weekly_objective") or "No weekly objective"
        lines.append(
            "\n".join(
                [
                    f"- {employee_header(name, role)}",
                    f"  Status: {inline_code(status)}",
                    f"  Current: {task}",
                    f"  Daily: {daily}",
                    f"  Weekly: {weekly}",
                ]
            )
        )
    return "\n".join(lines)


def format_task_list(tasks: Iterable[dict]) -> str:
    lines = ["**BusinessClaw Tasks**"]
    for task in tasks:
        title = task.get("title", "Untitled")
        status = task.get("status", "unknown")
        priority = task.get("priority", "normal")
        next_action = task.get("next_action") or "No next action yet"
        expected_value = task.get("expected_value") or "No expected value noted"
        lines.append(
            "\n".join(
                [
                    f"- **{title}**",
                    f"  Status: {inline_code(status)} Priority: {inline_code(priority)}",
                    f"  Value: {expected_value}",
                    f"  Next: {next_action}",
                ]
            )
        )
    return "\n".join(lines)


def split_discord_message(markdown: str) -> list[str]:
    text = markdown.strip() or "_No content._"
    if len(text) <= DISCORD_MESSAGE_LIMIT:
        return [text]

    chunks: list[str] = []
    current = ""
    for line in text.splitlines():
        candidate = f"{current}\n{line}".strip() if current else line
        if len(candidate) <= SAFE_MESSAGE_LIMIT:
            current = candidate
            continue
        if current:
            chunks.append(current)
        while len(line) > SAFE_MESSAGE_LIMIT:
            chunks.append(line[:SAFE_MESSAGE_LIMIT])
            line = line[SAFE_MESSAGE_LIMIT:]
        current = line
    if current:
        chunks.append(current)
    return chunks
