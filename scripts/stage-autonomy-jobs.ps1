$ErrorActionPreference = "Stop"

# These jobs are created disabled by default. Enable after model auth is working:
# openclaw models status
# openclaw cron enable <job-id>

$jobs = @(
    @{
        Name = "BusinessClaw Company Momentum"
        Agent = "claw"
        Every = "1h"
        Message = "Run BusinessClaw Company Momentum: inspect current tasks, avoid repeating stale actions, pick one legal high-value business-building step, execute or plan the next concrete action, and record what changed. Treat owners as board members, not line managers."
    },
    @{
        Name = "BusinessClaw Finance Review"
        Agent = "ledger"
        Every = "6h"
        Message = "Run BusinessClaw Finance Review: inspect the earned-capital ledger, wallet notes, open spending proposals, and business costs. Update records if needed and identify any money/revenue risks."
    },
    @{
        Name = "BusinessClaw Tool Improvement"
        Agent = "forge"
        Every = "4h"
        Message = "Run BusinessClaw Tool Improvement: look for repeated company work that should become an OpenClaw skill, plugin, script, or standing order. Build or propose one useful improvement without exposing secrets."
    }
)

foreach ($job in $jobs) {
    openclaw cron add `
        --name $job.Name `
        --agent $job.Agent `
        --every $job.Every `
        --disabled `
        --session isolated `
        --timeout-seconds 600 `
        --message $job.Message
}

openclaw cron list

