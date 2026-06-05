from decimal import Decimal

import httpx

from businessclaw.wallet.base import TransactionProposal, WalletStatus


class EVMReadOnlyWalletAdapter:
    def __init__(
        self,
        mode: str,
        address: str,
        rpc_url: str,
        allow_earned_spend: bool,
        network: str = "evm",
    ) -> None:
        self.mode = mode
        self.address = address
        self.rpc_url = rpc_url
        self.allow_earned_spend = allow_earned_spend
        self.network = network

    async def status(self) -> WalletStatus:
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_getBalance",
            "params": [self.address, "latest"],
            "id": 1,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(self.rpc_url, json=payload)
            response.raise_for_status()
            data = response.json()
        balance_wei = int(data.get("result", "0x0"), 16)
        balance_native = Decimal(balance_wei) / Decimal(10**18)
        return WalletStatus(
            mode=self.mode,
            address=self.address,
            network=self.network,
            native_balance=str(balance_native),
            spend_policy={"earned_capital_spend_allowed": self.allow_earned_spend},
        )

    async def propose_transaction(self, proposal: TransactionProposal) -> dict:
        return {
            "ok": True,
            "signed": False,
            "proposal": proposal.model_dump(),
            "message": "Read-only EVM wallet adapter does not sign transactions.",
        }

