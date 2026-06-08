#!/bin/sh
set -e

# ── Model provider ─────────────────────────────────────────────────────────────
# Configure OpenRouter if the API key is present.
# openclaw models auth set-key is the non-interactive form; fall through on older
# versions that don't yet support the subcommand.
if [ -n "$OPENROUTER_API_KEY" ]; then
  openclaw models auth set-key --provider openrouter "$OPENROUTER_API_KEY" 2>/dev/null || true
  openclaw models set "${LLM_MODEL:-openrouter/owl-alpha}" 2>/dev/null || true
fi

# ── Discord ────────────────────────────────────────────────────────────────────
if [ -n "$DISCORD_BOT_TOKEN" ]; then
  openclaw config set channels.discord.enabled true --strict-json 2>/dev/null || true
  openclaw config set channels.discord.accounts.default.token "$DISCORD_BOT_TOKEN" 2>/dev/null || true
fi

if [ -n "$DISCORD_APPLICATION_ID" ]; then
  openclaw config set channels.discord.accounts.default.applicationId "$DISCORD_APPLICATION_ID" 2>/dev/null || true
fi

# ── OpenClaw gateway ───────────────────────────────────────────────────────────
# Start gateway in the background; the dashboard degrades gracefully if it
# is slow or unavailable.
openclaw gateway start &

# Give the gateway a moment to initialise before the dashboard polls it
sleep 3

# ── Dashboard ──────────────────────────────────────────────────────────────────
# Railway sets $PORT automatically; fall back to 4177 for local use.
export HOST="0.0.0.0"
export BUSINESSCLAW_DASHBOARD_PORT="${PORT:-4177}"

exec node /app/dashboard/server.mjs
