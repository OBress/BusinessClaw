#!/usr/bin/env bash
set -euo pipefail

ROOT="${BUSINESSCLAW_ROOT:-$HOME/businessclaw}"
REPO_URL="${BUSINESSCLAW_REPO_URL:-}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 22+ before running this script." >&2
  exit 1
fi

if ! command -v openclaw >/dev/null 2>&1; then
  curl -fsSL https://openclaw.ai/install.sh | bash
fi

mkdir -p "$ROOT"

if [ -n "$REPO_URL" ] && [ ! -d "$ROOT/.git" ]; then
  git clone "$REPO_URL" "$ROOT"
fi

cd "$ROOT"

openclaw setup --non-interactive --accept-risk --workspace "$ROOT/openclaw-runtime/workspace" || true

mkdir -p "$ROOT/openclaw-runtime/workspace/skills"
cp -R "$ROOT/openclaw-workspace/main/." "$ROOT/openclaw-runtime/workspace/"
cp -R "$ROOT/openclaw-workspace/skills/." "$ROOT/openclaw-runtime/workspace/skills/"

for agent in claw ledger forge; do
  workspace="$ROOT/openclaw-runtime/agents/$agent/workspace"
  agent_dir="$ROOT/openclaw-runtime/agents/$agent/agent"
  mkdir -p "$workspace/skills"
  cp "$ROOT/openclaw-workspace/main/SOUL.md" "$workspace/"
  cp "$ROOT/openclaw-workspace/main/TOOLS.md" "$workspace/"
  cp "$ROOT/openclaw-workspace/main/MEMORY.md" "$workspace/"
  cp "$ROOT/openclaw-workspace/main/standing-orders.md" "$workspace/"
  cp "$ROOT/openclaw-workspace/agents/$agent/AGENTS.md" "$workspace/"
  cp -R "$ROOT/openclaw-workspace/skills/." "$workspace/skills/"
  openclaw agents add "$agent" --workspace "$workspace" --agent-dir "$agent_dir" --non-interactive || true
done

openclaw agents set-identity --agent claw --name "Claw" --emoji "brain" --theme executive || true
openclaw agents set-identity --agent ledger --name "Ledger" --emoji "briefcase" --theme finance || true
openclaw agents set-identity --agent forge --name "Forge" --emoji "hammer" --theme builder || true

openclaw plugins install "@openclaw/discord" --pin || true
openclaw channels add --channel discord --name "BusinessClaw Discord" --use-env || true
openclaw config set channels.discord.accounts.default.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN || true
openclaw config set channels.discord.enabled false --strict-json || true

openclaw gateway install || true
openclaw gateway start || true

# Full autonomy on the VPS: grant agents unattended execution (shell, files,
# network, package installs) with no approval prompts so the business can do
# real work. This is intentional for the dedicated VPS — the behavioral
# guardrails in agent.rules.md / AGENTS.md (stay legal, protect credentials and
# infrastructure, no self-exposure) are what keep it safe, not exec gates.
# Set BUSINESSCLAW_EXEC_POLICY=cautious to require approvals instead.
openclaw exec-policy preset "${BUSINESSCLAW_EXEC_POLICY:-yolo}" || true

cd "$ROOT/dashboard"
npm ci

echo "BusinessClaw VPS bootstrap complete."
echo "Next: configure model auth, DISCORD_BOT_TOKEN, reverse proxy, and systemd dashboard service."
