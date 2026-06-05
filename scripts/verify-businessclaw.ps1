param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")),
    [switch]$SkipDashboardSmoke
)

$ErrorActionPreference = "Stop"
$script:Failures = 0
$script:Warnings = 0

function Add-Result {
    param(
        [ValidateSet("PASS", "WARN", "FAIL")]
        [string]$Status,
        [string]$Name,
        [string]$Detail = ""
    )

    if ($Status -eq "FAIL") { $script:Failures += 1 }
    if ($Status -eq "WARN") { $script:Warnings += 1 }
    $line = "[$Status] $Name"
    if ($Detail) { $line = "$line - $Detail" }
    Write-Host $line
}

function Invoke-Checked {
    param(
        [string]$Command,
        [string]$Name,
        [int]$TimeoutSeconds = 60,
        [int]$Attempts = 2
    )

    # Background jobs give us a hard timeout against a hung gateway, but their
    # lifecycle cmdlets (Stop-Job/Remove-Job) occasionally race under load and
    # throw transient plumbing errors. Those must never be reported as product
    # failures, so cleanup is best-effort and a transient fault is retried once.
    for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
        $job = $null
        try {
            $job = Start-Job -ScriptBlock {
                param($Command, $Root)
                Set-Location $Root
                Invoke-Expression $Command 2>&1 | Out-String
            } -ArgumentList $Command, $Root

            if (-not (Wait-Job $job -Timeout $TimeoutSeconds)) {
                Stop-Job $job -Force -ErrorAction SilentlyContinue | Out-Null
                Remove-Job $job -Force -ErrorAction SilentlyContinue | Out-Null
                Add-Result FAIL $Name "timed out after ${TimeoutSeconds}s"
                return $null
            }

            $output = Receive-Job $job -ErrorAction SilentlyContinue
            Remove-Job $job -Force -ErrorAction SilentlyContinue | Out-Null
            return $output
        } catch {
            # Best-effort cleanup, then retry transient harness faults before
            # surfacing a real failure on the final attempt.
            if ($job) { Remove-Job $job -Force -ErrorAction SilentlyContinue | Out-Null }
            if ($attempt -ge $Attempts) {
                Add-Result FAIL $Name $_.Exception.Message
                return $null
            }
            Start-Sleep -Milliseconds 400
        }
    }
}

Set-Location $Root
Write-Host "BusinessClaw readiness verification"
Write-Host "Root: $Root"
Write-Host ""

$openclawVersion = Invoke-Checked "openclaw --version" "OpenClaw installed" 30
if ($openclawVersion) {
    Add-Result PASS "OpenClaw installed" ($openclawVersion.Trim())
}

$gateway = Invoke-Checked "openclaw gateway status" "OpenClaw gateway status" 60
if ($gateway) {
    if ($gateway -match "running|reachable|listening|127\.0\.0\.1") {
        Add-Result PASS "OpenClaw gateway reachable"
    } else {
        Add-Result WARN "OpenClaw gateway status unclear" ($gateway.Trim() -replace "\s+", " ")
    }
}

$models = Invoke-Checked "openclaw models status" "OpenClaw model status" 60
if ($models) {
    if ($models -match "Default\s+:\s+openai/gpt-5-nano") {
        Add-Result PASS "Cheap default model" "openai/gpt-5-nano"
    } else {
        Add-Result WARN "Cheap default model not confirmed" "Expected openai/gpt-5-nano"
    }
    if ($models -match "effective=missing|status=missing|Missing auth") {
        Add-Result WARN "Model auth missing" "Expected for local cost-safe dev; configure before autonomy."
    } else {
        Add-Result PASS "Model auth configured"
    }
}

$cost = Invoke-Checked "openclaw gateway usage-cost" "OpenClaw usage cost" 60
if ($cost) {
    if ($cost.Contains('$0.0000') -and $cost.Contains('0 tokens')) {
        Add-Result PASS "No OpenClaw token spend reported" ($cost.Trim() -replace "\s+", " ")
    } else {
        Add-Result WARN "OpenClaw token spend present or unclear" ($cost.Trim() -replace "\s+", " ")
    }
}

