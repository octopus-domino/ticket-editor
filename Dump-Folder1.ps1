<#
.SYNOPSIS
    Dump folder contents to a single text file.

.DESCRIPTION
    Three presets:
      -Preset Overview - minimum to understand a product (README, manifests, entry points).
      -Preset Source   (default) - sources without bundles, templates, locales.
      -Preset Full     - everything, except binaries.

    Large files are handled by -LargeFilePolicy:
      Skip     - not in tree, not in contents.
      Header   - in tree, but contents show only a header with size.
      Truncate - in tree and in contents (first N lines).

.EXAMPLE
    .\dump.ps1 -Path C:\src\drawio -Output drawio-src.txt
    .\dump.ps1 -Path C:\src\drawio -Output drawio-java.txt -IncludePath 'src\main\java\'
    .\dump.ps1 -Path C:\src\drawio -Output drawio.txt -LargeFilePolicy Truncate -TruncateLines 80
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,

    [string]$Output = "dump.txt",

    [ValidateSet("Overview", "Source", "Full")]
    [string]$Preset = "Source",

    [string[]]$IncludePath = @(),

    # Threshold for "large file". Anything bigger is handled by LargeFilePolicy.
    [long]$MaxFileSize = 126KB,

    # What to do with files > MaxFileSize.
    [ValidateSet("Skip", "Header", "Truncate")]
    [string]$LargeFilePolicy = "Header",

    # How many lines to show in Truncate mode.
    [int]$TruncateLines = 200,

    # Print top-N largest included files at the end.
    [int]$TopLargest = 10,

    # ============================================================
    #  Common excludes (all presets)
    # ============================================================
    [string[]]$Exclude = @(
        "\.git\",
        "\.github\ISSUE_TEMPLATE\",
        "\node_modules\",
        "\bower_components\",
        "\vendor\",
        "\bin\",
        "\obj\",
        "\dist\",
        "\build\",
        "\target\",
        "\out\",
        "\coverage\",
        "\.gradle\",
        "\.idea\",
        "\.vscode\",
        "\.next\",
        "\.nuxt\",
        "\fonts\",
        "\resources\images\",
        "\images\",
        "\img\",
        "\icons\",
        "\.png\", "\.jpg\", "\.jpeg", "\.gif\", "\.ico\",
        "\.webp\", "\.bmp\", "\.tiff\", "\.psd\",
        "\.woff\", "\.woff2\", "\.ttf\", "\.eot\", "\.otf\",
        "\.pdf\", "\.zip\", "\.tar\", "\.gz\", "\.7z\", "\.jar\",
        "\.class\", "\.exe", "\.dll\", "\.so\", "\.dylib\"
    ),

    # ============================================================
    #  Preset Source: junk folders
    # ============================================================
    [string[]]$SourceExclude = @(
        "\js\mxgraph\",
        "\js\jquery\",
        "\js\MathJax\",
        "\js\bootstrap\",
        "\js\codemirror\",
        "\js\dyo\",
        "\js\sanitizer\",
        "\js\spin\",
        "\js\stencils\",
        "\templates\",
        "\template\",
        "\locales\",
        "\locale\",
        "\i18n\",
        "\l10n\",
        "\translations\",
        "\lang\",
        "\__tests__\",
        "\__mocks__\",
        "\test\fixtures\",
        "\tests\fixtures\",
        "\testdata\",
        "\samples\",
        "\examples\data\"
    ),

    # ============================================================
    #  Preset Source: regex on file name
    # ============================================================
    [string[]]$SourceNamePatterns = @(
        "\.min\.", "-min\.", "_min\.",
        "\.bundle\.", "\.compiled\.", "\.packed\.",
        "\.optimized\.", "\.minified\.",
        "\.chunk\.", "-chunk\.",
        "\.[0-9a-f]{8,}\.(js|css|mjs)$",
        "[._-][0-9a-f]{20,}\.(js|css|mjs)$",
        "\.concat\.(js|css)$", "\.all\.(js|css)$", "\.pack\.(js|css)$",
        "-[0-9]+\.[0-9]+\.[0-9]+\.(js|css|mjs)$",
        "\.[0-9]+\.[0-9]+\.[0-9]+\.(js|css|mjs)$",
        "\.js\.map$", "\.css\.map$", "\.mjs\.map$", "\.map\.json$",
        "\.d\.ts$", "\.d\.mts$",
        "package-lock\.json$", "yarn\.lock$", "pnpm-lock\.yaml$",
        "npm-shrinkwrap\.json$", "composer\.lock$", "Gemfile\.lock$",
        "\.lock$",
        "\.drawio\.xml$", "\.drawio$",
        "^[A-Za-z]{2}(-[A-Za-z]{2,4})?\.json$",
        "\.snap$"
    ),

    # ============================================================
    #  Preset Full: extension whitelist
    # ============================================================
    [string[]]$Include = @(
        ".java", ".kt", ".groovy", ".scala",
        ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".vue", ".svelte",
        ".c", ".cpp", ".cc", ".h", ".hpp",
        ".py", ".rb", ".go", ".rs", ".php",
        ".html", ".htm", ".xhtml",
        ".jsp", ".jspf", ".tag", ".ftl",
        ".css", ".scss", ".sass", ".less",
        ".xml", ".xsd", ".dtd", ".xsl", ".xslt",
        ".gradle", ".kts", ".properties",
        ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf",
        ".json",
        ".md", ".sql",
        ".sh", ".bash", ".zsh", ".bat", ".cmd", ".ps1"
    ),

    [string[]]$ExcludeNamePatterns = @(
        "\.min\.", "-min\.", "_min\.",
        "\.bundle\.", "\.compiled\.", "\.packed\.",
        "\.optimized\.", "\.minified\.",
        "\.chunk\.", "-chunk\.",
        "\.[0-9a-f]{8,}\.(js|css|mjs)$",
        "[._-][0-9a-f]{20,}\.(js|css|mjs)$",
        "\.concat\.(js|css)$", "\.all\.(js|css)$", "\.pack\.(js|css)$",
        "-[0-9]+\.[0-9]+\.[0-9]+\.(js|css|mjs)$",
        "\.[0-9]+\.[0-9]+\.[0-9]+\.(js|css|mjs)$",
        "\.js\.map$", "\.css\.map$", "\.mjs\.map$", "\.map\.json$",
        "\.d\.ts$", "\.d\.mts$",
        "package-lock\.json$", "yarn\.lock$", "pnpm-lock\.yaml$",
        "npm-shrinkwrap\.json$", "composer\.lock$", "Gemfile\.lock$",
        "\.lock$",
        "\.drawio\.xml$", "\.drawio$"
    ),

    # ============================================================
    #  Preset Overview: "shop window"
    # ============================================================
    [string[]]$OverviewPatterns = @(
        '^[^/]+\.(md|rst|adoc)$',
        '^LICENSE(\.\w+)?$', '^NOTICE(\.\w+)?$',
        '^CHANGELOG(\.\w+)?$', '^CHANGES(\.\w+)?$',
        '^CONTRIBUTING(\.\w+)?$', '^AUTHORS(\.\w+)?$',
        '^SECURITY(\.\w+)?$', '^COPYING(\.\w+)?$',
        '^package\.json$', '^tsconfig(\.\w+)?\.json$',
        '^pom\.xml$', '^build\.gradle(\.kts)?$', '^settings\.gradle(\.kts)?$',
        '^Cargo\.toml$', '^go\.mod$', '^Gemfile$',
        '^composer\.json$', '^requirements(\.\w+)?\.txt$',
        '^pyproject\.toml$', '^setup\.(py|cfg)$',
        '^Dockerfile(\..+)?$', '^docker-compose(\..+)?\.ya?ml$',
        '^\.dockerignore$', '^\.env\.example$',
        '^\.github/workflows/.+\.ya?ml$',
        '^\.gitlab-ci\.yml$', '^\.travis\.yml$', '^Jenkinsfile$',
        '^\.editorconfig$', '^\.gitignore$', '^\.gitattributes$',
        '^src/main/java/.+/(Application|Main|App)\.java$',
        '^src/(index|main|app)\.(ts|tsx|js|jsx|mjs)$',
        '^src/main\.(ts|tsx|js|jsx)$',
        '^main\.py$', '^app\.py$',
        '^src/main\.rs$', '^cmd/.+/main\.go$',
        '^docs/[^/]+\.(md|rst|txt)$', '^doc/[^/]+\.(md|rst|txt)$'
    )
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) { Write-Error "Folder not found: $Path"; exit 1 }

