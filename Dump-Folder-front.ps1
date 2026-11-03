<#
.SYNOPSIS
    Дамп ТОЛЬКО исходного кода и конфигов React-проекта в один файл.

.DESCRIPTION
    Включает:
      • исходники:      .js .jsx .ts .tsx .mjs .cjs
      • стили:          .css .scss .sass .less
      • html-энтри:     .html .htm (public/index.html)
      • конфиги React:  package.json, tsconfig*.json, jsconfig.json,
                        vite/next/webpack/rollup/metro/craco/babel,
                        eslint/prettier, jest/vitest, tailwind/postcss,
                        .babelrc, .eslintrc*, .prettierrc*

    НЕ включает: тесты (по умолчанию), bundled/minified, source maps,
    lock-файлы, локализации, drawio, изображения/шрифты, документацию,
    json-данные вне конфигов — «более ничего».

.PARAMETER IncludeTests
    Включить тесты обратно (по умолчанию исключены).

.PARAMETER IncludePath
    Оставить только файлы, чей путь (отн. $Path) содержит одну из подстрок.
    Пример: -IncludePath 'src\', 'public\'

.EXAMPLE
    .\dump.ps1 -Path .\my-react-app -Output react-src.txt

.EXAMPLE
    .\dump.ps1 -Path .\my-react-app -Output react-src.txt -IncludePath 'src\'
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,

    [string]$Output = "dump.txt",

    [switch]$IncludeTests,

    [string[]]$IncludePath = @(),

    [long]$MaxFileSize = 1MB
)

$ErrorActionPreference = "Stop"

# ===============================================================
#  ЧТО БЕРЁМ: исходный код React-приложения
# ===============================================================
$IncludeExt = @(
    # JS / TS / React
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    # Стили (часть исходников)
    ".css", ".scss", ".sass", ".less",
    # HTML-энтри (public/index.html)
    ".html", ".htm"
)

# Конфиги React-стека — разрешены по ИМЕНИ файла (независимо от расширения)
$ConfigNamePatterns = @(
    '^package\.json$',
    '^tsconfig(\.[\w.-]+)?\.json$',          # tsconfig.json, tsconfig.app.json, ...
    '^jsconfig\.json$',
    '^vite\.config\.(js|ts|mjs|cjs|mts|cts)$',
    '^vitest\.config\.(js|ts|mjs|cjs)$',
    '^next\.config\.(js|ts|mjs|cjs)$',
    '^webpack\.config\.(js|ts|mjs|cjs)$',
    '^rollup\.config\.(js|ts|mjs|cjs)$',
    '^metro\.config\.(js|ts)$',
    '^craco\.config\.(js|ts)$',
    '^babel\.config\.(js|ts|cjs|mjs|json)$',
    '^\.babelrc(\.json|\.js|\.cjs|\.mjs)?$',
    '^eslint\.config\.(js|ts|mjs|cjs)$',
    '^\.eslintrc(\.json|\.js|\.cjs|\.yml|\.yaml)?$',
    '^prettier\.config\.(js|ts|mjs|cjs|json)$',
    '^\.prettierrc(\.json|\.js|\.cjs|\.yaml|\.yml)?$',
    '^jest\.config\.(js|ts|mjs|cjs|json)$',
    '^tailwind\.config\.(js|ts|cjs|mjs)$',
    '^postcss\.config\.(js|ts|cjs|mjs)$'
)

# ===============================================================
#  ЧТО НЕ БЕРЁМ: тесты (отключается -IncludeTests)
# ===============================================================
$TestDirPatterns = @(
    "\test\", "\tests\", "\__tests__\",
    "\spec\", "\specs\", "\__specs__\",
    "\testdata\", "\test-data\", "\test_data\",
    "\e2e\", "\cypress\", "\playwright\",
    "\__mocks__\", "\__snapshots__\",
    "\fixtures\"
)

