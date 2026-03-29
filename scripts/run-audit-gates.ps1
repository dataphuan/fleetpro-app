$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$date = Get-Date -Format 'yyyyMMdd'
$securityDir = Join-Path $root "docs/evidence/security/$date"
$onlineDir = Join-Path $root "docs/evidence/online/$date"
New-Item -ItemType Directory -Force -Path $securityDir | Out-Null
New-Item -ItemType Directory -Force -Path $onlineDir | Out-Null

$logFile = Join-Path $securityDir 'commands.log'
"# Security Gate Commands Log" | Out-File -FilePath $logFile -Encoding utf8
"Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Add-Content -Path $logFile
"Executor: $env:USERNAME" | Add-Content -Path $logFile
"" | Add-Content -Path $logFile

function Run-And-Log {
    param(
        [string]$Label,
        [string]$Command
    )

    "## $Label" | Add-Content -Path $logFile
    "Command: $Command" | Add-Content -Path $logFile

    $output = powershell -NoProfile -Command $Command 2>&1
    $exitCode = $LASTEXITCODE

    $output | Add-Content -Path $logFile
    "ExitCode: $exitCode" | Add-Content -Path $logFile
    "" | Add-Content -Path $logFile

    Write-Host "$Label -> exit $exitCode"
    return @{ ExitCode = $exitCode; Output = ($output -join "`n") }
}

# Prerequisites
$javaRes = Run-And-Log -Label 'java -version' -Command 'java -version'
$fbRes = Run-And-Log -Label 'firebase --version' -Command 'firebase --version'
$fbLoginRes = Run-And-Log -Label 'firebase login:list' -Command 'firebase login:list'

$javaExit = $javaRes.ExitCode
$fbExit = $fbRes.ExitCode
$fbLoginExit = $fbLoginRes.ExitCode
$fbLoginDetected = $true
if ($fbLoginRes.Output -match 'No authorized accounts') {
    $fbLoginDetected = $false
}

# Technical gates
$lintRes = Run-And-Log -Label 'npm run lint' -Command 'npm run lint'
$typeRes = Run-And-Log -Label 'npm run typecheck' -Command 'npm run typecheck'
$buildRes = Run-And-Log -Label 'npm run build' -Command 'npm run build'

$lintExit = $lintRes.ExitCode
$typeExit = $typeRes.ExitCode
$buildExit = $buildRes.ExitCode

# Security gate only when prerequisites are met
if ($javaExit -eq 0 -and $fbExit -eq 0 -and $fbLoginExit -eq 0 -and $fbLoginDetected) {
    $secRes = Run-And-Log -Label 'npm run qa:security:firestore' -Command 'npm run qa:security:firestore'
    $secExit = $secRes.ExitCode
} else {
    "## npm run qa:security:firestore" | Add-Content -Path $logFile
    "Skipped due to unmet prerequisites (Java/Firebase login)." | Add-Content -Path $logFile
    "ExitCode: 999" | Add-Content -Path $logFile
    "" | Add-Content -Path $logFile
    $secExit = 999
}

$summary = @()
$summary += "java=$javaExit"
$summary += "firebase_cli=$fbExit"
$summary += "firebase_login_cmd=$fbLoginExit"
$summary += "firebase_login_detected=$([int]$fbLoginDetected)"
$summary += "lint=$lintExit"
$summary += "typecheck=$typeExit"
$summary += "build=$buildExit"
$summary += "security=$secExit"

$summaryText = $summary -join '; '
"Summary: $summaryText" | Add-Content -Path $logFile
Write-Host $summaryText

if ($lintExit -eq 0 -and $typeExit -eq 0 -and $buildExit -eq 0 -and $secExit -eq 0) {
    exit 0
}

exit 1
