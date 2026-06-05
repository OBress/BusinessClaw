from businessclaw.llm.anthropic import AnthropicProvider
from businessclaw.llm.base import LLMProvider
from businessclaw.llm.mock import MockLLMProvider
from businessclaw.llm.openai_compatible import OpenAICompatibleProvider
from businessclaw.settings import Settings


def build_llm_provider(settings: Settings) -> LLMProvider:
    provider = settings.llm_provider.lower().strip()
    api_key = settings.llm_api_key or settings.openai_api_key or settings.anthropic_api_key

    if provider == "mock":
        return MockLLMProvider(model=settings.llm_model)

    if provider in {"openai", "openai_compatible", "openrouter", "lmstudio", "vllm", "ollama"}:
        base_url = settings.llm_base_url
        if not base_url:
            base_url = "https://api.openai.com/v1" if provider == "openai" else "http://localhost:1234/v1"
        return OpenAICompatibleProvider(
            base_url=base_url,
            api_key=api_key,
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )

    if provider in {"anthropic", "claude"}:
        anthropic_key = settings.llm_api_key or settings.anthropic_api_key
        if not anthropic_key:
            raise ValueError("LLM_API_KEY is required for Anthropic.")
        return AnthropicProvider(
            base_url=settings.llm_base_url or "https://api.anthropic.com",
            api_key=anthropic_key,
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )

    raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")