$TestFilePatterns = @(
    "Tests?\.(java|kt|groovy|scala|php)$",
    "Spec\.(scala|groovy)$",
    "\.(test|spec)\.(js|mjs|cjs|ts|tsx|jsx|vue|svelte)$",
    "^test_.*\.py$", "^.*_test\.py$", "^conftest\.py$",
    "_spec\.rb$", "_test\.rb$",
    "_test\.go$",
    "_test\.(c|cc|cpp)$", "_unittest\.(c|cc|cpp)$", "^test_.*\.(c|cc|cpp)$",
    "\.bats$",
    "^setupTests\.(js|ts|jsx|tsx)$"
)

# ===============================================================
#  ВСЕГДА ИСКЛЮЧАЕМ: артефакты сборки, зависимости, медиа
# ===============================================================
$ExcludePathPatterns = @(
    "\.git\", "\node_modules\", "\bower_components\",
    "\bin\", "\obj\", "\dist\", "\build\", "\target\",
    "\out\", "\coverage", "\gradle\", "\.gradle\",
    "\.idea\", "\.vscode\",
    "\fonts\", "\resources\images\", "\images\", "\img\",
    "\public\static\"     # собранные ассеты CRA
)

$ExcludeNamePatterns = @(
    # минифицированные / собранные бандлы
    "\.min\.(js|mjs|css)$",
    "\.bundle\.(js|css)$",
    "-min\.js$",
    # source maps
    "\.(js|css|mjs)\.map$",
    "\.map\.json$",
    # lock-файлы (package.json сюда НЕ попадает)
    "^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|npm-shrinkwrap\.json|composer\.lock|Gemfile\.lock)$",
    # drawio-диаграммы
    "\.drawio(\.xml)?$",
    # локализации: xx.json / xx-YY.json — словари, не код
    "^[A-Za-z]{2}(-[A-Za-z]{2,4})?\.json$"
)

if (-not $IncludeTests) {
    $ExcludePathPatterns += $TestDirPatterns
    $ExcludeNamePatterns += $TestFilePatterns
}

# ===============================================================
#  Инициализация путей
# ===============================================================
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
    foreach ($p in $ExcludePathPatterns) {
        if ($wrapped -like "*$p*") { return $true }
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

function Test-IsConfigFile {
    param([string]$Name)
    foreach ($pat in $ConfigNamePatterns) {
        if ($Name -match $pat) { return $true }
    }
    return $false
}

function Test-FileAllowed {
    param([System.IO.FileInfo]$File)

    $rel = $File.FullName.Substring($root.Length).TrimStart('\')

    if (Test-PathExcluded $rel)          { return $false }
    if (-not (Test-InIncludePath $rel))  { return $false }
    if ($File.FullName -eq $outFull)     { return $false }
    if ($File.Length -gt $MaxFileSize)   { return $false }

    # имя всегда проверяем на исключения
    foreach ($pat in $ExcludeNamePatterns) {
        if ($File.Name -match $pat) { return $false }
    }

    # конфиг — да
    if (Test-IsConfigFile $File.Name) { return $true }

    # исходник — только если расширение в whitelist
    $ext = $File.Extension.ToLower()
    if ($IncludeExt -notcontains $ext) { return $false }

    return $true
}

function Test-DirAllowed {
    param([System.IO.DirectoryInfo]$Dir)
    $rel = $Dir.FullName.Substring($root.Length).TrimStart('\')
    if (Test-PathExcluded $rel)         { return $false }
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
Write-Host "Root:        $root" -ForegroundColor Cyan
Write-Host "Tests:       $(if ($IncludeTests) { 'INCLUDED' } else { 'EXCLUDED' })" -ForegroundColor Cyan
Write-Host "Include ext: $($IncludeExt -join ', ')" -ForegroundColor DarkGray
Write-Host "React cfg:   $($ConfigNamePatterns.Count) patterns" -ForegroundColor DarkGray
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
[void]$sb.AppendLine("KIND:   React source code + React config files")
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