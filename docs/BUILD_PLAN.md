# BusinessClaw Build Plan

This plan turns BusinessClaw into an OpenClaw-based autonomous AI business, then prepares it for 24/7 deployment.

## Phase 0: OpenClaw Pivot

Goal: stop duplicating OpenClaw and move BusinessClaw into OpenClaw's ecosystem.

Deliverables:

- Install OpenClaw locally.
- Verify Gateway and dashboard.
- Configure Discord through OpenClaw.
- Copy `openclaw-workspace/main/` into the OpenClaw workspace.
- Create OpenClaw agents for Claw, Ledger, and Forge.
- Treat the Python runtime as prototype/reference only.

## Phase 1: Core Company Runtime

Goal: define BusinessClaw's company identity and operating system inside OpenClaw workspace files.

Deliverables:

- `AGENTS.md` for BusinessClaw operating rules.
- `SOUL.md` for identity and style.
- `TOOLS.md` for tool and wallet policy.
- `MEMORY.md` for durable project facts.
- `standing-orders.md` for autonomous business programs.
- Specialist employee workspace files.

## Phase 2: Configurable LLM Layer

Goal: configure OpenClaw model providers and failover instead of a custom provider layer.

Deliverables:

- Use OpenClaw model CLI/config.
- Configure hosted or local models.
- Configure auth profiles per agent when needed.
- Use OpenClaw model failover where useful.

## Phase 3: Tooling System

Goal: use OpenClaw skills/plugins and ClawHub wherever possible.

Deliverables:

- BusinessClaw ledger skill.
- Wallet status/signing skill or plugin.
- Revenue experiment tracker skill.
- Dashboard export plugin.
- Reusable automation skills created by Forge.

## Phase 4: Discord Control Plane

Goal: talk to BusinessClaw through OpenClaw's Discord channel.

Deliverables:

- Configure OpenClaw Discord bot/channel.
- Configure access groups/allowlists for owners.
- Configure group/mention routing for employee agents.
- Use OpenClaw message formatting and bot-loop protection.

## Phase 5: Wallet Integration

Goal: support a crypto wallet through an OpenClaw skill/plugin without exposing signing material to normal prompts.

Deliverables:

- Read-only public balance check.
- Earned-capital ledger.
- Transaction proposal format.
- Isolated signing adapter later.
- Owner funds vs earned funds policy.

## Phase 6: Employee System

Goal: make the spawned agents feel like employees inside a business.

Deliverables:

- Employee roles.
- Daily and weekly task assignment.
- Employee status reports.
- Employee task queue.
- Employee activity history.
- Commands to ask what each employee is doing.
- Configurable reporting format and cadence preferences.
- Employee relationship notes and memory summaries.
- Anti-loop detection so repeated work gets redirected.

## Phase 7: Pixel Office Website

Goal: visualize the business as a pixel-art office.

Deliverables:

- Web dashboard consuming Agent API state.
- Pixel-art office map.
- Main agent sprite.
- Employee sprites.
- Desk/meeting/finance states.
- Stats panels for revenue, tasks, tools, and employee output.

## Phase 8: Deployment

Goal: run continuously on Oracle Cloud Always Free or a small VPS.

Deliverables:

- Dockerfile.
- Docker Compose.
- systemd service docs.
- Caddy/Nginx reverse proxy docs.
- Backup and restore docs.
- Budget and uptime monitoring checklist.
