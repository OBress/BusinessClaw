# Display-Only Pixel Dashboard

The BusinessClaw dashboard is a read-only display. It must not contain command inputs, chat boxes, forms, or controls that mutate the agent system.

## Current Scaffold

Path:

```text
dashboard/
```

Run:

```powershell
cd dashboard
npm install
npm start
```

Open:

```text
http://127.0.0.1:4177
```

## Rendering

The office is a `<canvas>` scene drawn at a fixed virtual resolution (480x272)
and scaled up with nearest-neighbour for crisp pixels (`public/office.js`).
Employees are procedural pixel characters with idle bob, blink, and a walk
cycle. The side panel (`public/app.js`) is plain DOM for crisp text and the
display menu. There are **no form controls** — navigation only.

### Walking conversations (queue-driven)

When the message queue has a pending conversation between two employees, the
speaker **walks across the office to the listener** and the speech bubble is
**held until they arrive** — mirroring the durable queue (the message is "in
transit" until delivered). Idle employees show ambient bubbles derived from
tasks, ledger, revenue, and org state. Readable bubbles are HTML overlays
positioned over the scaled canvas.

## Data Sources

The server (`dashboard/server.mjs`) builds `/api/state` from:

- `openclaw status --json`, `openclaw agents list --json`, `openclaw tasks list --json`
- `data/businessclaw-ledger.json`, `-org.json`, `-revenue.json`, `-wallet.json`,
  `-board.json`, `-discord-routing.json`, `-queue.json`
- `data/audit.log`

**Resilience:** the OpenClaw CLI calls are refreshed into an in-memory cache on
an interval (short timeout, non-overlapping, last-known kept on failure), so
`/api/state` always responds in milliseconds and the page never hangs on a slow
or cold gateway. File-backed sections are read fresh each request.

The OpenClaw docs mention `@openclaw/sdk`, but the package was not available from the public npm registry in this environment. The dashboard is therefore using a read-only CLI bridge (cached) for now.

## Display Requirements

- Stardew-like pixel office feel.
- Pixel characters for workers/agents.
- No command input.
- No chat input.
- No agent control buttons.
- Menu/sections are display-only.
- Analytics view.
- Bank/account level view.
- Current task/employee state view.
- Hiring/firing/org-state view through display panels.
- Multiple office floors, research library, meeting room, runtime room, and archive/file cabinet.
- Chat and thought bubbles derived from current tasks, ledger, revenue experiments, and org history.

## Future Data Upgrade

When `@openclaw/sdk` is available, replace the CLI bridge with Gateway SDK calls for:

- agent list
- task ledger
- run events
- approvals
- artifacts
- live event stream
