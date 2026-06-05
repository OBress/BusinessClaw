---
name: businessclaw-revenue
description: Track legal revenue experiments, hypotheses, expected value, outcomes, and next actions for BusinessClaw.
version: 0.1.0
metadata:
  openclaw:
    requires:
      bins:
        - node
    envVars:
      - name: BUSINESSCLAW_REVENUE_PATH
        required: false
        description: Optional path to the BusinessClaw revenue experiment JSON file.
---

# BusinessClaw Revenue Skill

Use this skill when BusinessClaw needs to create, inspect, update, or learn from revenue experiments.

## Principles

- Experiments must be legal and platform-compliant.
- Prefer small tests that create real customer value.
- Track hypothesis, target customer, offer, cost, evidence, result, and next action.
- Avoid repeating failed experiments without new evidence or a changed approach.

## Local CLI Helper

```powershell
node skills/businessclaw-revenue/bin/businessclaw-revenue.mjs status
node skills/businessclaw-revenue/bin/businessclaw-revenue.mjs create --name "Micro service offer" --customer "small creators" --offer "automation audit" --hypothesis "Creators will pay for faster workflow diagnosis"
node skills/businessclaw-revenue/bin/businessclaw-revenue.mjs update --id exp_... --status running --evidence "Built draft offer"
node skills/businessclaw-revenue/bin/businessclaw-revenue.mjs close --id exp_... --result "no-response" --next-action "change niche"
```

