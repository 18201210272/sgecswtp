param(
  [Parameter(Mandatory = $true)]
  [string]$Title,

  [string]$Category = "工作",
  [string]$Summary = "",
  [string]$Keywords = "",
  [string]$Date = (Get-Date -Format "yyyy-MM-dd"),
  [switch]$Open
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$postsDir = Join-Path $repoRoot "content\posts"
New-Item -ItemType Directory -Force -Path $postsDir | Out-Null

$slug = $Title.ToLowerInvariant()
$slug = [regex]::Replace($slug, "[^\p{L}\p{Nd}]+", "-").Trim("-")
if ([string]::IsNullOrWhiteSpace($slug)) {
  $slug = "post"
}

$fileName = "$Date-$slug.md"
$target = Join-Path $postsDir $fileName
if (Test-Path $target) {
  throw "Post already exists: $target"
}

$content = @"
---
title: $Title
date: $Date
category: $Category
summary: $Summary
keywords: $Keywords
---

在这里写正文。
"@

Set-Content -LiteralPath $target -Value $content -Encoding UTF8
Write-Output "Created: $target"

if ($Open) {
  Invoke-Item $target
}
