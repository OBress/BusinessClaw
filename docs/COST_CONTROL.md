# Cost Control

BusinessClaw local development should be cost-quiet by default.

## Current Local Defaults

- Dashboard: read-only local UI. It does not call OpenAI or any LLM API.
- OpenClaw default model: `openai/gpt-5-nano`.
- OpenAI auth: not configured until you explicitly add it.
- Cron jobs: should remain empty until autonomy is intentionally enabled.

## Verify Spend

```powershell
openclaw gateway usage-cost
openclaw models status
openclaw tasks list --json
openclaw cron list
```

Expected local-development state:

```text
Usage cost (30 days)
Total: $0.0000 · 0 tokens
```

## Set Cheapest OpenAI Default

As of June 5, 2026, OpenAI's pricing page lists `gpt-5-nano` as the cheapest OpenAI text model by input price. Keep BusinessClaw on this model for local/dev heartbeat or routine cheap work.

```powershell
openclaw models set openai/gpt-5-nano
openclaw models status
```

Use stronger models only for specific tasks that justify the cost.

## Autonomy Rule

Do not enable cron jobs, heartbeats, or Discord-triggered autonomous work with a real API key until you have checked:

- the default model is cheap enough
- spending limits are set in the OpenAI dashboard
- `openclaw gateway usage-cost` is monitored
- BusinessClaw has a clear daily token budget

