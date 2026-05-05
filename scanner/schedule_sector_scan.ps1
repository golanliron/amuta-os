# Schedule Fishgold Sector Intelligence Scanner to run daily at 06:00
# Run this script once as administrator to set up the task

$taskName = "FishgoldSectorScanner"
$pythonPath = "python"
$scriptPath = Join-Path $PSScriptRoot "sector_scanner.py"

# Check if task already exists
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Task '$taskName' already exists. Removing..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the action
$action = New-ScheduledTaskAction `
    -Execute $pythonPath `
    -Argument $scriptPath `
    -WorkingDirectory $PSScriptRoot

# Create trigger: daily at 06:00
$trigger = New-ScheduledTaskTrigger -Daily -At "06:00"

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# Register the task
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Fishgold: Daily scan of Israeli third-sector news sources for sector intelligence" `
    -RunLevel Highest

Write-Host ""
Write-Host "Task '$taskName' scheduled successfully!"
Write-Host "  Schedule: Daily at 06:00"
Write-Host "  Script: $scriptPath"
Write-Host ""
Write-Host "To run manually: python `"$scriptPath`""
Write-Host "To check status: Get-ScheduledTask -TaskName '$taskName'"
