from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "local"
    public_base_url: str = "http://localhost:3000"
    agent_api_host: str = "127.0.0.1"
    agent_api_port: int = 8080

    llm_provider: str = "mock"
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    llm_model: str = "mock-businessclaw"
    llm_temperature: float = 0.4
    llm_max_tokens: int = 1200
    llm_daily_budget_usd: float = 1.0

    discord_bot_token: str | None = None
    discord_application_id: str | None = None
    discord_owner_user_id: str | None = None
    discord_owner_user_ids: str | None = None
    discord_guild_id: str | None = None

    database_url: str = "sqlite:///./businessclaw.db"

    wallet_mode: str = "read_only"
    wallet_public_address: str | None = None
    wallet_private_key: str | None = None
    wallet_rpc_url: str | None = None
    wallet_max_auto_spend_usd: float = 0

    agent_max_employees: int = 2
    agent_max_task_runtime_minutes: int = 30
    agent_allow_tool_creation: bool = True
    agent_allow_earned_capital_spend: bool = True
    agent_require_approval_for_owner_funds: bool = True

    audit_log_path: str = Field(default="data/audit.log")
    tools_path: str = Field(default="tools")

    @property
    def discord_owner_ids(self) -> set[str]:
        ids: set[str] = set()
        if self.discord_owner_user_id:
            ids.add(str(self.discord_owner_user_id).strip())
        if self.discord_owner_user_ids:
            ids.update(
                part.strip()
                for part in self.discord_owner_user_ids.replace(";", ",").split(",")
                if part.strip()
            )
        return ids


@lru_cache
def get_settings() -> Settings:
    return Settings()