$root    = (Resolve-Path $Path).Path
$outFull = [System.IO.Path]::GetFullPath($Output)

if (Test-Path $outFull) { Remove-Item -LiteralPath $outFull -Force }

# ===============================================================
#  Filters
# ===============================================================

function Test-PathExcluded {
    param([string]$RelPath, [string[]]$ExtraPatterns)
    $wrapped = "\" + $RelPath + "\"
    foreach ($ex in $Exclude) {
        if ($wrapped -like "*$ex*") { return $true }
    }
    if ($ExtraPatterns) {
        foreach ($ex in $ExtraPatterns) {
            if ($wrapped -like "*$ex*") { return $true }
        }
    }
    return $false
}

function Test-InIncludePath {
    param([string]$RelPath)
    if ($IncludePath.Count -eq 0) { return $true }
    $wrapped = "\" + $RelPath + "\"
    foreach ($p in $IncludePath) {
        if ($wrapped -like "*$p*") { return $true }
    }
    return $false
}

function Test-OverviewFile {
    param([string]$RelPath)
    $norm = $RelPath.Replace('\', '/')
    foreach ($p in $OverviewPatterns) {
        if ($norm -match $p) { return $true }
    }
    return $false
}

function Test-FileAllowed {
    param([System.IO.FileInfo]$File)

    $rel = $File.FullName.Substring($root.Length).TrimStart('\')

    if ($File.FullName -eq $outFull) { return $false }
    if (-not (Test-InIncludePath $rel)) { return $false }

    switch ($Preset) {
        "Overview" {
            if (Test-PathExcluded $rel $null) { return $false }
            return Test-OverviewFile $rel
        }
        "Source" {
            if (Test-PathExcluded $rel $SourceExclude) { return $false }
            $ext = $File.Extension.ToLower()
            if ($Include -notcontains $ext) { return $false }
            foreach ($pat in $SourceNamePatterns) {
                if ($File.Name -match $pat) { return $false }
            }
            return $true
        }
        "Full" {
            if (Test-PathExcluded $rel $null) { return $false }
            $ext = $File.Extension.ToLower()
            if ($Include -notcontains $ext) { return $false }
            foreach ($pat in $ExcludeNamePatterns) {
                if ($File.Name -match $pat) { return $false }
            }
            return $true
        }
    }
    return $false
}

function Test-DirExcluded {
    param([string]$RelPath)
    if ($RelPath -eq "") { return $false }
    $extra = if ($Preset -eq "Source") { $SourceExclude } else { $null }
    return (Test-PathExcluded $RelPath $extra)
}

# ===============================================================
#  Collect files
# ===============================================================

Write-Host "Preset:          $Preset" -ForegroundColor Cyan
if ($IncludePath.Count -gt 0) {
    Write-Host "IncludePath:     $($IncludePath -join ', ')" -ForegroundColor DarkGray
}
Write-Host "MaxFileSize:     $([math]::Round($MaxFileSize / 1KB, 0)) KB" -ForegroundColor DarkGray
Write-Host "LargeFilePolicy: $LargeFilePolicy" -ForegroundColor DarkGray
Write-Host "Scanning files..." -ForegroundColor Cyan

$candidates = Get-ChildItem -LiteralPath $root -Recurse -File -Force |
              Where-Object { Test-FileAllowed $_ } |
              Sort-Object FullName

$files      = @()
$largeFiles = @()
foreach ($f in $candidates) {
    if ($f.Length -gt $MaxFileSize) { $largeFiles += $f }
    else                            { $files      += $f }
}

Write-Host "Small files:     $($files.Count)" -ForegroundColor Cyan
Write-Host "Large files:     $($largeFiles.Count) (policy: $LargeFilePolicy)" -ForegroundColor $(if ($largeFiles.Count) { 'Yellow' } else { 'Cyan' })

$treeFiles = if ($LargeFilePolicy -eq "Skip") { $files } else { $files + $largeFiles }

$includedDirs = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
foreach ($f in $treeFiles) {
    $dir = $f.DirectoryName
    while ($dir -and $dir.Length -ge $root.Length) {
        [void]$includedDirs.Add($dir)
        if ($dir -eq $root) { break }
        $dir = Split-Path $dir -Parent
    }
}

# ===============================================================
#  Tree
# ===============================================================

function Get-Tree {
    param([string]$Dir, [string]$Prefix = "")

    $items = Get-ChildItem -LiteralPath $Dir -Force |
             Where-Object { $_.Name -ne "." -and $_.Name -ne ".." } |
             Sort-Object { -not $_.PSIsContainer }, Name |
             Where-Object {
                 $rel = $_.FullName.Substring($root.Length).TrimStart('\')
                 if (Test-DirExcluded $rel) { return $false }
                 return $includedDirs.Contains($_.FullName)
             }

    for ($i = 0; $i -lt $items.Count; $i++) {
        $item   = $items[$i]
        $last   = ($i -eq $items.Count - 1)
        $branch = if ($last) { "+-- " } else { "|-- " }

        "$Prefix$branch$($item.Name)"

        if ($item.PSIsContainer) {
            $np = $Prefix + $(if ($last) { "    " } else { "|   " })
            Get-Tree -Dir $item.FullName -Prefix $np
        }
    }
}

# ===============================================================
#  Build dump
# ===============================================================

$sb = [System.Text.StringBuilder]::new()

[void]$sb.AppendLine("=" * 80)
[void]$sb.AppendLine("FOLDER:            $root")
[void]$sb.AppendLine("DATE:              $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine("PRESET:            $Preset")
if ($IncludePath.Count -gt 0) {
    [void]$sb.AppendLine("ONLY:              $($IncludePath -join ', ')")
}
[void]$sb.AppendLine("MAX FILE SIZE:     $([math]::Round($MaxFileSize / 1KB, 0)) KB")
[void]$sb.AppendLine("LARGE FILE POLICY: $LargeFilePolicy")
[void]$sb.AppendLine("SMALL FILES:       $($files.Count)")
[void]$sb.AppendLine("LARGE FILES:       $($largeFiles.Count)")
[void]$sb.AppendLine("=" * 80)
[void]$sb.AppendLine()
[void]$sb.AppendLine((Split-Path $root -Leaf))
[void]$sb.AppendLine((Get-Tree -Dir $root))
[void]$sb.AppendLine()

[void]$sb.AppendLine("=" * 80)
[void]$sb.AppendLine("FILE CONTENTS")
[void]$sb.AppendLine("=" * 80)
[void]$sb.AppendLine()

$i = 0
foreach ($f in $files) {
    $i++
    $rel = $f.FullName.Substring($root.Length).TrimStart('\')
    Write-Host "[$i/$($files.Count)] $rel" -ForegroundColor DarkGray

    [void]$sb.AppendLine("-" * 80)
    [void]$sb.AppendLine("FILE: $rel")
    [void]$sb.AppendLine("SIZE: $($f.Length) bytes")
    [void]$sb.AppendLine("-" * 80)

    try {
        $content = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction Stop
        [void]$sb.AppendLine($content)
        if ($content -and -not $content.EndsWith("`n")) { [void]$sb.AppendLine() }
    } catch {
        [void]$sb.AppendLine("[READ ERROR: $($_.Exception.Message)]")
    }
    [void]$sb.AppendLine()
}

# ============================================================
#  Large files
# ============================================================

if ($LargeFilePolicy -ne "Skip" -and $largeFiles.Count -gt 0) {
    [void]$sb.AppendLine("=" * 80)
    [void]$sb.AppendLine("LARGE FILES (greater than $([math]::Round($MaxFileSize / 1KB, 0)) KB) - policy: $LargeFilePolicy")
    [void]$sb.AppendLine("=" * 80)
    [void]$sb.AppendLine()

    foreach ($f in $largeFiles) {
        $rel = $f.FullName.Substring($root.Length).TrimStart('\')

        [void]$sb.AppendLine("-" * 80)
        [void]$sb.AppendLine("FILE: $rel")
        [void]$sb.AppendLine("SIZE: $($f.Length) bytes")
        [void]$sb.AppendLine("-" * 80)

        if ($LargeFilePolicy -eq "Header") {
            [void]$sb.AppendLine("[SKIPPED: $([math]::Round($f.Length / 1KB, 1)) KB greater than $([math]::Round($MaxFileSize / 1KB, 0)) KB]")
        }
        elseif ($LargeFilePolicy -eq "Truncate") {
            try {
                $content = Get-Content -LiteralPath $f.FullName -TotalCount $TruncateLines -ErrorAction Stop
                $content | ForEach-Object { [void]$sb.AppendLine($_) }
                [void]$sb.AppendLine()
                [void]$sb.AppendLine("[TRUNCATED: showing $TruncateLines lines of file $([math]::Round($f.Length / 1KB, 1)) KB]")
            } catch {
                [void]$sb.AppendLine("[READ ERROR: $($_.Exception.Message)]")
            }
        }
        [void]$sb.AppendLine()
    }
}

# ============================================================
#  Summary
# ============================================================

[void]$sb.AppendLine("=" * 80)
[void]$sb.AppendLine("SUMMARY")
[void]$sb.AppendLine("=" * 80)
[void]$sb.AppendLine()
[void]$sb.AppendLine("Small files included: $($files.Count)")
[void]$sb.AppendLine("Large files:          $($largeFiles.Count) (policy: $LargeFilePolicy)")
[void]$sb.AppendLine()

if ($TopLargest -gt 0 -and $files.Count -gt 0) {
    [void]$sb.AppendLine("Top-$TopLargest largest included files:")
    $files |
        Sort-Object Length -Descending |
        Select-Object -First $TopLargest |
        ForEach-Object {
            $rel = $_.FullName.Substring($root.Length).TrimStart('\')
            [void]$sb.AppendLine(("  {0,8:N1} KB  {1}" -f ($_.Length / 1KB), $rel))
        }
    [void]$sb.AppendLine()
}

if ($largeFiles.Count -gt 0) {
    [void]$sb.AppendLine("All skipped-as-large files:")
    $largeFiles |
        Sort-Object Length -Descending |
        ForEach-Object {
            $rel = $_.FullName.Substring($root.Length).TrimStart('\')
            [void]$sb.AppendLine(("  {0,8:N1} KB  {1}" -f ($_.Length / 1KB), $rel))
        }
}

[System.IO.File]::WriteAllText($outFull, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host "New file: $outFull" -ForegroundColor Green
Write-Host "Size: $([math]::Round((Get-Item $outFull).Length / 1KB, 1)) KB" -ForegroundColor Green