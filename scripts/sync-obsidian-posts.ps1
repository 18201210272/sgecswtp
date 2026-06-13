param(
  [ValidateSet("obsidian-to-site", "site-to-obsidian")]
  [string]$Direction = "obsidian-to-site",
  [string]$ObsidianPosts = "D:\Nutstore\Obsidian Vault\posts",
  [switch]$Publish,
  [switch]$Prune,
  [switch]$DryRun,
  [string]$Message = "Sync Obsidian posts"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sitePosts = Join-Path $repoRoot "content\posts"

if (-not (Test-Path -LiteralPath $sitePosts -PathType Container)) {
  throw "Site markdown posts folder not found: $sitePosts"
}

if (-not (Test-Path -LiteralPath $ObsidianPosts -PathType Container)) {
  if ($Direction -eq "site-to-obsidian") {
    New-Item -ItemType Directory -Path $ObsidianPosts -Force | Out-Null
  } else {
    throw "Obsidian posts folder not found: $ObsidianPosts"
  }
}

$sitePostsPath = (Resolve-Path -LiteralPath $sitePosts).Path
$obsidianPostsPath = (Resolve-Path -LiteralPath $ObsidianPosts).Path

if ($Direction -eq "obsidian-to-site") {
  $source = $obsidianPostsPath
  $destination = $sitePostsPath
} else {
  $source = $sitePostsPath
  $destination = $obsidianPostsPath
}

function Test-SameFile {
  param(
    [string]$Left,
    [string]$Right
  )

  if (-not (Test-Path -LiteralPath $Right -PathType Leaf)) {
    return $false
  }

  $leftItem = Get-Item -LiteralPath $Left
  $rightItem = Get-Item -LiteralPath $Right

  if ($leftItem.Length -ne $rightItem.Length) {
    return $false
  }

  $leftHash = (Get-FileHash -LiteralPath $Left -Algorithm SHA256).Hash
  $rightHash = (Get-FileHash -LiteralPath $Right -Algorithm SHA256).Hash
  return $leftHash -eq $rightHash
}

Write-Output "Sync direction: $Direction"
Write-Output "Source: $source"
Write-Output "Destination: $destination"
Write-Output "Mode: copy changed *.md files; skip untitled drafts."
if ($Prune -and $Direction -eq "obsidian-to-site") {
  Write-Output "Prune: enabled for destination-only *.md files."
}

$files = Get-ChildItem -LiteralPath $source -Filter "*.md" -File | Sort-Object Name
$sourceNames = @{}
$copied = 0

foreach ($file in $files) {
  if ($file.Name -like "未命名*.md" -or $file.Name -like "Untitled*.md") {
    Write-Output "Skipped draft: $($file.Name)"
    continue
  }

  $sourceNames[$file.Name] = $true
  $target = Join-Path $destination $file.Name

  if (Test-SameFile -Left $file.FullName -Right $target) {
    Write-Output "Unchanged: $($file.Name)"
    continue
  }

  if ($DryRun) {
    Write-Output "Would copy: $($file.Name)"
  } else {
    Copy-Item -LiteralPath $file.FullName -Destination $target -Force
    Write-Output "Copied: $($file.Name)"
  }

  $copied += 1
}

if ($files.Count -eq 0) {
  Write-Output "No markdown files found in source."
}

Write-Output "Changed files copied: $copied"

if ($Prune -and $Direction -eq "obsidian-to-site") {
  $removed = 0
  $destinationFiles = Get-ChildItem -LiteralPath $destination -Filter "*.md" -File | Sort-Object Name
  foreach ($file in $destinationFiles) {
    if ($sourceNames.ContainsKey($file.Name)) {
      continue
    }

    if ($DryRun) {
      Write-Output "Would remove destination-only file: $($file.Name)"
    } else {
      Remove-Item -LiteralPath $file.FullName -Force
      Write-Output "Removed destination-only file: $($file.Name)"
    }

    $removed += 1
  }
  Write-Output "Destination-only files removed: $removed"
}

if ($DryRun) {
  Write-Output "Dry run complete. Build and publish skipped."
  exit 0
}

if ($Direction -eq "obsidian-to-site") {
  Set-Location $repoRoot

  if ($Publish) {
    npm run publish -- -Message $Message
  } else {
    npm run build
  }
}
