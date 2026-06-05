from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from businessclaw.tools.base import Tool, ToolDefinition, ToolResult


class EchoTool(Tool):
    definition = ToolDefinition(
        name="echo",
        description="Return the provided message.",
        input_schema={"type": "object", "properties": {"message": {"type": "string"}}},
    )

    async def run(self, args: dict[str, Any]) -> ToolResult:
        return ToolResult(ok=True, message=str(args.get("message", "")))


class TimeTool(Tool):
    definition = ToolDefinition(name="time", description="Return the current UTC time.")

    async def run(self, args: dict[str, Any]) -> ToolResult:
        now = datetime.now(timezone.utc).isoformat()
        return ToolResult(ok=True, message=now, data={"utc": now})


class LocalNoteTool(Tool):
    definition = ToolDefinition(
        name="local_note",
        description="Append a note to the local company notes file.",
        can_create_external_effects=True,
        input_schema={"type": "object", "properties": {"note": {"type": "string"}}},
    )

    def __init__(self, path: str = "data/company_notes.md") -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    async def run(self, args: dict[str, Any]) -> ToolResult:
        note = str(args.get("note", "")).strip()
        if not note:
            return ToolResult(ok=False, message="Missing note.")
        timestamp = datetime.now(timezone.utc).isoformat()
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(f"- {timestamp}: {note}\n")
        return ToolResult(ok=True, message="Note recorded.", data={"path": str(self.path)})


class HttpRequestTool(Tool):
    definition = ToolDefinition(
        name="http_request",
        description="Make a basic HTTP request. Intended for APIs and public web resources.",
        risk_level="medium",
        can_create_external_effects=True,
        input_schema={
            "type": "object",
            "properties": {
                "method": {"type": "string", "enum": ["GET", "POST"]},
                "url": {"type": "string"},
                "json": {"type": "object"},
            },
        },
    )

    async def run(self, args: dict[str, Any]) -> ToolResult:
        method = str(args.get("method", "GET")).upper()
        url = str(args.get("url", "")).strip()
        if method not in {"GET", "POST"}:
            return ToolResult(ok=False, message="Only GET and POST are enabled.")
        if not url.startswith(("http://", "https://")):
            return ToolResult(ok=False, message="URL must start with http:// or https://.")
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.request(method, url, json=args.get("json"))
        text = response.text[:4000]
        return ToolResult(
            ok=response.is_success,
            message=f"HTTP {response.status_code}",
            data={"status_code": response.status_code, "text": text},
        )

