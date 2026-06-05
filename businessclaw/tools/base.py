from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class ToolDefinition(BaseModel):
    name: str
    description: str
    risk_level: str = "low"
    can_create_external_effects: bool = False
    requires_owner_approval: bool = False
    input_schema: dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    ok: bool
    message: str
    data: dict[str, Any] = Field(default_factory=dict)


class Tool(ABC):
    definition: ToolDefinition

    @abstractmethod
    async def run(self, args: dict[str, Any]) -> ToolResult:
        """Run the tool."""

