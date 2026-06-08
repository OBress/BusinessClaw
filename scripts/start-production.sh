#!/bin/sh
set -e

# ── Persistent data directory ──────────────────────────────────────────────────
mkdir -p /app/data

# ── Persist OpenClaw agent memory across redeploys ────────────────────────────
# /root/.openclaw/agents/ holds Claw's memory, sessions, and auth profiles.
# Without this symlink it resets to empty on every container restart.
# The config file is intentionally NOT symlinked — we rewrite it each deploy.
mkdir -p /app/data/.openclaw-agents
if [ -d /root/.openclaw/agents ] && [ ! -L /root/.openclaw/agents ]; then
  rm -rf /root/.openclaw/agents
fi
ln -sfn /app/data/.openclaw-agents /root/.openclaw/agents

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

# ── Memory search ─────────────────────────────────────────────────────────────
# Disable before the gateway starts so the setting is live on first boot.
# No OpenAI key available; builtin backend hardcodes OpenAI as embedding provider.
openclaw config set agents.defaults.memorySearch.enabled false --strict-json || true

# ── Gateway auth ───────────────────────────────────────────────────────────────
# Disable gateway auth — Railway's network layer is the perimeter.
# Without this, dashboard CLI polls fail with "missing scope: operator.read".
openclaw config set gateway.auth.mode '"none"' --strict-json || true

# ── Tool profile ───────────────────────────────────────────────────────────────
# "full" gives Claw every tool: agents_list, message, gateway, nodes, tts, etc.
# Default "coding" profile strips multi-agent tools she needs to hire/delegate.
openclaw config set tools.profile '"full"' --strict-json || true

# ── OpenClaw gateway ───────────────────────────────────────────────────────────
# No systemd in Docker — run the gateway as a plain foreground process.
openclaw gateway &

sleep 5

# ── Autonomous work cycle ──────────────────────────────────────────────────────
# Add a cron job so Claw works proactively without waiting for Discord messages.
# v2 flag: v1 was created even though cron add failed (wrong syntax), so use a
# new name so this block actually runs on the next deploy.
# The && ensures the flag is only written on success — retries on future deploys
# if the gateway isn't up yet.
if [ ! -f /app/data/.cron-v2-initialized ]; then
  openclaw cron add work-cycle --every 1h --agent claw \
    --message "Execute your standing orders: check active tasks and owner messages, advance the highest-value task, and report what changed." && \
  touch /app/data/.cron-v2-initialized || true
fi

# ── Dashboard ──────────────────────────────────────────────────────────────────
export HOST="0.0.0.0"
export BUSINESSCLAW_DASHBOARD_PORT="${PORT:-4177}"

exec node /app/dashboard/server.mjs
