from typing import Any

import httpx

from businessclaw.llm.base import LLMMessage, LLMResult, normalize_messages


class AnthropicProvider:
    name = "anthropic"

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    async def complete(self, messages: list[dict[str, Any] | LLMMessage]) -> LLMResult:
        normalized = normalize_messages(messages)
        system_parts = [m["content"] for m in normalized if m["role"] == "system"]
        chat_messages = [m for m in normalized if m["role"] != "system"]
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": chat_messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        if system_parts:
            payload["system"] = "\n\n".join(system_parts)

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        text_parts = [part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"]
        return LLMResult(provider=self.name, model=self.model, content="\n".join(text_parts), raw=data)