$cron = Invoke-Checked "openclaw cron list" "OpenClaw cron list" 60
if ($cron) {
    if ($cron -match "No cron jobs") {
        Add-Result PASS "No local cron jobs enabled"
    } else {
        Add-Result WARN "Cron jobs exist" ($cron.Trim() -replace "\s+", " ")
    }
}

$tasks = Invoke-Checked "openclaw tasks list --json" "OpenClaw tasks" 60
if ($tasks) {
    try {
        $taskJson = $tasks | ConvertFrom-Json
        if ([int]$taskJson.count -eq 0) {
            Add-Result PASS "No active OpenClaw tasks"
        } else {
            Add-Result WARN "OpenClaw tasks present" "count=$($taskJson.count)"
        }
    } catch {
        Add-Result WARN "Could not parse OpenClaw tasks JSON"
    }
}

$skills = Invoke-Checked "openclaw skills list" "OpenClaw skills" 60
if ($skills) {
    foreach ($skill in @("businessclaw-board", "businessclaw-discord", "businessclaw-ledger", "businessclaw-org", "businessclaw-revenue", "businessclaw-wallet")) {
        if ($skills -match [regex]::Escape($skill) -and $skills -match "ready\s+\|\s+$([regex]::Escape($skill))") {
            Add-Result PASS "Skill ready: $skill"
        } elseif ($skills -match [regex]::Escape($skill)) {
            Add-Result WARN "Skill listed but readiness unclear: $skill"
        } else {
            Add-Result FAIL "Missing skill: $skill"
        }
    }
}

$wallet = Invoke-Checked "node openclaw-runtime\workspace\skills\businessclaw-wallet\bin\businessclaw-wallet.mjs status" "Wallet skill" 30
if ($wallet) {
    try {
        $walletJson = $wallet | ConvertFrom-Json
        if ($walletJson.ok) {
            $address = if ($walletJson.publicAddress) { $walletJson.publicAddress } else { "not set" }
            Add-Result PASS "Wallet skill status" "address=$address"
        } else {
            Add-Result FAIL "Wallet skill status failed"
        }
    } catch {
        Add-Result FAIL "Wallet skill JSON parse failed"
    }
}

$board = Invoke-Checked "node openclaw-runtime\workspace\skills\businessclaw-board\bin\businessclaw-board.mjs status" "Board skill" 30
if ($board) {
    try {
        $boardJson = $board | ConvertFrom-Json
        if ($boardJson.ok) {
            Add-Result PASS "Board skill status" "members=$($boardJson.members.Count)"
        } else {
            Add-Result FAIL "Board skill status failed"
        }
    } catch {
        Add-Result FAIL "Board skill JSON parse failed"
    }
}

$discordRouting = Invoke-Checked "node openclaw-runtime\workspace\skills\businessclaw-discord\bin\businessclaw-discord.mjs status" "Discord routing skill" 30
if ($discordRouting) {
    try {
        $discordRoutingJson = $discordRouting | ConvertFrom-Json
        if ($discordRoutingJson.ok -and $discordRoutingJson.employeeRoutes.Count -ge 3) {
            Add-Result PASS "Discord routing skill status" "routes=$($discordRoutingJson.employeeRoutes.Count)"
        } else {
            Add-Result WARN "Discord routing skill route count unexpected"
        }
    } catch {
        Add-Result FAIL "Discord routing skill JSON parse failed"
    }
}

$org = Invoke-Checked "node openclaw-runtime\workspace\skills\businessclaw-org\bin\businessclaw-org.mjs status" "Org skill" 30
if ($org) {
    try {
        $orgJson = $org | ConvertFrom-Json
        if ($orgJson.ok -and $orgJson.activeEmployees.Count -ge 3) {
            Add-Result PASS "Org skill employees" "active=$($orgJson.activeEmployees.Count)"
        } else {
            Add-Result WARN "Org skill employee count unexpected"
        }
    } catch {
        Add-Result FAIL "Org skill JSON parse failed"
    }
}

