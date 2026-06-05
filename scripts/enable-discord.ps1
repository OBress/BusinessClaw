param(
    [Parameter(Mandatory = $true)]
    [string]$BotToken,
    [string]$ApplicationId,
    [switch]$Persist = $true
)

$ErrorActionPreference = "Stop"

# The local gateway runs as a Scheduled Task in its own environment, so a
# process-scoped $env: var does NOT reach it. Persist the token to the user
# environment (setx) so the gateway inherits DISCORD_BOT_TOKEN when it restarts.
# (On the VPS the systemd EnvironmentFile /etc/businessclaw/businessclaw.env
# holds the token instead — see deployment/env/businessclaw.example.env.)
$env:DISCORD_BOT_TOKEN = $BotToken
if ($Persist) {
    setx DISCORD_BOT_TOKEN "$BotToken" | Out-Null
    Write-Host "Persisted DISCORD_BOT_TOKEN to the user environment."
}

if ($ApplicationId) {
    openclaw config set channels.discord.accounts.default.applicationId $ApplicationId
}

openclaw config set channels.discord.enabled true --strict-json

# Full restart so the Scheduled Task gateway picks up the new persistent env var.
openclaw gateway restart

Write-Host "Probing Discord channel status..."
openclaw channels status --probe

Write-Host ""
Write-Host "If the probe shows the token as missing, the gateway was started"
Write-Host "before the env var was persisted. Run 'openclaw gateway restart' once"
Write-Host "more, or restart the machine so the Scheduled Task inherits it."
