# =============================================================
# eOffice Database Backup Script (PostgreSQL)
# Usage: .\scripts\backup-db.ps1
# Schedule: Windows Task Scheduler (daily at 02:00 AM)
# =============================================================

param(
    [string]$BackupDir = "D:\00.APPS\eOffice\backups",
    [int]$RetainDays = 7,
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "eoffice",
    [string]$DbUser = "postgres"
)

# Load .env if present
$envFile = Join-Path $PSScriptRoot "..\apps\api\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^DATABASE_URL=(.+)$") {
            $dbUrl = $Matches[1]
            # Parse: postgresql://user:pass@host:port/dbname
            if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+?)(\?|$)") {
                $DbUser = $Matches[1]
                $env:PGPASSWORD = $Matches[2]
                $DbHost = $Matches[3]
                $DbPort = $Matches[4]
                $DbName = $Matches[5]
            }
        }
    }
}

# Create backup directory
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $BackupDir $timestamp
New-Item -Path $backupPath -ItemType Directory -Force | Out-Null

$backupFile = Join-Path $backupPath "$DbName`_$timestamp.sql"
$logFile = Join-Path $backupPath "backup.log"

Write-Host "============================================" | Tee-Object -FilePath $logFile
Write-Host "eOffice Database Backup" | Tee-Object -FilePath $logFile -Append
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Tee-Object -FilePath $logFile -Append
Write-Host "Database: $DbName@$DbHost`:$DbPort" | Tee-Object -FilePath $logFile -Append
Write-Host "Output: $backupFile" | Tee-Object -FilePath $logFile -Append
Write-Host "============================================" | Tee-Object -FilePath $logFile -Append

try {
    # Run pg_dump
    $pgDumpPath = "pg_dump"

    & $pgDumpPath `
        --host=$DbHost `
        --port=$DbPort `
        --username=$DbUser `
        --dbname=$DbName `
        --format=plain `
        --no-owner `
        --no-privileges `
        --file=$backupFile `
        2>&1 | Tee-Object -FilePath $logFile -Append

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    $fileSize = (Get-Item $backupFile).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-Host "`n[OK] Backup successful! Size: $fileSizeMB MB" | Tee-Object -FilePath $logFile -Append

    # Compress backup
    $zipFile = "$backupFile.zip"
    Compress-Archive -Path $backupFile -DestinationPath $zipFile -Force
    Remove-Item $backupFile -Force
    $zipSize = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)
    Write-Host "[OK] Compressed: $zipSize MB" | Tee-Object -FilePath $logFile -Append

} catch {
    Write-Host "`n[ERROR] Backup failed: $_" | Tee-Object -FilePath $logFile -Append
    exit 1
}

# =============================================================
# Cleanup old backups (retain last N days)
# =============================================================
Write-Host "`n--- Cleaning up backups older than $RetainDays days ---" | Tee-Object -FilePath $logFile -Append

$cutoffDate = (Get-Date).AddDays(-$RetainDays)
$oldBackups = Get-ChildItem -Path $BackupDir -Directory | Where-Object {
    $_.CreationTime -lt $cutoffDate
}

foreach ($dir in $oldBackups) {
    Write-Host "  Removing: $($dir.Name)" | Tee-Object -FilePath $logFile -Append
    Remove-Item $dir.FullName -Recurse -Force
}

Write-Host "`n[DONE] Backup process completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Tee-Object -FilePath $logFile -Append
Write-Host "Backups retained: $RetainDays days" | Tee-Object -FilePath $logFile -Append
