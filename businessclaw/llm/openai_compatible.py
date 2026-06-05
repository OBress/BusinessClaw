from typing import Any

import httpx

from businessclaw.llm.base import LLMMessage, LLMResult, normalize_messages


class OpenAICompatibleProvider:
    name = "openai_compatible"

    def __init__(
        self,
        base_url: str,
        api_key: str | None,
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
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": normalize_messages(messages),
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        return LLMResult(provider=self.name, model=self.model, content=content, raw=data)

