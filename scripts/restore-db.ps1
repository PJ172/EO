# =============================================================
# eOffice Database Restore Script (PostgreSQL)
# Usage: .\scripts\restore-db.ps1 -BackupZip "path\to\backup.sql.zip"
# =============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupZip,
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "eoffice",
    [string]$DbUser = "postgres",
    [switch]$Confirm
)

# Load .env if present
$envFile = Join-Path $PSScriptRoot "..\apps\api\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^DATABASE_URL=(.+)$") {
            $dbUrl = $Matches[1]
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

if (-not (Test-Path $BackupZip)) {
    Write-Host "[ERROR] Backup file not found: $BackupZip" -ForegroundColor Red
    exit 1
}

Write-Host "============================================"
Write-Host "eOffice Database Restore"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Source: $BackupZip"
Write-Host "Target: $DbName@$DbHost`:$DbPort"
Write-Host "============================================"

if (-not $Confirm) {
    Write-Host ""
    Write-Host "[WARNING] This will DROP and recreate the database '$DbName'!" -ForegroundColor Yellow
    Write-Host "Use -Confirm flag to proceed without prompt."
    $response = Read-Host "Are you sure? (yes/no)"
    if ($response -ne "yes") {
        Write-Host "Restore cancelled."
        exit 0
    }
}

try {
    # Extract zip
    $tempDir = Join-Path $env:TEMP "eoffice_restore_$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -Path $tempDir -ItemType Directory -Force | Out-Null
    Expand-Archive -Path $BackupZip -DestinationPath $tempDir -Force

    $sqlFile = Get-ChildItem -Path $tempDir -Filter "*.sql" | Select-Object -First 1
    if (-not $sqlFile) {
        throw "No .sql file found in backup archive"
    }

    Write-Host "`nRestoring from: $($sqlFile.Name)"

    # Drop and recreate database
    & psql --host=$DbHost --port=$DbPort --username=$DbUser -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid <> pg_backend_pid();" postgres 2>&1 | Out-Null
    & dropdb --host=$DbHost --port=$DbPort --username=$DbUser --if-exists $DbName 2>&1
    & createdb --host=$DbHost --port=$DbPort --username=$DbUser $DbName 2>&1

    # Restore
    & psql --host=$DbHost --port=$DbPort --username=$DbUser --dbname=$DbName --file=$($sqlFile.FullName) 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "psql restore failed with exit code $LASTEXITCODE"
    }

    Write-Host "`n[OK] Database restored successfully!" -ForegroundColor Green

} catch {
    Write-Host "`n[ERROR] Restore failed: $_" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup temp
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
}
