# BusinessClaw On OpenClaw

BusinessClaw should use OpenClaw as the core agent platform instead of maintaining a competing custom runtime.

## Why OpenClaw Is The Base

OpenClaw already provides the hardest infrastructure this project needs:

- A self-hosted Gateway for chat channels such as Discord, Slack, Telegram, WhatsApp, Signal, Matrix, iMessage, and others.
- Channel routing, group chat behavior, access groups, and bot-loop protection.
- Multi-agent routing with isolated agent workspaces, state directories, sessions, and bindings.
- Background tasks, cron jobs, hooks, standing orders, and Task Flow.
- Memory, compaction, context assembly, sessions, model providers, model failover, and approvals.
- Skills, plugins, ClawHub, browser control, filesystem/shell tools, and SDK access for external apps.
- App SDK support for dashboards and external services that need to inspect agents, runs, tasks, tools, artifacts, approvals, and events.

BusinessClaw should become the business-specific layer:

- OpenClaw workspace files defining identity, operating rules, standing orders, and employee roles.
- OpenClaw agents representing BusinessClaw employees.
- BusinessClaw skills/plugins for wallet status, earned-capital ledger, revenue experiments, company reporting, and future dashboard events.
- A pixel-art dashboard that reads OpenClaw Gateway state through the OpenClaw App SDK.

## Migration Strategy

### Keep

- `docs/`: project planning and BusinessClaw-specific rules.
- `openclaw-workspace/`: BusinessClaw workspace files to copy or sync into the OpenClaw workspace.
- Future dashboard code.
- Future OpenClaw skills/plugins.

### Demote

- `businessclaw/`: the Python FastAPI runtime should no longer be the main agent brain.
- Custom Discord bot code should be treated as prototype/reference only. OpenClaw should own Discord.
- Custom LLM provider layer should be replaced by OpenClaw model provider configuration.
- Custom task loop should be replaced by OpenClaw background tasks, standing orders, cron, Task Flow, and multi-agent routing.

### Build New

- BusinessClaw OpenClaw workspace bundle.
- OpenClaw agent configuration for employees.
- OpenClaw skills:
  - business wallet status
  - earned-capital ledger
  - organization/hiring/firing ledger
  - revenue experiment tracker
  - company state export for dashboard
- BusinessClaw dashboard using `@openclaw/sdk`.
- Deployment docs for Oracle Cloud Always Free / VPS running OpenClaw Gateway.

## Recommended OpenClaw Mapping

| BusinessClaw Need | OpenClaw Feature |
| --- | --- |
| Discord interaction | Discord channel plugin / Gateway |
| Multiple owners | Discord access groups / channel allowlists |
| Employees | Multi-agent routing or specialist agents |
| Employee memory | Per-agent workspace, session store, memory engine |
| Employee relationships | Workspace instructions plus shared memory notes |
| Continuous work | Standing orders, cron jobs, background tasks, Task Flow |
| Avoid loops | Standing-order execution rules, max retries, task verification, escalation rules |
| Tools | OpenClaw built-in tools, skills, plugins, ClawHub |
| LLM interchangeability | OpenClaw model providers, model CLI, failover |
| Wallet | Custom BusinessClaw skill/plugin with isolated signing policy |
| Website/dashboard | OpenClaw App SDK external dashboard |

## Initial Agent Plan

Start with three agents:

- `claw`: Chief Operator. Owns strategy, prioritization, and business direction.
- `ledger`: Finance and wallet analyst. Tracks earned capital and spend policy.
- `forge`: Tools and automation builder. Creates skills, scripts, and integrations.

Later add:

- `scout`: market research and lead discovery.
- `scribe`: content, reports, and public communication drafts.
- `closer`: sales/revenue experiments.

Each agent gets its own workspace and `agentDir` when using OpenClaw multi-agent mode. That keeps memory, sessions, and credentials separated.

## First Transfer Steps

1. Install OpenClaw locally.
2. Run OpenClaw onboarding and verify the Gateway.
3. Configure Discord through OpenClaw instead of the custom bot.
4. Copy `openclaw-workspace/main/` into the main OpenClaw workspace.
5. Create OpenClaw agents for `claw`, `ledger`, and `forge`.
6. Bind Discord routing/mentions to the agents.
7. Create the first BusinessClaw skill: earned-capital ledger.
8. Build the dashboard as an external app using `@openclaw/sdk`.

## Installation Notes

OpenClaw docs list:

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

Then:

```powershell
openclaw onboard --install-daemon
openclaw gateway status
openclaw dashboard
```

The current shell does not have `openclaw` on PATH yet.

## Important Caveat

The official site and docs present OpenClaw as an independent open-source project with community contributors and sponsors. The site links OpenAI as a sponsor and mentions the project creator/community, but do not assume every OpenClaw feature is maintained or guaranteed by OpenAI without checking the relevant repo/docs.
