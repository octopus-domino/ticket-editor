<#
.SYNOPSIS
    Replace relative imports with path aliases.

.DESCRIPTION
    Replaces 'from "../../shared/X"' with 'from "@/shared/X"'.
    Covers shared, domain, application, infrastructure, lib, presentation.
    Creates a backup of every changed file.

    CQ-IMP-01.

.PARAMETER RootPath
    Root folder to scan. Default: 'src/'.

.PARAMETER DryRun
    Show what would change, do not modify files.

.EXAMPLE
    .\scripts\refactor-imports.ps1 -DryRun
    .\scripts\refactor-imports.ps1
#>

param(
    [string]$RootPath = (Join-Path $PSScriptRoot '..\src'),
    [switch]$DryRun,
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'
$RootPath = (Resolve-Path $RootPath).Path

$aliasMap = [ordered]@{
    'shared'         = '@/shared'
    'domain'         = '@/domain'
    'application'    = '@/application'
    'infrastructure' = '@/infra'
    'lib'            = '@/lib'
    'presentation'   = '@/ui'
}

$extensions = @('.ts', '.tsx', '.mts', '.cts')
$backupDir = Join-Path $RootPath '.imports-backup'

if (-not $DryRun -and -not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$script:changedFiles = @()
$script:totalReplacements = 0

function Convert-Imports {
    param([string]$FilePath)

    $content = Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8
    if ([string]::IsNullOrEmpty($content)) { return 0 }

    $original = $content
    $localReplacements = 0

    foreach ($folder in $aliasMap.Keys) {
        $alias = $aliasMap[$folder]

        $patternFrom = "from '(?:\.\./)+$folder(/|')"
        $replacementFrom = "from '$alias`$1"
        $matches = [regex]::Matches($content, $patternFrom)
        if ($matches.Count -gt 0) {
            $content = [regex]::Replace($content, $patternFrom, $replacementFrom)
            $localReplacements += $matches.Count
        }

        $patternDyn = "import\('(?:\.\./)+$folder(/|')"
        $replacementDyn = "import('$alias`$1"
        $matchesDyn = [regex]::Matches($content, $patternDyn)
        if ($matchesDyn.Count -gt 0) {
            $content = [regex]::Replace($content, $patternDyn, $replacementDyn)
            $localReplacements += $matchesDyn.Count
        }
    }

    if ($content -ne $original) {
        $script:changedFiles += $FilePath
        $script:totalReplacements += $localReplacements

        if ($Verbose) {
            Write-Host ("  {0} (+{1})" -f $FilePath, $localReplacements) -ForegroundColor Yellow
        }

        if (-not $DryRun) {
            $rel = $FilePath.Substring($RootPath.Length).TrimStart('\', '/')
            $backup = Join-Path $backupDir ($rel -replace '[\\/:]', '__')
            Copy-Item -LiteralPath $FilePath -Destination $backup -Force
            Set-Content -LiteralPath $FilePath -Value $content -NoNewline -Encoding UTF8
        }
    }

    return $localReplacements
}

Write-Host "Scan: $RootPath" -ForegroundColor Cyan
if ($DryRun) { Write-Host "DRY RUN" -ForegroundColor Yellow }

$files = Get-ChildItem -LiteralPath $RootPath -Recurse -File |
    Where-Object {
        $extensions -contains $_.Extension.ToLower() -and
        $_.FullName -notmatch '\\node_modules\\'
    }

Write-Host "Files: $($files.Count)" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    Convert-Imports -FilePath $file.FullName | Out-Null
}

Write-Host ""
Write-Host "=== TOTAL ===" -ForegroundColor Green
Write-Host "Changed files: $($script:changedFiles.Count)" -ForegroundColor Green
Write-Host "Replacements:  $($script:totalReplacements)" -ForegroundColor Green

if ($DryRun) {
    Write-Host ""
    Write-Host "DRY RUN - nothing changed." -ForegroundColor Yellow
    Write-Host "Run without -DryRun to apply." -ForegroundColor Yellow
} else {
    if ($script:changedFiles.Count -gt 0) {
        Write-Host ""
        Write-Host "Backup: $backupDir" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "Next: .\scripts\check-all.ps1" -ForegroundColor Cyan
}