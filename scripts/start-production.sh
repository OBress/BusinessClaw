#!/bin/sh
set -e

# ── Model provider ─────────────────────────────────────────────────────────────
if [ -n "$OPENROUTER_API_KEY" ]; then
  openclaw models auth set-key --provider openrouter "$OPENROUTER_API_KEY" || true
  openclaw models set "${LLM_MODEL:-openrouter/owl-alpha}" || true
fi

# ── Discord ────────────────────────────────────────────────────────────────────
if [ -n "$DISCORD_BOT_TOKEN" ]; then
  openclaw config set channels.discord.enabled true --strict-json || true
fi

if [ -n "$DISCORD_APPLICATION_ID" ]; then
  openclaw config set channels.discord.accounts.default.applicationId "$DISCORD_APPLICATION_ID" || true
fi

# ── OpenClaw gateway ───────────────────────────────────────────────────────────
openclaw gateway start &

sleep 3

# ── Dashboard ──────────────────────────────────────────────────────────────────
export HOST="0.0.0.0"
export BUSINESSCLAW_DASHBOARD_PORT="${PORT:-4177}"

exec node /app/dashboard/server.mjs
