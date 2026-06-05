---
name: businessclaw-ledger
description: Track BusinessClaw earned capital, owner funds separation, wallet status notes, and spending proposals.
version: 0.1.0
metadata:
  openclaw:
    requires:
      bins:
        - node
    envVars:
      - name: BUSINESSCLAW_LEDGER_PATH
        required: false
        description: Optional path to the BusinessClaw ledger markdown or JSON file.
      - name: BUSINESSCLAW_WALLET_PUBLIC_ADDRESS
        required: false
        description: Optional public wallet address for read-only status checks.
      - name: BUSINESSCLAW_WALLET_RPC_URL
        required: false
        description: Optional EVM RPC URL for read-only wallet status.
---

# BusinessClaw Ledger Skill

Use this skill when BusinessClaw needs to record earned capital, owner funds, wallet status, spending proposals, or business experiment costs.

## Principles

- Owner funds and earned business funds are separate.
- Owner-provided money requires explicit owner approval.
- Earned capital may be reinvested according to standing orders and wallet policy.
- Never expose private keys or seed phrases.
- Prefer append-only records with timestamps.

## Suggested Ledger Format

```markdown
## YYYY-MM-DD

- Type:
- Amount:
- Source:
- Owner funds involved:
- Earned funds involved:
- Wallet/address:
- Evidence:
- Notes:
```

## Local CLI Helper

This skill includes `bin/businessclaw-ledger.mjs`.

Examples:

```powershell
node skills/businessclaw-ledger/bin/businessclaw-ledger.mjs status
node skills/businessclaw-ledger/bin/businessclaw-ledger.mjs add-entry --type revenue --amount 12.50 --source "service sale" --notes "First earned capital"
node skills/businessclaw-ledger/bin/businessclaw-ledger.mjs proposal --amount 5 --purpose "buy domain email test" --expected-value "test outbound channel"
```

By default it writes to:

```text
data/businessclaw-ledger.json
```

## Spending Proposal Format

```markdown
## Proposal

- Proposed by:
- Amount:
- Source of funds:
- Purpose:
- Expected value:
- Risk:
- Approval required:
- Next step:
```
