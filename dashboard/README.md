# BusinessClaw Dashboard

This is the local display-only office for BusinessClaw. It is intentionally plain HTML, CSS, and browser JavaScript so Forge or another SWE employee can change it quickly.

## Run Locally

```powershell
cd dashboard
npm install
npm start
```

Open `http://127.0.0.1:4177/`.

## Verify A Change

```powershell
cd dashboard
npm run smoke
```

The smoke test checks that the dashboard still has no command inputs/forms, renders employees, renders multiple floors, shows bubbles, exposes read-only navigation, and saves a screenshot to `data/dashboard-smoke.png`.

## How To Add Functionality

- Add visual objects and rooms in `public/index.html`.
- Style the pixel art in `public/styles.css`.
- Add derived display logic in `public/app.js`.
- Add new read-only data sources in `server.mjs`, then expose them from `/api/state`.

Keep this app display-only. Read-only navigation and employee inspection are okay; Discord and OpenClaw remain the control surfaces for commands and mutations.

## Current Data Sources

- OpenClaw gateway status, agents, and tasks through the OpenClaw CLI.
- `data/businessclaw-org.json` for employees and employment history.
- `data/businessclaw-ledger.json` for bank, wallet, proposals, and ledger entries.
- `data/businessclaw-revenue.json` for revenue experiments and lessons.
- `data/audit.log` for recent system notes.

## Website Change Requests For Forge

A good Discord request should name the visual change, the data source, and the verification expectation. Example:

```text
Forge, update the dashboard to add a sales room on 2F. Show active revenue experiments as display boards, keep it display-only, and run npm run smoke after the change.
```
