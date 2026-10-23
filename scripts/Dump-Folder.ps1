<#
.SYNOPSIS
    Дамп содержимого папки в один текстовый файл (с деревом и содержимым).

.DESCRIPTION
    Два режима:
      -Mode Include  (по умолчанию) — берём ТОЛЬКО файлы с перечисленными
                     расширениями (реальный код). Нужно для репозиториев
                     вроде jgraph/drawio, где тонет в bundled-libs и media.
      -Mode Exclude  — старая логика: берём всё, кроме Exclude.

.PARAMETER IncludePath
    Если непусто — оставляем только файлы, чей путь (относительно $Path)
    содержит одну из этих подстрок. Пример для drawio:
        -IncludePath 'src\main\java\', 'js\diagramly\'
    Работает и в Include, и в Exclude режиме.

.EXAMPLE
    .\dump.ps1 -Path C:\src\drawio -Output drawio-src.txt

.EXAMPLE
    .\dump.ps1 -Path C:\src\drawio -Output drawio-diagramly.txt `
               -IncludePath 'js\diagramly\'
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,

    [string]$Output = "dump.txt",

    # "Include" = whitelist по расширениям (рекомендуется для drawio),
    # "Exclude" = старая логика (всё кроме $Exclude).
    [ValidateSet("Include", "Exclude")]
    [string]$Mode = "Include",

    # Папки/файлы, которые пропускаем в любом режиме.
    # Паттерн матчится через -like против "\<rel>\", т.е. как подстрока.
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
        "\.woff\", "\.woff2\", "\.ttf\", "\.eot\", "\.otf\"
    ),

    # Разрешённые расширения при $Mode = "Include".
    # Только эти файлы попадут в дамп (плюс фильтры ниже).
    [string[]]$Include = @(
        # исходный код
        ".java", ".kt", ".groovy", ".scala",
        ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".vue", ".svelte",
        ".c", ".cpp", ".cc", ".h", ".hpp",
        ".py", ".rb", ".go", ".rs", ".php",
        # разметка и стили
        ".html", ".htm", ".xhtml",
        ".jsp", ".jspf", ".tag", ".ftl",
        ".css", ".scss", ".sass", ".less",
        ".xml", ".xsd", ".dtd", ".xsl", ".xslt",
        # сборка и конфиги
        ".gradle", ".kts",
        ".properties",
        ".yml", ".yaml",
        ".toml", ".ini", ".cfg", ".conf",
        ".json",
        # документация и скрипты (без .txt)
        ".md", ".sql",
        ".sh", ".bash", ".zsh",
        ".bat", ".cmd", ".ps1"
    ),

    # Старое поведение: при $Mode = "Exclude" и непустом списке —
    # фильтруем файлы по этим расширениям.
    [string[]]$Extensions = @(),

    # Regex по ИМЕНИ файла. Совпало — выкидываем, даже если расширение в $Include.
    [string[]]$ExcludeNamePatterns = @(
        # минифицированные / собранные бандлы
        "\.min\.js$",
        "\.min\.mjs$",
        "\.min\.css$",
        "\.bundle\.js$",
        "\.bundle\.css$",
        "-min\.js$",
        # source maps
        "\.js\.map$",
        "\.css\.map$",
        "\.mjs\.map$",
        "\.map\.json$",
        # TypeScript-декларации (генерируются)
        "\.d\.ts$",
        "\.d\.mts$",
        # lock-файлы пакетных менеджеров
        "package-lock\.json$",
        "yarn\.lock$",
        "pnpm-lock\.yaml$",
        "npm-shrinkwrap\.json$",
        "composer\.lock$",
        "Gemfile\.lock$",
        "\.lock$",
        # drawio-specific: диаграммы — это данные, не код
        "\.drawio\.xml$",
        "\.drawio$",
        # drawio-specific: локализации — десятки мегабайт словарей,
        # не код. Лежат в js/diagramly/*.json, но фильтруем по имени.
        "^[A-Za-z]{2}(-[A-Za-z]{2,4})?\.json$"
    ),

    # Если непусто — оставляем только файлы, чей rel-путь содержит
    # одну из этих подстрок. Например: 'js\diagramly\', 'src\main\java\'.
    [string[]]$IncludePath = @(),

    [long]$MaxFileSize = 1MB
)

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

    # Оборачиваем в бэкслеши, чтобы паттерны вида "\.git\" матчились
    # и в начале, и в середине пути.
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