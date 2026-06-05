# Local Development

BusinessClaw local development should start with OpenClaw.

## Prerequisites

- Node.js 22.19+ or Node 24.
- OpenClaw.
- A model provider API key or local model endpoint.
- Discord bot/application credentials if using Discord.
- Python is only needed for the old prototype code or future helper scripts.

## Install OpenClaw

The OpenClaw getting-started docs list this PowerShell install command:

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

Then run:

```powershell
openclaw onboard --install-daemon
openclaw gateway status
openclaw dashboard
```

The current shell did not have `openclaw` on PATH when this repo was pivoted.

This repo also includes a helper:

```powershell
.\scripts\setup-businessclaw-openclaw.ps1
```

## Apply BusinessClaw Workspace Files

After OpenClaw is installed, locate the OpenClaw workspace. Then copy:

```text
openclaw-workspace/main/AGENTS.md
openclaw-workspace/main/SOUL.md
openclaw-workspace/main/TOOLS.md
openclaw-workspace/main/MEMORY.md
openclaw-workspace/main/standing-orders.md
```

into the main OpenClaw workspace.

## Configure Employees

Create OpenClaw agents:

- `claw`
- `ledger`
- `forge`

Give each agent:

- separate workspace
- separate `agentDir`
- clear Discord routing or mention patterns
- role-specific instructions from `openclaw-workspace/agents/`

## Discord

Use OpenClaw's Discord channel instead of the custom Python Discord bot.

Configure:

- owner allowlist/access group
- group chat routing
- employee mention patterns
- bot-loop protection

## Skills

BusinessClaw currently includes:

```text
openclaw-workspace/skills/businessclaw-ledger/SKILL.md
openclaw-workspace/skills/businessclaw-org/SKILL.md
openclaw-workspace/skills/businessclaw-revenue/SKILL.md
openclaw-workspace/skills/businessclaw-wallet/SKILL.md
openclaw-workspace/skills/businessclaw-board/SKILL.md
openclaw-workspace/skills/businessclaw-discord/SKILL.md
```

These cover employee structure, board/advisor records, Discord routing, earned-capital ledger, revenue experiments, wallet receive/balance records, spend intents, and transaction filing.

## Dashboard

The dashboard is display-only and currently uses OpenClaw CLI JSON because `@openclaw/sdk` was not available from npm in this environment.

Target capabilities:

- list agents
- list tasks
- stream runs/events
- inspect approvals
- render employee states
- render wallet/revenue statistics

Run:

```powershell
.\scripts\start-dashboard.ps1
```

Open:

```text
http://127.0.0.1:4177
```

## Readiness Verification

Run:

```powershell
.\scripts\verify-businessclaw.ps1
```

Warnings are expected while local development has no OpenAI auth and Discord is disabled. Failures should be fixed before VPS deployment.

## Prototype Code

The Python code in `businessclaw/` is now reference/prototype code. Avoid expanding it unless it becomes a helper service for the dashboard or a temporary test harness.
