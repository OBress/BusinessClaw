# Discord Routing

BusinessClaw uses OpenClaw's Discord channel plugin for the real bot connection. The `businessclaw-discord` skill records the company-level routing map.

## What It Tracks

- Discord channel IDs and their company room names.
- Default employee for each channel.
- Employee aliases and mention keywords.
- Board member Discord IDs.
- Employee Markdown speaker prefixes.

## Default Routing

- `#board-room` -> `claw`
- `#ops-floor` -> `claw`
- `#finance` -> `ledger`
- `#forge` -> `forge`
- `#announcements` -> `claw`

Alias examples:

- `ledger`, `finance`, `bank`, `wallet` -> Ledger
- `forge`, `tools`, `automation`, `website`, `dashboard` -> Forge
- `claw`, `operator`, `strategy` -> Claw

## Commands

```powershell
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs status
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs resolve --channel-id finance --text "ledger what's the bank level?"
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs set-channel --id finance --discord-id 123 --name "#finance" --room finance --default-agent ledger
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs set-employee-route --employee-id forge --aliases forge tools automation website dashboard --channel-id forge
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs set-board-user --member-id owen --discord-id 456 --name Owen
```

## Dashboard

The dashboard reads `data/businessclaw-discord-routing.json`.

- Discord route and room counts appear in Analytics.
- Channel and route records appear in the File Cabinet.
- Board-message activity still comes from board advice and Discord/audit events.

