import json
from pathlib import Path
from typing import Any

from businessclaw.core.audit import AuditLog
from businessclaw.core.models import AuditEvent
from businessclaw.settings import Settings
from businessclaw.tools.base import Tool, ToolDefinition, ToolResult
from businessclaw.tools.builtin import EchoTool, HttpRequestTool, LocalNoteTool, TimeTool


class ManifestTool(Tool):
    def __init__(self, definition: ToolDefinition, manifest_path: Path) -> None:
        self.definition = definition
        self.manifest_path = manifest_path

    async def run(self, args: dict[str, Any]) -> ToolResult:
        return ToolResult(
            ok=False,
            message="Manifest tool is registered but has no executable adapter yet.",
            data={"manifest": str(self.manifest_path), "args": args},
        )


class ToolRegistry:
    def __init__(self, audit_log: AuditLog) -> None:
        self.audit_log = audit_log
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.definition.name] = tool

    def list_tools(self) -> list[ToolDefinition]:
        return [tool.definition for tool in self._tools.values()]

    async def run(self, name: str, args: dict[str, Any], actor: str = "businessclaw") -> ToolResult:
        tool = self._tools.get(name)
        if not tool:
            return ToolResult(ok=False, message=f"Unknown tool: {name}")
        self.audit_log.append(
            AuditEvent(
                kind="tool.started",
                actor=actor,
                message=f"Tool started: {name}",
                data={"tool": name, "args": scrub_sensitive(args)},
            )
        )
        result = await tool.run(args)
        self.audit_log.append(
            AuditEvent(
                kind="tool.finished",
                actor=actor,
                message=f"Tool finished: {name}",
                data={"tool": name, "ok": result.ok, "message": result.message},
            )
        )
        return result

    def load_manifests(self, tools_path: str) -> None:
        root = Path(tools_path)
        if not root.exists():
            return
        for manifest in root.rglob("tool.json"):
            data = json.loads(manifest.read_text(encoding="utf-8"))
            definition = ToolDefinition.model_validate(data)
            self.register(ManifestTool(definition=definition, manifest_path=manifest))


def scrub_sensitive(data: dict[str, Any]) -> dict[str, Any]:
    scrubbed: dict[str, Any] = {}
    sensitive_markers = ("key", "token", "secret", "password", "seed", "cookie")
    for key, value in data.items():
        if any(marker in key.lower() for marker in sensitive_markers):
            scrubbed[key] = "[redacted]"
        else:
            scrubbed[key] = value
    return scrubbed


def build_default_registry(settings: Settings, audit_log: AuditLog) -> ToolRegistry:
    registry = ToolRegistry(audit_log=audit_log)
    registry.register(EchoTool())
    registry.register(TimeTool())
    registry.register(LocalNoteTool())
    registry.register(HttpRequestTool())
    registry.load_manifests(settings.tools_path)
    return registry

