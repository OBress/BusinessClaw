from typing import Any, Protocol

from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    role: str
    content: str


class LLMResult(BaseModel):
    provider: str
    model: str
    content: str
    raw: dict[str, Any] = Field(default_factory=dict)


class LLMProvider(Protocol):
    name: str
    model: str

    async def complete(self, messages: list[dict[str, Any] | LLMMessage]) -> LLMResult:
        """Return a chat completion for normalized messages."""


def normalize_messages(messages: list[dict[str, Any] | LLMMessage]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for message in messages:
        if isinstance(message, LLMMessage):
            normalized.append(message.model_dump())
        else:
            normalized.append(
                {
                    "role": str(message.get("role", "user")),
                    "content": str(message.get("content", "")),
                }
            )
    return normalized

