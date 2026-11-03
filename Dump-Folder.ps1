<#
.SYNOPSIS
    Дамп содержимого папки в один текстовый файл (с деревом и содержимым).

.DESCRIPTION
    Два режима:
      -Mode Include  (по умолчанию) — берём ТОЛЬКО файлы с перечисленными
                     расширениями (реальный код).
      -Mode Exclude  — старая логика: берём всё, кроме Exclude.

    ТЕСТЫ по умолчанию исключаются (папки test/tests/__tests__/spec/e2e/
    cypress/playwright/... и файлы *Test.java, *.test.ts, *_test.go,
    test_*.py, *_spec.rb и т.п.). Чтобы включить — запустите с -IncludeTests.

.PARAMETER IncludePath
    Если непусто — оставляем только файлы, чей путь (относительно $Path)
    содержит одну из этих подстрок.

.PARAMETER IncludeTests
    Если указан — тесты НЕ исключаются (по умолчанию исключаются).

.EXAMPLE
    .\dump.ps1 -Path C:\src\drawio -Output drawio-src.txt

.EXAMPLE
    .\dump.ps1 -Path C:\src\drawio -Output drawio-with-tests.txt -IncludeTests
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,

    [string]$Output = "dump.txt",

    [ValidateSet("Include", "Exclude")]
    [string]$Mode = "Include",

    # Если указан — тесты НЕ исключаются. По умолчанию исключаются.
    [switch]$IncludeTests,

    # Папки/файлы, которые пропускаем в любом режиме.
    [string[]]$Exclude = @(
        "\.git\",
        "\node_modules\",
        "\bower_components\",
        "\bin\",
        "\obj\",
        "\dist\",
        "\build\",
        "\target\",
        "\out\",
        "\gradle\",
        "\.gradle\",
        "\.idea\",
        "\.vscode\",
        "\fonts\",
        "\resources\images\",
        "\images\",
        "\img\",
        "\.png\", "\.jpg\", "\.jpeg\", "\.gif\", "\.ico\",
        "\.webp\", "\.bmp\", "\.tiff\", "\.psd\",
        "\.woff\", "\.woff2\", "\.ttf\", "\.eot\", "\.otf\",
        "\.txt\"
    ),

    # Разрешённые расширения при $Mode = "Include".
    [string[]]$Include = @(
        ".java", ".kt", ".groovy", ".scala",
        ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".vue", ".svelte",
        ".c", ".cpp", ".cc", ".h", ".hpp",
        ".py", ".rb", ".go", ".rs", ".php",
        ".html", ".htm", ".xhtml",
        ".jsp", ".jspf", ".tag", ".ftl",
        ".css", ".scss", ".sass", ".less",
        ".xml", ".xsd", ".dtd", ".xsl", ".xslt",
        ".gradle", ".kts",
        ".properties",
        ".yml", ".yaml",
        ".toml", ".ini", ".cfg", ".conf",
        ".json",
        ".md", ".sql",
        ".sh", ".bash", ".zsh",
        ".bat", ".cmd", ".ps1"
    ),

    [string[]]$Extensions = @(),

    # Regex по ИМЕНИ файла. Совпало — выкидываем.
    [string[]]$ExcludeNamePatterns = @(
        "\.min\.js$",
        "\.min\.mjs$",
        "\.min\.css$",
        "\.bundle\.js$",
        "\.bundle\.css$",
        "-min\.js$",
        "\.js\.map$",
        "\.css\.map$",
        "\.mjs\.map$",
        "\.map\.json$",
        "\.d\.ts$",
        "\.d\.mts$",
        "package-lock\.json$",
        "yarn\.lock$",
        "pnpm-lock\.yaml$",
        "npm-shrinkwrap\.json$",
        "composer\.lock$",
        "Gemfile\.lock$",
        "\.lock$",
        "\.drawio\.xml$",
        "\.drawio$",
        "^[A-Za-z]{2}(-[A-Za-z]{2,4})?\.json$"
    ),

    [string[]]$IncludePath = @(),

    [long]$MaxFileSize = 1MB
)

