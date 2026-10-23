<#
.SYNOPSIS
    Enable noUncheckedIndexedAccess in tsconfig.json and generate a report.

.DESCRIPTION
    CQ-TS-02. After running, you need to manually fix places where
    array/object access can be undefined.

    Rollback: copy tsconfig.json.bak back.

.PARAMETER ProjectRoot
    Project root folder.

.PARAMETER Force
    Do not ask for confirmation.

.EXAMPLE
    .\scripts\enable-strict-index.ps1
    .\scripts\enable-strict-index.ps1 -Force
#>

param(
    [string]$ProjectRoot = (Join-Path $PSScriptRoot '..'),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$tsconfigPath = Join-Path $ProjectRoot 'tsconfig.json'
$backupPath = "$tsconfigPath.bak"

if (-not (Test-Path $tsconfigPath)) {
    Write-Error "tsconfig.json not found: $tsconfigPath"
    exit 1
}

$content = Get-Content -LiteralPath $tsconfigPath -Raw -Encoding UTF8

if ($content -match '"noUncheckedIndexedAccess"\s*:\s*true') {
    Write-Host "noUncheckedIndexedAccess already enabled." -ForegroundColor Yellow
    Write-Host "Running tsc for report..." -ForegroundColor Cyan
} else {
    if (-not $Force) {
        Write-Host "Flag will be added to $tsconfigPath" -ForegroundColor Yellow
        Write-Host "This may produce 300+ errors - they go to a report file."
        Write-Host "Continue? (y/N): " -NoNewline
        $answer = Read-Host
        if ($answer -ne 'y' -and $answer -ne 'Y') {
            Write-Host "Cancelled." -ForegroundColor Red
            exit 0
        }
    }

    Copy-Item -LiteralPath $tsconfigPath -Destination $backupPath -Force
    Write-Host "Backup: $backupPath" -ForegroundColor DarkGray

    if ($content -match '"noUncheckedIndexedAccess"\s*:\s*(true|false)') {
        $content = $content -replace '"noUncheckedIndexedAccess"\s*:\s*(true|false)', '"noUncheckedIndexedAccess": true'
    } else {
        $content = $content -replace '("strict"\s*:\s*true,)', "`$1`r`n    `"noUncheckedIndexedAccess`": true,"
    }

    Set-Content -LiteralPath $tsconfigPath -Value $content -NoNewline -Encoding UTF8
    Write-Host "Flag enabled." -ForegroundColor Green
}

Write-Host ""
Write-Host "Running tsc..." -ForegroundColor Cyan
Push-Location $ProjectRoot
try {
    $output = & npx tsc -p tsconfig.json --noEmit 2>&1 | Out-String
    $reportPath = Join-Path $ProjectRoot 'tsc-strict-index-report.txt'
    $output | Set-Content -Path $reportPath -Encoding UTF8

    $errorCount = ([regex]::Matches($output, 'error TS\d+')).Count
    $fileCount = ([regex]::Matches($output, '(?m)^src[\\/][^:]+\.tsx?:')).Count

    Write-Host ""
    Write-Host "=== RESULT ===" -ForegroundColor Cyan
    $errColor = if ($errorCount -gt 0) { 'Red' } else { 'Green' }
    $fileColor = if ($fileCount -gt 0) { 'Yellow' } else { 'Green' }
    Write-Host ("Errors:  {0}" -f $errorCount) -ForegroundColor $errColor
    Write-Host ("Files:   {0}" -f $fileCount) -ForegroundColor $fileColor
    Write-Host ("Report:  {0}" -f $reportPath) -ForegroundColor Green
    Write-Host ""
    Write-Host "Rollback: Copy-Item '$backupPath' '$tsconfigPath' -Force" -ForegroundColor DarkGray
} finally {
    Pop-Location
}