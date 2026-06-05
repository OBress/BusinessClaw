from businessclaw.settings import Settings
from businessclaw.wallet.base import WalletAdapter
from businessclaw.wallet.evm import EVMReadOnlyWalletAdapter
from businessclaw.wallet.mock import MockWalletAdapter


def build_wallet_adapter(settings: Settings) -> WalletAdapter:
    if settings.wallet_public_address and settings.wallet_rpc_url:
        return EVMReadOnlyWalletAdapter(
            mode=settings.wallet_mode,
            address=settings.wallet_public_address,
            rpc_url=settings.wallet_rpc_url,
            allow_earned_spend=settings.agent_allow_earned_capital_spend,
        )
    return MockWalletAdapter(
        mode=settings.wallet_mode,
        address=settings.wallet_public_address,
        allow_earned_spend=settings.agent_allow_earned_capital_spend,
    )

