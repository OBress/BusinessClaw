from typing import Any

from businessclaw.llm.base import LLMMessage, LLMResult, normalize_messages


class MockLLMProvider:
    name = "mock"

    def __init__(self, model: str = "mock-businessclaw") -> None:
        self.model = model

    async def complete(self, messages: list[dict[str, Any] | LLMMessage]) -> LLMResult:
        normalized = normalize_messages(messages)
        latest = normalized[-1]["content"] if normalized else ""
        return LLMResult(
            provider=self.name,
            model=self.model,
            content=f"Mock BusinessClaw response. Last message: {latest}",
            raw={"messages": normalized},
        )

