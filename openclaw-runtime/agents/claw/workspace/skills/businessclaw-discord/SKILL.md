---
name: businessclaw-discord
description: Track BusinessClaw Discord routing, channel mappings, employee aliases, and board-member Discord identities.
version: 0.1.0
metadata:
  openclaw:
    requires:
      bins:
        - node
    envVars:
      - name: BUSINESSCLAW_DISCORD_ROUTING_PATH
        required: false
        description: Optional path to the BusinessClaw Discord routing JSON file.
---

# BusinessClaw Discord Skill

Use this skill when BusinessClaw needs to inspect or update Discord routing metadata.

This skill does not replace OpenClaw's Discord channel plugin. OpenClaw still owns the real bot connection. This skill records the business-facing routing map:

- which Discord channels map to company rooms
- which employees own which channels or mention aliases
- which Discord users are board members/advisors
- how messages should be formatted by employee identity

## Local CLI Helper

This skill includes `bin/businessclaw-discord.mjs`.

Examples:

```powershell
node skills/businessclaw-discord/bin/businessclaw-discord.mjs status
node skills/businessclaw-discord/bin/businessclaw-discord.mjs set-channel --id board-room --discord-id 123 --name "#board-room" --room board --default-agent claw
node skills/businessclaw-discord/bin/businessclaw-discord.mjs set-employee-route --employee-id ledger --aliases ledger finance bank wallet --channel-id finance
node skills/businessclaw-discord/bin/businessclaw-discord.mjs set-board-user --member-id owen --discord-id 456 --name Owen
node skills/businessclaw-discord/bin/businessclaw-discord.mjs resolve --channel-id finance --text "ledger what's the bank level?"
```

By default it writes to:

```text
data/businessclaw-discord-routing.json
```

