---
name: businessclaw-wallet
description: Track BusinessClaw crypto wallet receive addresses, read-only EVM balances, and transaction records without exposing private keys.
version: 0.1.0
metadata:
  openclaw:
    requires:
      bins:
        - node
    envVars:
      - name: BUSINESSCLAW_WALLET_PATH
        required: false
        description: Optional path to the BusinessClaw wallet JSON file.
      - name: BUSINESSCLAW_WALLET_PUBLIC_ADDRESS
        required: false
        description: Default public receive address.
      - name: BUSINESSCLAW_WALLET_CHAIN
        required: false
        description: Chain label such as ethereum, base, polygon, arbitrum, or optimism.
      - name: BUSINESSCLAW_WALLET_RPC_URL
        required: false
        description: Optional EVM RPC URL for read-only native balance checks.
---

# BusinessClaw Wallet Skill

Use this skill when BusinessClaw needs wallet receive information, public balance checks, spend intent records, or transaction history.

## Safety Model

- Public addresses are okay to display.
- Private keys, seed phrases, exchange logins, session cookies, and signing secrets must never be placed in prompts, Discord, logs, or this JSON file.
- The normal agent workflow is receive, inspect, propose, record. Signing and broadcasting should happen through a hardened wallet service or manual operator workflow later.
- Earned capital may be spent according to standing orders; owner-funded spending requires explicit owner approval.
- All wallet movement must be reflected in the ledger skill.

## Local CLI Helper

This skill includes `bin/businessclaw-wallet.mjs`.

Examples:

```powershell
node skills/businessclaw-wallet/bin/businessclaw-wallet.mjs status
node skills/businessclaw-wallet/bin/businessclaw-wallet.mjs set-address --address 0x0000000000000000000000000000000000000000 --chain base
node skills/businessclaw-wallet/bin/businessclaw-wallet.mjs balance
node skills/businessclaw-wallet/bin/businessclaw-wallet.mjs receive-note --source "customer payment" --expected-asset USDC --expected-amount 12.50
node skills/businessclaw-wallet/bin/businessclaw-wallet.mjs spend-intent --amount 5 --asset USDC --purpose "buy test API credits"
node skills/businessclaw-wallet/bin/businessclaw-wallet.mjs record-tx --hash 0xabc --direction inbound --asset USDC --amount 12.50 --counterparty "customer"
```

By default it writes to:

```text
data/businessclaw-wallet.json
```

