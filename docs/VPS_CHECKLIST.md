# VPS Checklist

Use this when moving BusinessClaw from local development to a separate VPS.

## 1. Provision

- Ubuntu 22.04 or 24.04 is the easiest target.
- Open SSH, HTTP, and HTTPS only.
- Keep OpenClaw Gateway on loopback unless there is a strong reason to expose it.
- Point the dashboard domain at the VPS.

## 2. Install Prerequisites

```bash
sudo apt update
sudo apt install -y curl git ca-certificates
```

Install Node.js 22+ using your preferred package source.

## 3. Clone And Bootstrap

```bash
git clone <repo-url> ~/businessclaw
cd ~/businessclaw
./scripts/bootstrap-vps.sh
```

## 4. Install Services

```bash
sudo BUSINESSCLAW_ROOT="$PWD" BUSINESSCLAW_SERVICE_USER="$(id -un)" ./scripts/install-vps-services.sh
```

## 5. Configure Secrets

```bash
sudo nano /etc/businessclaw/businessclaw.env
sudo systemctl restart openclaw-gateway businessclaw-dashboard
```

Production values to add:

- `OPENAI_API_KEY` or another model provider credential.
- `DISCORD_BOT_TOKEN`.
- `DISCORD_APPLICATION_ID` if OpenClaw needs it.
- `BUSINESSCLAW_WALLET_PUBLIC_ADDRESS` for receive-only wallet display.
- `BUSINESSCLAW_WALLET_RPC_URL` for read-only balance checks.

Do not add private keys, seed phrases, exchange passwords, or session cookies.

## 6. Reverse Proxy

Install Caddy or Nginx. For Caddy:

```bash
sudo apt install -y caddy
sudo cp deployment/caddy/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The dashboard should be public. OpenClaw Gateway should stay private unless you intentionally put it behind a trusted private network/auth layer.

## 7. Verify

```bash
./scripts/verify-businessclaw-vps.sh
```

Expected before real production credentials:

- warning for model auth missing
- warning for Discord disabled
- zero token usage

Expected for production:

- model auth configured
- Discord enabled and healthy
- dashboard reachable
- `openclaw-gateway.service` active
- `businessclaw-dashboard.service` active

## 8. Enable Autonomy Carefully

Only after verification:

```bash
openclaw models status
openclaw gateway usage-cost
./scripts/stage-autonomy-jobs.sh
```

Use the OpenClaw cron commands to enable only the jobs you want. Start with one low-frequency job, then watch cost and behavior before enabling more.
