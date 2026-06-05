from businessclaw.wallet.base import TransactionProposal, WalletStatus


class MockWalletAdapter:
    def __init__(self, mode: str, address: str | None, allow_earned_spend: bool) -> None:
        self.mode = mode
        self.address = address
        self.allow_earned_spend = allow_earned_spend

    async def status(self) -> WalletStatus:
        return WalletStatus(
            mode=self.mode,
            address=self.address,
            network="mock",
            native_balance="0",
            spend_policy={"earned_capital_spend_allowed": self.allow_earned_spend},
        )

    async def propose_transaction(self, proposal: TransactionProposal) -> dict:
        return {
            "ok": True,
            "signed": False,
            "proposal": proposal.model_dump(),
            "message": "Transaction proposal created. Signing adapter is not enabled.",
        }

