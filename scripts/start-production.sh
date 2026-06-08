#!/bin/sh
set -e

# ── Persistent data directory ──────────────────────────────────────────────────
mkdir -p /app/data

# Seed the org with Claw as the sole founding employee on first deploy.
# Subsequent deploys leave the file alone so Claw's hires/fires persist.
if [ ! -f /app/data/businessclaw-org.json ]; then
  cat > /app/data/businessclaw-org.json << 'ORGJSON'
{
  "employees": [
    {
      "id": "claw",
      "name": "Claw",
      "role": "Chief Executive",
      "status": "active",
      "theme": "executive",
      "emoji": "🧠"
    }
  ]
}
ORGJSON
fi

# ── Model provider ─────────────────────────────────────────────────────────────
# OPENROUTER_API_KEY is read from the environment by OpenClaw automatically.
# Write the model directly to config — openclaw models set mangles the slug
# (strips prefix → wrong provider; keeps prefix → openrouter/openrouter/...).
if [ -n "$LLM_MODEL" ]; then
  openclaw config set agents.defaults.model.primary "\"$LLM_MODEL\"" || true
fi

# ── Discord ────────────────────────────────────────────────────────────────────
if [ -n "$DISCORD_BOT_TOKEN" ]; then
  openclaw config set channels.discord.enabled true --strict-json || true
fi

# Open the guild policy so server slash commands are allowed. Without this,
# groupPolicy defaults to "allowlist" which blocks all guild commands unless
# each guild is explicitly added to the config — before even reaching the
# commands.ownerAllowFrom check.
openclaw config set channels.discord.groupPolicy '"open"' --strict-json || true

# applicationId must be a quoted JSON string (not a bare number).
if [ -n "$DISCORD_APPLICATION_ID" ]; then
  openclaw config set channels.discord.accounts.default.applicationId "\"$DISCORD_APPLICATION_ID\"" || true
fi

# Register the owner's Discord user ID in the owner allowlist so they can use
# owner-scoped slash commands (/goal, /plan, etc.).
if [ -n "$DISCORD_OWNER_ID" ]; then
  openclaw config set commands.ownerAllowFrom "[\"$DISCORD_OWNER_ID\"]" --strict-json || true
fi

# ── OpenClaw gateway ───────────────────────────────────────────────────────────
# No systemd in Docker — run the gateway as a plain foreground process.
openclaw gateway &

sleep 5

# ── Autonomous work cycle ──────────────────────────────────────────────────────
# Add a cron job so Claw works proactively without waiting for Discord messages.
# The flag file prevents duplicate jobs on every redeployment.
if [ ! -f /app/data/.cron-initialized ]; then
  openclaw cron add --agent claw --every 1h --description "work-cycle" \
    "Execute your standing orders: check active tasks and owner messages, advance the highest-value task, and report what changed." || true
  touch /app/data/.cron-initialized
fi

# ── Dashboard ──────────────────────────────────────────────────────────────────
export HOST="0.0.0.0"
export BUSINESSCLAW_DASHBOARD_PORT="${PORT:-4177}"

exec node /app/dashboard/server.mjs
