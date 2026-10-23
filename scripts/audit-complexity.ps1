<#
.SYNOPSIS
    Report complexity and max-params warnings from eslint.

.DESCRIPTION
    CQ-SIZE-04, CQ-SIZE-06. Prints files with the most warnings,
    sorted by count.

.EXAMPLE
    .\scripts\audit-complexity.ps1
#>

param(
    [string]$ProjectRoot = (Join-Path $PSScriptRoot '..'),
    [int]$TopFiles = 20
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path $ProjectRoot).Path

Push-Location $ProjectRoot
try {
    Write-Host "Running eslint (compact format)..." -ForegroundColor Cyan

    $rawLines = & npx eslint . --format compact 2>&1

    $issues = @()
    foreach ($line in $rawLines) {
        if ($line -match '^(.+?):\s*line (\d+),\s*col (\d+),\s*(Warning|Error)\s*-\s*(.+?)\s*\((.+?)\)\s*$') {
            $issues += [PSCustomObject]@{
                File     = $matches[1]
                Line     = [int]$matches[2]
                Severity = $matches[4]
                Message  = $matches[5].Trim()
                Rule     = $matches[6]
            }
        }
    }

    $complexityIssues = $issues | Where-Object { $_.Rule -eq 'complexity' }
    $paramsIssues     = $issues | Where-Object { $_.Rule -eq 'max-params' }

    $sep = [IO.Path]::DirectorySeparatorChar
    $escapedRoot = [regex]::Escape($ProjectRoot + $sep)

    Write-Host ""
    Write-Host "=== COMPLEXITY (threshold 15) ===" -ForegroundColor Cyan
    Write-Host ""

    $byFile = $complexityIssues | Group-Object File | Sort-Object Count -Descending

    foreach ($group in ($byFile | Select-Object -First $TopFiles)) {
        $rel = $group.Name -replace $escapedRoot, ''
        Write-Host ("  {0} ({1})" -f $rel, $group.Count) -ForegroundColor Yellow
        foreach ($item in ($group.Group | Sort-Object Line)) {
            $complexity = if ($item.Message -match 'complexity of (\d+)') { $matches[1] } else { '?' }
            Write-Host ("    line {0} - complexity {1}" -f $item.Line, $complexity) -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "=== MAX-PARAMS (threshold 4) ===" -ForegroundColor Cyan
    Write-Host ""

    $byParams = $paramsIssues | Group-Object File | Sort-Object Count -Descending

    foreach ($group in ($byParams | Select-Object -First $TopFiles)) {
        $rel = $group.Name -replace $escapedRoot, ''
        Write-Host ("  {0} ({1})" -f $rel, $group.Count) -ForegroundColor Yellow
        foreach ($item in ($group.Group | Sort-Object Line)) {
            $params = if ($item.Message -match 'too many parameters \((\d+)\)') { $matches[1] } else { '?' }
            Write-Host ("    line {0} - params {1}" -f $item.Line, $params) -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "=== SUMMARY ===" -ForegroundColor Green
    Write-Host ("complexity: {0}" -f $complexityIssues.Count) -ForegroundColor Gray
    Write-Host ("max-params: {0}" -f $paramsIssues.Count) -ForegroundColor Gray
} finally {
    Pop-Location
}