#!/usr/bin/env bash
set -euo pipefail

ROOT="${BUSINESSCLAW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DASHBOARD_URL="${BUSINESSCLAW_DASHBOARD_URL:-http://127.0.0.1:${BUSINESSCLAW_DASHBOARD_PORT:-4177}}"
FAILURES=0
WARNINGS=0

pass() {
  echo "[PASS] $1${2:+ - $2}"
}

warn() {
  WARNINGS=$((WARNINGS + 1))
  echo "[WARN] $1${2:+ - $2}"
}

fail() {
  FAILURES=$((FAILURES + 1))
  echo "[FAIL] $1${2:+ - $2}"
}

need_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    pass "$1 installed" "$(command -v "$1")"
  else
    fail "$1 installed"
  fi
}

echo "BusinessClaw VPS verification"
echo "Root: $ROOT"
echo ""

need_cmd node
need_cmd npm
need_cmd openclaw
need_cmd curl

if openclaw --version >/tmp/businessclaw-openclaw-version.txt 2>&1; then
  pass "OpenClaw version" "$(cat /tmp/businessclaw-openclaw-version.txt)"
else
  fail "OpenClaw version"
fi

if openclaw gateway status >/tmp/businessclaw-gateway-status.txt 2>&1; then
  if grep -Eiq "running|reachable|listening|127\.0\.0\.1" /tmp/businessclaw-gateway-status.txt; then
    pass "OpenClaw gateway reachable"
  else
    warn "OpenClaw gateway status unclear" "$(tr '\n' ' ' </tmp/businessclaw-gateway-status.txt)"
  fi
else
  fail "OpenClaw gateway status" "$(tr '\n' ' ' </tmp/businessclaw-gateway-status.txt 2>/dev/null || true)"
fi

if openclaw models status >/tmp/businessclaw-models.txt 2>&1; then
  if grep -q "Default       : openai/gpt-5-nano" /tmp/businessclaw-models.txt; then
    pass "Cheap default model" "openai/gpt-5-nano"
  else
    warn "Cheap default model not confirmed" "expected openai/gpt-5-nano"
  fi
  if grep -Eiq "Missing auth|effective=missing|status=missing" /tmp/businessclaw-models.txt; then
    warn "Model auth missing" "configure before production autonomy"
  else
    pass "Model auth configured"
  fi
else
  fail "OpenClaw model status"
fi

if openclaw gateway usage-cost >/tmp/businessclaw-cost.txt 2>&1; then
  if grep -q "\$0.0000" /tmp/businessclaw-cost.txt && grep -q "0 tokens" /tmp/businessclaw-cost.txt; then
    pass "No OpenClaw token spend reported" "$(tr '\n' ' ' </tmp/businessclaw-cost.txt)"
  else
    warn "OpenClaw token spend present or unclear" "$(tr '\n' ' ' </tmp/businessclaw-cost.txt)"
  fi
else
  warn "Could not read OpenClaw usage cost"
fi

if openclaw skills list >/tmp/businessclaw-skills.txt 2>&1; then
  for skill in businessclaw-board businessclaw-discord businessclaw-ledger businessclaw-org businessclaw-revenue businessclaw-wallet; do
    if grep -q "$skill" /tmp/businessclaw-skills.txt; then
      pass "Skill listed: $skill"
    else
      fail "Skill missing: $skill"
    fi
  done
else
  fail "OpenClaw skills list"
fi

if curl -fsS "$DASHBOARD_URL/api/state" >/tmp/businessclaw-dashboard-state.json; then
  if grep -q '"mode": "display-only"' /tmp/businessclaw-dashboard-state.json || grep -q '"mode":"display-only"' /tmp/businessclaw-dashboard-state.json; then
    pass "Dashboard API display-only"
  else
    fail "Dashboard API display-only not confirmed"
  fi
  if grep -q '"wallet"' /tmp/businessclaw-dashboard-state.json && grep -q '"board"' /tmp/businessclaw-dashboard-state.json && grep -q '"discordRouting"' /tmp/businessclaw-dashboard-state.json && grep -q '"fileCabinet"' /tmp/businessclaw-dashboard-state.json; then
    pass "Dashboard API includes wallet, board, Discord routing, and cabinet"
  else
    warn "Dashboard API missing wallet, board, Discord routing, or cabinet data"
  fi
else
  fail "Dashboard API reachable" "$DASHBOARD_URL/api/state"
fi

if [ -d "$ROOT/dashboard" ]; then
  (cd "$ROOT/dashboard" && npm run smoke) >/tmp/businessclaw-dashboard-smoke.txt 2>&1 \
    && pass "Dashboard smoke test" \
    || warn "Dashboard smoke test skipped/failed" "$(tail -n 5 /tmp/businessclaw-dashboard-smoke.txt 2>/dev/null | tr '\n' ' ')"
else
  fail "Dashboard directory exists"
fi

if command -v systemctl >/dev/null 2>&1; then
  for service in openclaw-gateway.service businessclaw-dashboard.service; do
    if systemctl is-enabled "$service" >/dev/null 2>&1 && systemctl is-active "$service" >/dev/null 2>&1; then
      pass "systemd service active: $service"
    else
      warn "systemd service not active/enabled: $service"
    fi
  done
fi

echo ""
echo "Result: $FAILURES failure(s), $WARNINGS warning(s)."
if [ "$FAILURES" -gt 0 ]; then
  exit 1
fi
