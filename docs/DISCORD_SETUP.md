# Discord Setup

BusinessClaw uses OpenClaw's Discord bot/channel plugin. It does not install the Discord desktop app.

## Current Local State

- OpenClaw Discord plugin is installed.
- Discord channel account `default` is configured to read `DISCORD_BOT_TOKEN` from the environment.
- Discord is currently disabled so the Gateway can run without a token.

## Create The Bot

1. Go to the Discord Developer Portal.
2. Create an application.
3. Create a bot user.
4. Enable the intents OpenClaw requires, especially Message Content Intent if you want rich server chat behavior.
5. Copy the bot token.
6. Invite the bot to your server with message, slash command, thread, reaction, and voice permissions as needed.

## Configure Locally

Set environment variables outside the repo:

```powershell
$env:DISCORD_BOT_TOKEN="your-token"
$env:DISCORD_APPLICATION_ID="optional-application-id"
```

Then enable Discord:

```powershell
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway restart
openclaw channels status --probe
```

If OpenClaw cannot infer the application id, set it as a literal string:

```powershell
openclaw config set channels.discord.accounts.default.applicationId "123456789012345678"
openclaw gateway restart
```

## Employee Communication

Use OpenClaw multi-agent routing and mention patterns for employee-style behavior:

- `claw`: company strategy and board communication.
- `ledger`: finance, wallet, bank level, earned-capital ledger.
- `forge`: tools, skills, automation, dashboard integration.

Practical routing model:

- Use one Discord bot/channel first for the company.
- Route ordinary company messages to `claw`.
- Route finance/wallet/bank-level messages to `ledger`.
- Route tool/automation/skill messages to `forge`.
- If you want employees to appear as separate Discord bot users later, create one Discord application/bot token per employee and bind each account to its OpenClaw agent.

Record the business routing map with `businessclaw-discord`:

```powershell
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs status
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs set-channel --id board-room --discord-id 123 --name "#board-room" --room board --default-agent claw
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs set-employee-route --employee-id ledger --aliases ledger finance bank wallet --channel-id finance
node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs set-board-user --member-id owen --discord-id 456 --name Owen
```

Recommended server channels:

- `#board-room`: owners/board discussion.
- `#ops-floor`: general company work.
- `#finance`: Ledger updates.
- `#forge`: tools and automation.
- `#announcements`: summarized updates.

## Board Member Model

Owners are board members, not line managers. BusinessClaw should ask for advice, report material decisions, and accept governance/safety constraints, but it should run routine work itself.

Record board/advisor identities and advice with the `businessclaw-board` skill:

```powershell
node openclaw-runtime\workspace\skills\businessclaw-board\bin\businessclaw-board.mjs add-member --id owen --name Owen --discord-id 123 --role "Board Member"
node openclaw-runtime\workspace\skills\businessclaw-board\bin\businessclaw-board.mjs advice --member-id owen --employee-id claw --message "Prioritize low-cost revenue experiments."
```

This gives multiple Discord owners/advisors stable identities without turning them into line managers.

Recommended board channels:

- `#board-room`: advice, strategy, governance, and important approvals.
- `#ops-floor`: normal company updates.
- `#finance`: Ledger updates and bank-level view.
- `#forge`: skill/tool work and automation updates.

## Enable Once Token Exists

```powershell
.\scripts\enable-discord.ps1 -BotToken "your-token" -ApplicationId "optional-app-id"
```

Then test:

```powershell
openclaw channels status --probe
openclaw channels resolve --channel discord --target channel:<channel-id>
```
