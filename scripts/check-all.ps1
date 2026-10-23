<#
.SYNOPSIS
    Full project check: typecheck + typecheck:test + eslint + dep-cruiser + vitest.
.DESCRIPTION
    Returns exit code 1 if anything fails.
.EXAMPLE
    .\scripts\check-all.ps1
#>

param(
    [string]$ProjectRoot = (Join-Path $PSScriptRoot '..')
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path $ProjectRoot).Path

Push-Location $ProjectRoot
try {
    $failed = @()
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    # 1. typecheck (src)
    Write-Host "[1/5] typecheck src..." -ForegroundColor Cyan -NoNewline
    $tscOut = & cmd /c "npx tsc -p tsconfig.json --noEmit 2>&1"
    $tscCode = $LASTEXITCODE
    if ($tscCode -ne 0) {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host ($tscOut -join "`n")
        $failed += 'typecheck'
    } else {
        Write-Host " ok" -ForegroundColor Green
    }

    # 2. typecheck (tests)
    Write-Host "[2/5] typecheck tests..." -ForegroundColor Cyan -NoNewline
    if (Test-Path 'tsconfig.test.json') {
        $tscTestOut = & cmd /c "npx tsc -p tsconfig.test.json --noEmit 2>&1"
        $tscTestCode = $LASTEXITCODE
        if ($tscTestCode -ne 0) {
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host ($tscTestOut -join "`n")
            $failed += 'typecheck:test'
        } else {
            Write-Host " ok" -ForegroundColor Green
        }
    } else {
        Write-Host " skip (no tsconfig.test.json)" -ForegroundColor Yellow
    }

    # 3. eslint
    Write-Host "[3/5] eslint..." -ForegroundColor Cyan -NoNewline
    $lintOut = & cmd /c "npx eslint . 2>&1"
    $lintCode = $LASTEXITCODE
    if ($lintCode -ne 0) {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host ($lintOut -join "`n")
        $failed += 'eslint'
    } else {
        $warnCount = ($lintOut -join "`n" | Select-String -Pattern 'warning' -AllMatches).Matches.Count
        Write-Host " ok ($warnCount warnings)" -ForegroundColor Green
    }

    # 4. dep-cruiser
    Write-Host "[4/5] dep-cruiser..." -ForegroundColor Cyan -NoNewline
    if (Test-Path '.dependency-cruiser.cjs') {
        $archOut = & cmd /c "npx depcruise --config .dependency-cruiser.cjs src 2>&1"
        $archCode = $LASTEXITCODE
        if ($archCode -ne 0) {
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host ($archOut -join "`n")
            $failed += 'depcruise'
        } else {
            Write-Host " ok" -ForegroundColor Green
        }
    } else {
        Write-Host " skip (no config)" -ForegroundColor Yellow
    }

    # 5. vitest
    Write-Host "[5/5] vitest..." -ForegroundColor Cyan -NoNewline
    if (Test-Path 'vitest.config.ts') {
        $testOut = & cmd /c "npx vitest run --no-color 2>&1"
        $testCode = $LASTEXITCODE
        if ($testCode -ne 0) {
            Write-Host " FAILED" -ForegroundColor Red
            # Печатаем ВСЁ что есть — не обрезаем, не интерпретируем.
            Write-Host ($testOut -join "`n")
            $failed += 'vitest'
        } else {
            $summary = ($testOut -join "`n" -split "`n" | Where-Object { $_ -match 'Tests\s+\d+' } | Select-Object -First 1)
            Write-Host " ok" -ForegroundColor Green
            if ($summary) { Write-Host "  $($summary.Trim())" -ForegroundColor DarkGray }
        }
    } else {
        Write-Host " skip (no vitest config)" -ForegroundColor Yellow
    }

    $sw.Stop()
    Write-Host ""
    Write-Host ("Elapsed: {0:N1}s" -f $sw.Elapsed.TotalSeconds) -ForegroundColor DarkGray

    if ($failed.Count -eq 0) {
        Write-Host "ALL PASSED" -ForegroundColor Green
        exit 0
    } else {
        Write-Host ("FAILED: {0}" -f ($failed -join ', ')) -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}