# ===============================================================
#  ТЕСТЫ: паттерны, добавляемые при отсутствии -IncludeTests
# ===============================================================
if (-not $IncludeTests) {

    $Exclude += @(
        # --- директории с тестами ---
        "\test\", "\tests\", "\__tests__\",
        "\spec\", "\specs\", "\__specs__\",
        "\testdata\", "\test-data\", "\test_data\", "\testing\",
        "\src\test\", "\src\tests\", "\src\it\", "\src\testFixtures\",
        "\src\androidTest\", "\src\integrationTest\", "\src\functionalTest\",
        "\e2e\", "\cypress\", "\playwright\",
        "\__mocks__\", "\__snapshots__\",
        "\fixtures\"
    )

    $ExcludeNamePatterns += @(
        # --- Java / Kotlin / Groovy / Scala / PHP: тестовые классы ---
        "Tests?\.(java|kt|groovy|scala|php)$",
        "Spec\.(scala|groovy)$",

        # --- JS / TS: *.test.* и *.spec.* ---
        "\.(test|spec)\.(js|mjs|cjs|ts|tsx|jsx|vue|svelte)$",

        # --- Python: pytest/nose ---
        "^test_.*\.py$",
        "^.*_test\.py$",
        "^conftest\.py$",

        # --- Ruby: RSpec / Minitest ---
        "_spec\.rb$",
        "_test\.rb$",

        # --- Go: *_test.go ---
        "_test\.go$",

        # --- C / C++: gtest / catch2 ---
        "_test\.(c|cc|cpp)$",
        "_unittest\.(c|cc|cpp)$",
        "^test_.*\.(c|cc|cpp)$",

        # --- bash test framework ---
        "\.bats$"
    )
}

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) { Write-Error "Folder not found: $Path"; exit 1 }

$root    = (Resolve-Path $Path).Path
$outFull = [System.IO.Path]::GetFullPath($Output)

if (Test-Path $outFull) { Remove-Item -LiteralPath $outFull -Force }

# ===============================================================
#  Фильтры
# ===============================================================

function Test-PathExcluded {
    param([string]$RelPath)
    $wrapped = "\" + $RelPath + "\"
    foreach ($ex in $Exclude) {
        if ($wrapped -like "*$ex*") { return $true }
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

function Test-FileAllowed {
    param([System.IO.FileInfo]$File)
    $rel = $File.FullName.Substring($root.Length).TrimStart('\')
    if (Test-PathExcluded  $rel) { return $false }
    if (-not (Test-InIncludePath $rel)) { return $false }
    if ($File.FullName -eq $outFull) { return $false }

    $ext = $File.Extension.ToLower()
    if ($Mode -eq "Include") {
        if ($Include -notcontains $ext) { return $false }
    } else {
        if ($Extensions.Count -gt 0 -and ($Extensions -notcontains $ext)) {
            return $false
        }
    }

    foreach ($pat in $ExcludeNamePatterns) {
        if ($File.Name -match $pat) { return $false }
    }

    if ($File.Length -gt $MaxFileSize) { return $false }
    return $true
}

function Test-DirAllowed {
    param([System.IO.DirectoryInfo]$Dir)
    $rel = $Dir.FullName.Substring($root.Length).TrimStart('\')
    if (Test-PathExcluded $rel) { return $false }
    if (-not (Test-InIncludePath $rel)) { return $false }
    return $true
}

# ===============================================================
#  Дерево
# ===============================================================

function Get-Tree {
    param([string]$Dir, [string]$Prefix = "")
    $items = Get-ChildItem -LiteralPath $Dir -Force |
             Where-Object { $_.Name -ne "." -and $_.Name -ne ".." } |
             Sort-Object { -not $_.PSIsContainer }, Name |
             Where-Object {
                 if ($_.PSIsContainer) { Test-DirAllowed  $_ }
                 else                  { Test-FileAllowed $_ }
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
#  Сбор файлов
# ===============================================================

Write-Host "Mode:        $Mode" -ForegroundColor Cyan
Write-Host "Tests:       $(if ($IncludeTests) { 'INCLUDED' } else { 'EXCLUDED' })" -ForegroundColor Cyan
Write-Host "Exclude:     $($Exclude.Count) patterns" -ForegroundColor DarkGray
if ($Mode -eq "Include") {
    Write-Host "Include ext: $($Include -join ', ')" -ForegroundColor DarkGray
}
if ($IncludePath.Count -gt 0) {
    Write-Host "IncludePath: $($IncludePath -join ', ')" -ForegroundColor DarkGray
}
Write-Host "Building tree..." -ForegroundColor Cyan

$files = Get-ChildItem -LiteralPath $root -Recurse -File -Force |
         Where-Object { Test-FileAllowed $_ } |
         Sort-Object FullName

Write-Host "Files found: $($files.Count)" -ForegroundColor Cyan

# ===============================================================
#  Сборка дампа
# ===============================================================

$sb = [System.Text.StringBuilder]::new()

[void]$sb.AppendLine("=" * 80)
[void]$sb.AppendLine("FOLDER: $root")
[void]$sb.AppendLine("DATE:   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine("MODE:   $Mode")
[void]$sb.AppendLine("TESTS:  $(if ($IncludeTests) { 'included' } else { 'excluded' })")
if ($IncludePath.Count -gt 0) {
    [void]$sb.AppendLine("ONLY:   $($IncludePath -join ', ')")
}
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

[System.IO.File]::WriteAllText($outFull, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host "New file: $outFull" -ForegroundColor Green
Write-Host "Size: $([math]::Round((Get-Item $outFull).Length / 1KB, 1)) KB" -ForegroundColor Green