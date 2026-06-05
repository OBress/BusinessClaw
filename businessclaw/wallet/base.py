from typing import Protocol

from pydantic import BaseModel, Field


class WalletStatus(BaseModel):
    mode: str
    address: str | None = None
    network: str | None = None
    native_balance: str | None = None
    spend_policy: dict = Field(default_factory=dict)


class TransactionProposal(BaseModel):
    to_address: str
    amount_native: str
    reason: str
    source: str = "earned_capital"


class WalletAdapter(Protocol):
    async def status(self) -> WalletStatus:
        """Return wallet status without exposing signing material."""

    async def propose_transaction(self, proposal: TransactionProposal) -> dict:
        """Create a transaction proposal without signing by default."""

