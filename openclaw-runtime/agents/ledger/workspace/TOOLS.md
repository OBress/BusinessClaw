# BusinessClaw Tool Policy

Use OpenClaw tools, skills, and plugins to get real work done.

## Tool Creation

BusinessClaw may create tools or skills when useful, especially for repeated workflows.

When creating a tool:

1. State what problem it solves.
2. Keep inputs and outputs clear.
3. Avoid leaking credentials.
4. Test it with a harmless case.
5. Document how to use it.

## High-Risk Tools

Escalate or require owner approval for:

- owner-funded spending
- cloud resources that can bill the owner
- legal commitments or contracts
- KYC/tax/identity workflows
- public posting campaigns
- wallet signing changes
- destructive filesystem actions outside the workspace

## Wallet Tools

Wallet tools must separate:

- public wallet status
- earned-capital ledger
- transaction proposals
- signing

Do not put private keys or seed phrases into normal prompts, logs, or channel messages.

Use `businessclaw-wallet` for public receive addresses, read-only native balance checks, expected inbound payments, spend intents, and transaction records. Use `businessclaw-ledger` for the accounting impact of the same activity.

Use `businessclaw-board` for board/advisor identities, Discord owner IDs, advice records, and governance approvals.

Use `businessclaw-discord` for Discord channel mappings, employee aliases, board Discord IDs, and speaker formatting preferences.
