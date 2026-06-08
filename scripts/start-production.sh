#!/bin/sh
set -e

# ── Model provider ─────────────────────────────────────────────────────────────
# OPENROUTER_API_KEY is read directly from the environment by OpenClaw.
# Just set the default model; no separate auth command needed.
if [ -n "$LLM_MODEL" ]; then
  openclaw models set "$LLM_MODEL" || true
fi

# ── Discord ────────────────────────────────────────────────────────────────────
if [ -n "$DISCORD_BOT_TOKEN" ]; then
  openclaw config set channels.discord.enabled true --strict-json || true
fi

# applicationId must be passed as a quoted JSON string (not a bare number).
if [ -n "$DISCORD_APPLICATION_ID" ]; then
  openclaw config set channels.discord.accounts.default.applicationId "\"$DISCORD_APPLICATION_ID\"" || true
fi

# ── OpenClaw gateway ───────────────────────────────────────────────────────────
# In a container there is no systemd, so run the gateway as a plain foreground
# process in the background. openclaw gateway (no subcommand) is the correct
# form inside Docker per the OpenClaw container guidance.
openclaw gateway &

sleep 3

# ── Dashboard ──────────────────────────────────────────────────────────────────
export HOST="0.0.0.0"
export BUSINESSCLAW_DASHBOARD_PORT="${PORT:-4177}"

exec node /app/dashboard/server.mjs
