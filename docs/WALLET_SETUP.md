# Wallet Setup

BusinessClaw can track a crypto wallet without storing private keys in prompts or repo files.

## Current Model

- Public receive address: safe to display on the dashboard and Discord when needed.
- Read-only balance check: optional, uses `BUSINESSCLAW_WALLET_RPC_URL`.
- Spend intent: records what the business wants to spend earned capital on.
- Transaction record: records completed wallet movement.
- Signing: external/hardened flow only for now.

This is intentionally not a hot-wallet signer yet. That keeps the early business observable and useful without turning ordinary agent logs into key custody.

## Local Environment

```powershell
$env:BUSINESSCLAW_WALLET_PUBLIC_ADDRESS="0x..."
$env:BUSINESSCLAW_WALLET_CHAIN="base"
$env:BUSINESSCLAW_WALLET_RPC_URL="https://..."
```

## Skill Commands

```powershell
node openclaw-runtime\workspace\skills\businessclaw-wallet\bin\businessclaw-wallet.mjs status
node openclaw-runtime\workspace\skills\businessclaw-wallet\bin\businessclaw-wallet.mjs set-address --address 0x0000000000000000000000000000000000000000 --chain base
node openclaw-runtime\workspace\skills\businessclaw-wallet\bin\businessclaw-wallet.mjs balance
node openclaw-runtime\workspace\skills\businessclaw-wallet\bin\businessclaw-wallet.mjs receive-note --source "customer payment" --expected-asset USDC --expected-amount 12.50
node openclaw-runtime\workspace\skills\businessclaw-wallet\bin\businessclaw-wallet.mjs spend-intent --amount 5 --asset USDC --purpose "buy API credits"
node openclaw-runtime\workspace\skills\businessclaw-wallet\bin\businessclaw-wallet.mjs record-tx --hash 0xabc --direction inbound --asset USDC --amount 12.50 --counterparty "customer"
```

## Ledger Link

Every actual movement of value should be mirrored into `businessclaw-ledger`.

```powershell
node openclaw-runtime\workspace\skills\businessclaw-ledger\bin\businessclaw-ledger.mjs add-entry --type revenue --amount 12.50 --source "wallet payment" --evidence "tx hash"
```

## Deployment

Set these in `/etc/businessclaw/businessclaw.env` on the VPS:

```bash
BUSINESSCLAW_WALLET_PATH=/home/ubuntu/businessclaw/data/businessclaw-wallet.json
BUSINESSCLAW_WALLET_PUBLIC_ADDRESS=0x...
BUSINESSCLAW_WALLET_CHAIN=base
BUSINESSCLAW_WALLET_RPC_URL=https://...
```

