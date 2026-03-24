# =============================================================
# eOffice — Health Check Script
# Kiểm tra API, Database, Disk Space và gửi alert
# Usage: .\scripts\health-check.ps1
# =============================================================

param(
    [string]$ApiUrl = "http://localhost:3001/api/v1/health",
    [int]$DiskThresholdPercent = 85,
    [string]$LogDir = (Join-Path $PSScriptRoot "..\logs\health")
)

# Ensure log directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -Path $LogDir -ItemType Directory -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logFile = Join-Path $LogDir "health-$(Get-Date -Format 'yyyy-MM-dd').log"
$errors = @()

function Log($msg, $level = "INFO") {
    $entry = "[$timestamp] [$level] $msg"
    Add-Content -Path $logFile -Value $entry
    if ($level -eq "ERROR") {
        Write-Host $entry -ForegroundColor Red
    } elseif ($level -eq "WARN") {
        Write-Host $entry -ForegroundColor Yellow
    } else {
        Write-Host $entry
    }
}

Log "============ Health Check Start ============"

# =========================
# 1. API Health Check
# =========================
try {
    $response = Invoke-WebRequest -Uri $ApiUrl -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Log "API: OK (status=$($response.StatusCode))"
    } else {
        Log "API: Unexpected status $($response.StatusCode)" "WARN"
        $errors += "API returned status $($response.StatusCode)"
    }
} catch {
    Log "API: UNREACHABLE — $($_.Exception.Message)" "ERROR"
    $errors += "API is unreachable: $($_.Exception.Message)"
}

# =========================
# 2. Database Health Check
# =========================
$envFile = Join-Path $PSScriptRoot "..\apps\api\.env"
if (Test-Path $envFile) {
    $dbUrl = ""
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^DATABASE_URL=(.+)$") {
            $dbUrl = $Matches[1]
        }
    }

    if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)") {
        $dbUser = $Matches[1]
        $env:PGPASSWORD = $Matches[2]
        $dbHost = $Matches[3]
        $dbPort = $Matches[4]
        $dbName = $Matches[5]

        try {
            $result = & psql --host=$dbHost --port=$dbPort --username=$dbUser --dbname=$dbName -c "SELECT 1;" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Log "Database: OK (host=$dbHost, db=$dbName)"
            } else {
                Log "Database: CONNECTION FAILED" "ERROR"
                $errors += "Database connection failed"
            }
        } catch {
            Log "Database: psql not found or failed — $($_.Exception.Message)" "ERROR"
            $errors += "Database check failed: $($_.Exception.Message)"
        }
    }
} else {
    Log "Database: .env file not found, skipping" "WARN"
}

# =========================
# 3. Disk Space Check
# =========================
$drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null }
foreach ($drive in $drives) {
    $totalGB = [math]::Round(($drive.Used + $drive.Free) / 1GB, 1)
    $usedPercent = [math]::Round(($drive.Used / ($drive.Used + $drive.Free)) * 100, 1)

    if ($usedPercent -ge $DiskThresholdPercent) {
        Log "Disk $($drive.Name): $usedPercent% used of ${totalGB}GB — CRITICAL" "ERROR"
        $errors += "Disk $($drive.Name): $usedPercent% used"
    } else {
        Log "Disk $($drive.Name): $usedPercent% used of ${totalGB}GB — OK"
    }
}

# =========================
# 4. PM2 Process Check
# =========================
try {
    $pm2Status = & pm2 jlist 2>&1 | ConvertFrom-Json
    $apiProcs = $pm2Status | Where-Object { $_.name -eq "eoffice-api" }
    $webProcs = $pm2Status | Where-Object { $_.name -eq "eoffice-web" }

    if ($apiProcs) {
        $onlineApi = ($apiProcs | Where-Object { $_.pm2_env.status -eq "online" }).Count
        $totalApi = $apiProcs.Count
        if ($onlineApi -eq $totalApi) {
            Log "PM2 API: $onlineApi/$totalApi instances online"
        } else {
            Log "PM2 API: $onlineApi/$totalApi online — DEGRADED" "WARN"
            $errors += "PM2 API: only $onlineApi/$totalApi instances online"
        }
    } else {
        Log "PM2 API: Process not found" "ERROR"
        $errors += "PM2 API process not found"
    }

    if ($webProcs) {
        Log "PM2 Web: online"
    } else {
        Log "PM2 Web: Process not found" "WARN"
    }
} catch {
    Log "PM2: Not available (dev mode?)" "WARN"
}

# =========================
# 5. Memory Usage
# =========================
$os = Get-CimInstance -ClassName Win32_OperatingSystem
$freeMemGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$totalMemGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$usedMemPercent = [math]::Round((1 - $os.FreePhysicalMemory / $os.TotalVisibleMemorySize) * 100, 1)

if ($usedMemPercent -ge 90) {
    Log "Memory: $usedMemPercent% used ($freeMemGB GB free / $totalMemGB GB total) — CRITICAL" "ERROR"
    $errors += "Memory usage critical: $usedMemPercent%"
} elseif ($usedMemPercent -ge 80) {
    Log "Memory: $usedMemPercent% used — WARNING" "WARN"
} else {
    Log "Memory: $usedMemPercent% used ($freeMemGB GB free) — OK"
}

# =========================
# Summary
# =========================
Log "============ Health Check End ============"

if ($errors.Count -gt 0) {
    Log "RESULT: $($errors.Count) issue(s) found!" "ERROR"
    foreach ($err in $errors) {
        Log "  - $err" "ERROR"
    }
    exit 1
} else {
    Log "RESULT: All checks passed!" "INFO"
    exit 0
}
