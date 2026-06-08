#!/bin/sh
set -e

# ── Model provider ─────────────────────────────────────────────────────────────
# OPENROUTER_API_KEY is read from the environment by OpenClaw automatically.
# Strip the "openrouter/" provider prefix if present — OpenClaw's openrouter
# plugin adds it internally, so passing "openrouter/owl-alpha" would result in
# "openrouter/openrouter/owl-alpha". Pass just the model slug instead.
if [ -n "$LLM_MODEL" ]; then
  MODEL_SLUG="${LLM_MODEL#openrouter/}"
  openclaw models set "$MODEL_SLUG" || true
fi

# ── Plugins ────────────────────────────────────────────────────────────────────
# Whitelist the discord plugin explicitly to suppress the security warning.
openclaw config set plugins.allow '["@openclaw/discord"]' --strict-json || true

# ── Discord ────────────────────────────────────────────────────────────────────
if [ -n "$DISCORD_BOT_TOKEN" ]; then
  openclaw config set channels.discord.enabled true --strict-json || true
fi

# applicationId must be a quoted JSON string (not a bare number).
if [ -n "$DISCORD_APPLICATION_ID" ]; then
  openclaw config set channels.discord.accounts.default.applicationId "\"$DISCORD_APPLICATION_ID\"" || true
fi

# Register the owner's Discord user ID as an operator so they can use
# slash commands and interact with the gateway.
if [ -n "$DISCORD_OWNER_ID" ]; then
  openclaw config set channels.discord.accounts.default.operatorDiscordIds "[\"$DISCORD_OWNER_ID\"]" --strict-json || true
fi

# ── OpenClaw gateway ───────────────────────────────────────────────────────────
# No systemd in Docker — run the gateway as a plain foreground process.
openclaw gateway &

sleep 3

# ── Dashboard ──────────────────────────────────────────────────────────────────
export HOST="0.0.0.0"
export BUSINESSCLAW_DASHBOARD_PORT="${PORT:-4177}"

exec node /app/dashboard/server.mjs
