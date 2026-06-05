param(
    [string]$WorkspaceRoot = (Resolve-Path "."),
    [switch]$EnableDiscord
)

$ErrorActionPreference = "Stop"

$runtime = Join-Path $WorkspaceRoot "openclaw-runtime"
$mainWorkspace = Join-Path $runtime "workspace"
$agentsRoot = Join-Path $runtime "agents"

openclaw setup --non-interactive --accept-risk --workspace $mainWorkspace

Copy-Item -Path (Join-Path $WorkspaceRoot "openclaw-workspace\main\*") -Destination $mainWorkspace -Recurse -Force
New-Item -ItemType Directory -Force (Join-Path $mainWorkspace "skills") | Out-Null
Copy-Item -Path (Join-Path $WorkspaceRoot "openclaw-workspace\skills\*") -Destination (Join-Path $mainWorkspace "skills") -Recurse -Force

foreach ($agent in @("claw", "ledger", "forge")) {
    $workspace = Join-Path $agentsRoot "$agent\workspace"
    $agentDir = Join-Path $agentsRoot "$agent\agent"
    New-Item -ItemType Directory -Force $workspace | Out-Null
    New-Item -ItemType Directory -Force (Join-Path $workspace "skills") | Out-Null

    Copy-Item -Path (Join-Path $WorkspaceRoot "openclaw-workspace\main\SOUL.md") -Destination $workspace -Force
    Copy-Item -Path (Join-Path $WorkspaceRoot "openclaw-workspace\main\TOOLS.md") -Destination $workspace -Force
    Copy-Item -Path (Join-Path $WorkspaceRoot "openclaw-workspace\main\MEMORY.md") -Destination $workspace -Force
    Copy-Item -Path (Join-Path $WorkspaceRoot "openclaw-workspace\main\standing-orders.md") -Destination $workspace -Force
    Copy-Item -Path (Join-Path $WorkspaceRoot "openclaw-workspace\agents\$agent\AGENTS.md") -Destination $workspace -Force
    Copy-Item -Path (Join-Path $WorkspaceRoot "openclaw-workspace\skills\*") -Destination (Join-Path $workspace "skills") -Recurse -Force

    openclaw agents add $agent --workspace $workspace --agent-dir $agentDir --non-interactive
}

openclaw agents set-identity --agent claw --name "Claw" --emoji "brain" --theme executive
openclaw agents set-identity --agent ledger --name "Ledger" --emoji "briefcase" --theme finance
openclaw agents set-identity --agent forge --name "Forge" --emoji "hammer" --theme builder

openclaw plugins install "@openclaw/discord" --pin
openclaw channels add --channel discord --name "BusinessClaw Discord" --use-env
openclaw config set channels.discord.accounts.default.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled ($(if ($EnableDiscord) { "true" } else { "false" })) --strict-json

openclaw gateway install
openclaw gateway start
openclaw gateway status
