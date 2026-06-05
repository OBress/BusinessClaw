---
name: businessclaw-queue
description: Durable message/LLM work queue for BusinessClaw. Holds outbound agent messages and LLM jobs, retries with exponential backoff until served, rate-limits the shared endpoint, and dead-letters only after bounded attempts.
version: 0.1.0
metadata:
  openclaw:
    requires:
      bins:
        - node
    envVars:
      - name: BUSINESSCLAW_QUEUE_PATH
        required: false
        description: Optional path to the BusinessClaw queue JSON file.
      - name: BUSINESSCLAW_QUEUE_DELIVER_CMD
        required: false
        description: Shell command that delivers one message (message JSON on stdin). Exit 0 = served, non-zero = retry.
      - name: BUSINESSCLAW_QUEUE_SIMULATE_FAIL
        required: false
        description: When set, the built-in simulator fails delivery so retry/backoff can be exercised.
---

# BusinessClaw Queue Skill

Use this skill whenever BusinessClaw employees send outbound work that must not be
lost: inter-agent messages, Discord posts, or LLM jobs. Because every employee
calls the same LLM/API endpoint, this queue serializes and paces delivery,
retries transient failures (rate limits, 429s, 5xx) with exponential backoff, and
moves an item to a dead-letter state only after a bounded number of attempts.

## Why a queue

- One shared LLM endpoint + many agents = bursts and rate-limit errors.
- A transient error must never drop a message; it must be retried until served.
- Delivery must be paced so the business stays under provider limits.

## Lifecycle

`queued -> in_flight -> served`, or on error `retry` (with backoff) and finally
`dead` (dead-letter) after `maxAttempts`. Stuck `in_flight` leases are reclaimed
automatically after `leaseTtlMs`.

## Local CLI Helper

```powershell
node skills/businessclaw-queue/bin/businessclaw-queue.mjs status
node skills/businessclaw-queue/bin/businessclaw-queue.mjs enqueue --from claw --to ledger --channel finance --body "Need this quarter's burn rate."
node skills/businessclaw-queue/bin/businessclaw-queue.mjs list --status queued
# Drain one due item (paced). Wire real delivery with --deliver or BUSINESSCLAW_QUEUE_DELIVER_CMD.
node skills/businessclaw-queue/bin/businessclaw-queue.mjs serve
# Run continuously as a worker:
node skills/businessclaw-queue/bin/businessclaw-queue.mjs serve --loop --interval 2000
```

## Integration models

- **Push:** `serve` drains due items and runs the delivery command per item
  (message JSON on stdin; exit 0 = served). Wire it to the real outbound action
  (e.g. `openclaw agent ...` or a Discord post) via `--deliver` or
  `BUSINESSCLAW_QUEUE_DELIVER_CMD`.
- **Pull:** `lease` hands due items to an external worker, which then calls
  `ack --id <id>` on success or `fail --id <id> --error "..."` to trigger retry.

With no delivery command wired, `serve` simulates success so the queue is fully
usable in development. The worker (`serve --loop`) is run as a systemd service on
the VPS (see `deployment/systemd/businessclaw-queue.service`).