$queue = Invoke-Checked "node openclaw-runtime\workspace\skills\businessclaw-queue\bin\businessclaw-queue.mjs status" "Queue skill" 30
if ($queue) {
    try {
        $queueJson = $queue | ConvertFrom-Json
        if ($queueJson.ok) {
            Add-Result PASS "Queue skill status" "total=$($queueJson.total) served=$($queueJson.stats.served) dead=$($queueJson.stats.dead)"
        } else {
            Add-Result FAIL "Queue skill status failed"
        }
    } catch {
        Add-Result FAIL "Queue skill JSON parse failed"
    }
}

$execPolicy = Invoke-Checked "openclaw exec-policy show" "Exec policy" 60
if ($execPolicy) {
    if ($execPolicy -match "security=full") {
        Add-Result PASS "Agents have full exec autonomy" "security=full"
    } elseif ($execPolicy -match "security=(deny|allowlist)") {
        Add-Result WARN "Exec policy is restricted" "Run 'openclaw exec-policy preset yolo' for full VPS autonomy."
    } else {
        Add-Result WARN "Exec policy unclear" "Could not confirm effective security level."
    }
}

$discord = Invoke-Checked "openclaw config get channels.discord" "Discord config" 60
if ($discord) {
    try {
        $discordJson = $discord | ConvertFrom-Json
        if ($discordJson.accounts.default.token.id -eq "DISCORD_BOT_TOKEN") {
            Add-Result PASS "Discord token uses env SecretRef" "DISCORD_BOT_TOKEN"
        } else {
            Add-Result WARN "Discord token SecretRef not confirmed"
        }
        if ($discordJson.enabled -eq $true) {
            Add-Result PASS "Discord enabled"
        } else {
            Add-Result WARN "Discord disabled" "Expected locally until token exists."
        }
    } catch {
        Add-Result WARN "Could not parse Discord config"
    }
}

$dashboardState = Invoke-Checked "Invoke-RestMethod -Uri http://127.0.0.1:4177/api/state | ConvertTo-Json -Depth 4" "Dashboard API" 80
if ($dashboardState) {
    try {
        $stateJson = $dashboardState | ConvertFrom-Json
        if ($stateJson.dashboard.mode -eq "display-only" -and $stateJson.dashboard.inputEnabled -eq $false) {
            Add-Result PASS "Dashboard API display-only mode"
        } else {
            Add-Result FAIL "Dashboard API display-only mode not confirmed"
        }
        if ($stateJson.wallet -and $stateJson.board -and $stateJson.discordRouting -and $stateJson.fileCabinet -and $stateJson.boardMessages -ne $null) {
            Add-Result PASS "Dashboard data includes wallet, board, Discord routing, cabinet, and board messages"
        } else {
            Add-Result WARN "Dashboard data missing wallet/board/Discord routing/cabinet/board-message section"
        }
    } catch {
        Add-Result FAIL "Dashboard API JSON parse failed"
    }
}

if (-not $SkipDashboardSmoke) {
    $smoke = Invoke-Checked "Push-Location dashboard; npm run smoke; Pop-Location" "Dashboard smoke test" 90
    if ($smoke) {
        if ($smoke -match '"formInputCount":\s+0' -and $smoke -match '"clickableSprites":\s+3' -and $smoke -match '"microphone":\s+true') {
            Add-Result PASS "Dashboard smoke test"
        } else {
            Add-Result FAIL "Dashboard smoke output did not confirm required UI"
        }
    }
}

Write-Host ""
Write-Host "Result: $script:Failures failure(s), $script:Warnings warning(s)."
if ($script:Failures -gt 0) {
    exit 1
}
exit 0
