#!/usr/bin/env bash
set -euo pipefail

ROOT="${BUSINESSCLAW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SERVICE_USER="${BUSINESSCLAW_SERVICE_USER:-$(id -un)}"
ENV_DIR="${BUSINESSCLAW_ENV_DIR:-/etc/businessclaw}"
ENV_FILE="$ENV_DIR/businessclaw.env"
SYSTEMD_DIR="${BUSINESSCLAW_SYSTEMD_DIR:-/etc/systemd/system}"
DASHBOARD_PORT="${BUSINESSCLAW_DASHBOARD_PORT:-4177}"
OPENCLAW_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_cmd node
need_cmd npm
need_cmd openclaw
need_cmd systemctl

OPENCLAW_BIN="$(command -v openclaw)"
NPM_BIN="$(command -v npm)"
NODE_BIN="$(command -v node)"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script writes to $SYSTEMD_DIR and $ENV_DIR, so run it with sudo." >&2
  echo "Example: sudo BUSINESSCLAW_ROOT=$ROOT BUSINESSCLAW_SERVICE_USER=$SERVICE_USER scripts/install-vps-services.sh" >&2
  exit 1
fi

mkdir -p "$ENV_DIR"

if [ ! -f "$ENV_FILE" ]; then
  install -m 0600 "$ROOT/deployment/env/businessclaw.example.env" "$ENV_FILE"
  sed -i "s#=/home/ubuntu/businessclaw/#=$ROOT/#g" "$ENV_FILE"
  sed -i "s#BUSINESSCLAW_DASHBOARD_PORT=4177#BUSINESSCLAW_DASHBOARD_PORT=$DASHBOARD_PORT#g" "$ENV_FILE"
fi

cat > "$SYSTEMD_DIR/openclaw-gateway.service" <<EOF
[Unit]
Description=OpenClaw Gateway for BusinessClaw
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$ROOT
EnvironmentFile=-$ENV_FILE
ExecStart=$OPENCLAW_BIN gateway run --port $OPENCLAW_PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > "$SYSTEMD_DIR/businessclaw-dashboard.service" <<EOF
[Unit]
Description=BusinessClaw display-only dashboard
After=network-online.target openclaw-gateway.service
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$ROOT/dashboard
EnvironmentFile=-$ENV_FILE
Environment=BUSINESSCLAW_DASHBOARD_PORT=$DASHBOARD_PORT
Environment=NODE_ENV=production
ExecStart=$NPM_BIN start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > "$SYSTEMD_DIR/businessclaw-queue.service" <<EOF
[Unit]
Description=BusinessClaw durable message/LLM queue worker
After=network-online.target openclaw-gateway.service
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$ROOT
EnvironmentFile=-$ENV_FILE
Environment=NODE_ENV=production
ExecStart=$NODE_BIN openclaw-runtime/workspace/skills/businessclaw-queue/bin/businessclaw-queue.mjs serve --loop --interval 2000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable openclaw-gateway.service businessclaw-dashboard.service businessclaw-queue.service
systemctl restart openclaw-gateway.service businessclaw-dashboard.service businessclaw-queue.service

echo "Installed BusinessClaw services."
echo "OpenClaw:   $OPENCLAW_BIN gateway run --port $OPENCLAW_PORT"
echo "Dashboard: $NPM_BIN start in $ROOT/dashboard"
echo "Queue:     $NODE_BIN .../businessclaw-queue.mjs serve --loop"
echo "Env file:  $ENV_FILE"
echo "Node:      $NODE_BIN"
