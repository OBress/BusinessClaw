# OpenClaw Migration Checklist

Use this checklist to transfer BusinessClaw from the prototype runtime to OpenClaw.

## Local Install

- [ ] Install OpenClaw.
- [ ] Run onboarding.
- [ ] Verify `openclaw gateway status`.
- [ ] Open `openclaw dashboard`.
- [ ] Configure at least one model provider.
- [x] Local OpenClaw CLI installed.
- [x] Local Gateway service installed and running.

## Workspace

- [ ] Locate the OpenClaw workspace path.
- [ ] Copy `openclaw-workspace/main/AGENTS.md` into the main workspace.
- [ ] Copy `openclaw-workspace/main/SOUL.md`.
- [ ] Copy `openclaw-workspace/main/TOOLS.md`.
- [ ] Copy `openclaw-workspace/main/MEMORY.md`.
- [ ] Copy `openclaw-workspace/main/standing-orders.md`.
- [ ] Confirm the agent sees the files in a new session.

## Discord

- [ ] Configure OpenClaw Discord channel.
- [ ] Add owner allowlist/access group.
- [ ] Test a DM.
- [ ] Test a group channel.
- [ ] Configure mention/routing patterns for employee agents.
- [ ] Confirm bot-loop protection is enabled.
- [x] Discord plugin installed locally.
- [x] Discord token configured as env-backed secret ref.
- [ ] Provide real `DISCORD_BOT_TOKEN`.
- [ ] Enable `channels.discord.enabled`.

## Employees

- [ ] Create `claw` agent.
- [ ] Create `ledger` agent.
- [ ] Create `forge` agent.
- [ ] Give each agent a separate workspace.
- [ ] Give each agent a separate `agentDir`.
- [x] Local `claw`, `ledger`, and `forge` agents registered.
- [x] Local employee agent workspaces created.
- [ ] Verify messages route to the correct employee.
- [ ] Verify sessions and memory are separated.

## Skills

- [ ] Install or copy `openclaw-workspace/skills/businessclaw-ledger`.
- [ ] Verify OpenClaw recognizes the skill.
- [ ] Create first ledger entry.
- [ ] Build wallet read-only skill/plugin.
- [ ] Build revenue experiment tracker skill.
- [ ] Build dashboard export plugin.
- [x] BusinessClaw ledger skill created and recognized.
- [x] BusinessClaw org skill created and recognized.

## Automation

- [ ] Convert BusinessClaw standing orders into loaded workspace context.
- [ ] Add cron/heartbeat tasks for company momentum.
- [ ] Add weekly review task.
- [ ] Add stale-task detection.
- [ ] Add escalation rules.

## Dashboard

- [ ] Install `@openclaw/sdk` in the dashboard package.
- [ ] Connect to the Gateway.
- [ ] List agents.
- [ ] List/renders tasks.
- [ ] Stream run events.
- [ ] Render pixel office states.

## Deployment

- [ ] Decide Oracle Cloud Always Free vs paid VPS.
- [ ] Install OpenClaw on the server.
- [ ] Configure Gateway service.
- [ ] Configure domain and HTTPS.
- [ ] Configure backups for `~/.openclaw`.
- [ ] Configure uptime monitoring.
