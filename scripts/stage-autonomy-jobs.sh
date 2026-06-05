#!/usr/bin/env bash
set -euo pipefail

# These jobs are created disabled by default. Enable after model auth works:
# openclaw models status
# openclaw cron enable <job-id>

openclaw cron add \
  --name "BusinessClaw Company Momentum" \
  --agent claw \
  --every 1h \
  --disabled \
  --session isolated \
  --timeout-seconds 600 \
  --message "Run BusinessClaw Company Momentum: inspect current tasks, avoid repeating stale actions, pick one legal high-value business-building step, execute or plan the next concrete action, and record what changed. Treat owners as board members, not line managers."

openclaw cron add \
  --name "BusinessClaw Finance Review" \
  --agent ledger \
  --every 6h \
  --disabled \
  --session isolated \
  --timeout-seconds 600 \
  --message "Run BusinessClaw Finance Review: inspect the earned-capital ledger, wallet notes, open spending proposals, and business costs. Update records if needed and identify any money/revenue risks."

openclaw cron add \
  --name "BusinessClaw Tool Improvement" \
  --agent forge \
  --every 4h \
  --disabled \
  --session isolated \
  --timeout-seconds 600 \
  --message "Run BusinessClaw Tool Improvement: look for repeated company work that should become an OpenClaw skill, plugin, script, or standing order. Build or propose one useful improvement without exposing secrets."

openclaw cron list
