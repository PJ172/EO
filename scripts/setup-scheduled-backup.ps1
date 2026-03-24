# =============================================================
# eOffice — Setup Scheduled Database Backup (Windows Task Scheduler)
# Run this script AS ADMINISTRATOR to create a daily backup task
# =============================================================

param(
    [string]$BackupTime = "02:00",
    [string]$TaskName = "eOffice-DB-Backup",
    [string]$ScriptDir = $PSScriptRoot
)

$backupScript = Join-Path $ScriptDir "backup-db.ps1"

if (-not (Test-Path $backupScript)) {
    Write-Host "[ERROR] Backup script not found: $backupScript" -ForegroundColor Red
    exit 1
}

Write-Host "============================================"
Write-Host "eOffice — Setup Scheduled Backup"
Write-Host "Task Name: $TaskName"
Write-Host "Schedule: Daily at $BackupTime"
Write-Host "Script: $backupScript"
Write-Host "============================================"

try {
    # Remove existing task if exists
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Removing existing task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    # Create action
    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`"" `
        -WorkingDirectory $ScriptDir

    # Create trigger — daily at specified time
    $trigger = New-ScheduledTaskTrigger -Daily -At $BackupTime

    # Create settings
    $settings = New-ScheduledTaskSettingsSet `
        -StartWhenAvailable `
        -DontStopOnIdleEnd `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 5) `
        -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries

    # Register task
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "eOffice PostgreSQL daily backup at $BackupTime" `
        -RunLevel Highest

    Write-Host ""
    Write-Host "[OK] Scheduled task created successfully!" -ForegroundColor Green
    Write-Host "     Task: $TaskName"
    Write-Host "     Time: Daily at $BackupTime"
    Write-Host ""
    Write-Host "To verify: Get-ScheduledTask -TaskName '$TaskName'"
    Write-Host "To run now: Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host "To remove: Unregister-ScheduledTask -TaskName '$TaskName'"

} catch {
    Write-Host "[ERROR] Failed to create scheduled task: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you run this script as Administrator!" -ForegroundColor Yellow
    exit 1
}
