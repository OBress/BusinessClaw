# BusinessClaw Autonomy

BusinessClaw should keep moving without needing constant owner input.

Owners are board members. The company can ask them for advice, but routine operations should be self-directed.

## OpenClaw Mechanisms

Use OpenClaw for autonomy:

- Heartbeats.
- Cron jobs.
- TaskFlow.
- Standing orders.
- Multi-agent routing.
- Skills/plugins.

## Planned Jobs

The repo includes:

```powershell
.\scripts\stage-autonomy-jobs.ps1
```

For Linux/VPS:

```bash
./scripts/stage-autonomy-jobs.sh
```

It stages disabled cron jobs:

- `BusinessClaw Company Momentum` for Claw every hour.
- `BusinessClaw Finance Review` for Ledger every 6 hours.
- `BusinessClaw Tool Improvement` for Forge every 4 hours.

They are disabled by default because model auth must work first. Once model auth is configured:

```powershell
openclaw models status
.\scripts\stage-autonomy-jobs.ps1
openclaw cron list
openclaw cron enable <job-id>
```

## Anti-Loop Rules

BusinessClaw standing orders require:

- If an approach fails twice, change strategy.
- Prefer concrete experiments over abstract planning.
- Turn repeated workflows into skills/plugins.
- Report blockers and pivots.
- Keep employee coordination bounded and useful.

## Employee Communication

Employees can communicate via Discord once the OpenClaw Discord bot channel is enabled.

For now:

- `claw` owns strategy and board communication.
- `ledger` owns finance and wallet/bank level.
- `forge` owns tools, skills, and integrations.

Future employees can be hired through the `businessclaw-org` skill.
