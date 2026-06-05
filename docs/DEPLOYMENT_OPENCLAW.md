# OpenClaw Deployment Runbook

Use this for the separate VPS deployment. Local setup is only for development.

## Recommendation

For BusinessClaw, Oracle Cloud Always Free is still the best first target if Ampere A1 capacity is available. A paid VPS is simpler but usually has much less RAM.

## Server Shape

- OpenClaw Gateway service.
- BusinessClaw OpenClaw workspace.
- BusinessClaw dashboard service.
- Caddy or Nginx reverse proxy.
- Firewall allowing SSH, HTTP, HTTPS only.
- Backups of `~/.openclaw` and the BusinessClaw repo.

## Server Install

Clone or copy the repo onto the server, then run:

```bash
cd ~/businessclaw
./scripts/bootstrap-vps.sh
```

If the repo is not on the server yet, set `BUSINESSCLAW_REPO_URL`:

```bash
export BUSINESSCLAW_REPO_URL="https://github.com/your-org/businessclaw.git"
export BUSINESSCLAW_ROOT="$HOME/businessclaw"
curl -fsSL https://raw.githubusercontent.com/your-org/businessclaw/main/scripts/bootstrap-vps.sh | bash
```

The bootstrap script installs OpenClaw if needed, syncs the BusinessClaw workspaces and skills, registers `claw`, `ledger`, and `forge`, installs the Discord plugin, starts the Gateway, and installs dashboard dependencies.

## Dashboard Service

Install systemd services:

```bash
cd ~/businessclaw
sudo BUSINESSCLAW_ROOT="$PWD" BUSINESSCLAW_SERVICE_USER="$(id -un)" ./scripts/install-vps-services.sh
```

This creates:

- `/etc/businessclaw/businessclaw.env`
- `/etc/systemd/system/openclaw-gateway.service`
- `/etc/systemd/system/businessclaw-dashboard.service`

Reverse proxy the dashboard domain to `127.0.0.1:4177`.

Example files:

- `deployment/systemd/businessclaw-dashboard.service`
- `deployment/caddy/Caddyfile.example`
- `deployment/env/businessclaw.example.env`

## Secrets

Set secrets outside git in `/etc/businessclaw/businessclaw.env`:

```bash
sudo nano /etc/businessclaw/businessclaw.env
sudo systemctl restart openclaw-gateway businessclaw-dashboard
```

Required for production autonomy:

- `OPENAI_API_KEY` or another configured model provider credential.
- `DISCORD_BOT_TOKEN` once Discord should be live.

Optional:

- `DISCORD_APPLICATION_ID`
- `BUSINESSCLAW_WALLET_PUBLIC_ADDRESS`
- `BUSINESSCLAW_WALLET_CHAIN`
- `BUSINESSCLAW_WALLET_RPC_URL`

Keep private keys and seed phrases out of this file. BusinessClaw currently tracks wallet state and spend intents, but signing is intentionally external.

## Backups

Back up:

- `~/.openclaw/openclaw.json`
- `~/.openclaw/agents`
- `~/.openclaw/cron`
- BusinessClaw repo
- `data/businessclaw-ledger.json`
- `data/businessclaw-wallet.json`
- `data/businessclaw-org.json`
- `data/businessclaw-revenue.json`

## Health Checks

```bash
openclaw gateway status
openclaw status --json
openclaw models status
openclaw channels status --probe
curl http://127.0.0.1:4177/api/state
./scripts/verify-businessclaw-vps.sh
```

Expected before adding real secrets:

- model auth warning
- Discord disabled warning
- zero token usage

Expected after production secrets and Discord enablement:

- model auth configured
- Discord enabled and channel probe healthy
- dashboard API healthy
- both systemd services active
