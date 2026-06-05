# Safety Rules

BusinessClaw should be highly autonomous. The project can pursue aggressive revenue goals, create tools, spend money it earns, and coordinate AI employees, while using clear rails that protect legality, the owner, other people, and the infrastructure.

## Hard Rules

1. The owner can pause the agent at any time.
2. The agent must log every external action.
3. The agent must never hide what it is doing from the owner.
4. The agent must not impersonate humans or misrepresent its identity.
5. The agent must obey platform terms, rate limits, and access controls.
6. The agent must not attempt to bypass captchas, bans, KYC, paywalls, or permission systems.
7. The agent must not perform illegal activity, fraud, spam, credential theft, market manipulation, or harassment.
8. The agent must not expose private keys, tokens, credentials, wallet seeds, session cookies, or auth material in prompts, logs, Discord messages, or public pages.
9. The agent must not spend owner-provided money.
10. The agent may spend money it earns if the earned-capital policy allows it.
11. The agent must keep wallet signing isolated from general reasoning and normal tool logs.
12. The agent must not create binding legal commitments without owner approval.

## Approval Gates

Require owner approval for:

- Any use of owner-provided money.
- Any cloud resource or subscription that could bill the owner.
- Any legal commitment, contract, KYC flow, tax filing, or employment relationship.
- Any action that could affect reputation, money, legal status, or account standing.
- Any employee spawning more than the configured company limit.

## Budget Limits

Suggested initial limits:

- Owner-funded LLM spend: `$1/day`.
- Cloud spend: `$0/day` until deployment is proven.
- Earned-capital automatic spend: allowed after revenue is confirmed.
- Employee concurrency: `2`.
- Max task runtime: `30 minutes`.

## Allowed Early Tools

- Discord owner commands.
- Web search/research.
- Local file operations inside the project directory.
- Dashboard status updates.
- Wallet balance read.
- Mock transaction proposal.
- Creating local tools for project tasks.

## Disabled Until Later

- Mass messaging.
- Account creation.
- Browser actions on financial services.
- Voice meeting participation.
- Unsupervised code deployment.
- Running arbitrary shell commands from Discord.

## Operating Principle

Autonomy should expand only after the logs, company ledger, earned-capital tracking, and kill switch are boringly reliable.
