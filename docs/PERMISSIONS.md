# BusinessClaw Permissions & Autonomy

BusinessClaw agents are meant to run a real business with full operational
control of their VPS — develop any skill, install any package, call any legal
service — without stopping for per-action approval. Control comes from
**behavioral guardrails** (stay legal, protect credentials and infrastructure,
no self-exposure) rather than from execution gates.

## Execution policy (OpenClaw exec-policy)

OpenClaw mediates tool execution through an exec policy. The relevant knobs:

- `security`: `deny` | `allowlist` | `full`
- `ask`: `off` | `on-miss` | `always`
- `ask-fallback`: `deny` | `allowlist` | `full`

BusinessClaw runs **full autonomy**: `security=full`, `ask=off`. Agents can run
shell commands, read/write files, use the network, and install packages with no
approval prompts. This is OpenClaw's default effective policy, so no change is
needed to grant it — but the VPS bootstrap makes it explicit and durable.

Inspect the effective policy at any time:

```bash
openclaw exec-policy show
```

Apply the explicit full-autonomy preset (done automatically by the VPS
bootstrap; run manually if you want it explicit locally):

```bash
openclaw exec-policy preset yolo      # full autonomy, no approval prompts
openclaw exec-policy preset cautious  # require approvals for risky actions
openclaw exec-policy preset deny-all  # lock everything down (kill switch)
```

The VPS bootstrap applies `yolo` by default. Override with
`BUSINESSCLAW_EXEC_POLICY=cautious ./scripts/bootstrap-vps.sh`.

> Security note: `yolo` means the agents can do anything the VPS user can do.
> Run BusinessClaw under a dedicated non-root service user on a VPS that holds
> nothing else of value, and keep wallet signing material off that host. The
> per-agent guardrails below are what keep full autonomy safe.

## Guardrails that bound full autonomy

Execution is unrestricted, but behavior is bounded by
[config/agent.rules.md](../config/agent.rules.md) / `AGENTS.md`:

1. Legal and platform-compliant behavior first.
2. Protect company accounts, wallets, credentials, and infrastructure.
3. Keep the owner able to inspect, pause, and override (kill switch).
4. No self-exposure: never leak secrets, never bypass access controls or KYC.
5. High-risk actions still require board approval: owner-funded spending, legal
   commitments, credential/signing changes, public liability claims, and cloud
   resources that can bill the owner (see [TOOLS.md](../openclaw-runtime/workspace/TOOLS.md)).

## Developing any skill / using any service

- Agents may create skills under each workspace's `skills/` directory and use
  them immediately (the `businessclaw-*` skills are the working examples).
- Forge owns turning repeated workflows into durable skills.
- Any legal external service may be used. Store credentials as OpenClaw secrets
  / env `SecretRef`s, never inline in prompts, logs, or channel messages.

## Shared-endpoint safety: the queue

Many employees call the same LLM/API endpoint. All outbound work that can fail
transiently should go through the durable queue
([businessclaw-queue](../openclaw-runtime/workspace/skills/businessclaw-queue/SKILL.md))
so a rate limit or 5xx never drops a message — it is retried with backoff until
served, and paced so the shared endpoint is never hammered.

## Kill switch

- Pause: `openclaw exec-policy preset deny-all` (blocks all execution).
- Stop autonomy jobs: `openclaw cron list` then `openclaw cron disable <id>`.
- A pause/stop instruction from the owner halts new actions immediately
  (agent rules, "Kill Switch").
