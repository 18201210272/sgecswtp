param(
  [string]$Message = "Update site content"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Test-SiteLinks {
  $indexPath = Join-Path $repoRoot "_site\index.html"
  if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw "Build did not produce _site\index.html"
  }

  $siteRoot = Split-Path $indexPath
  $content = Get-Content -LiteralPath $indexPath -Raw
  $matches = [regex]::Matches($content, 'href="(posts/[^"]+)"')
  $missing = @()
  $nonAscii = @()

  foreach ($match in $matches) {
    $link = $match.Groups[1].Value
    if ($link -match '[^\x00-\x7F]') {
      $nonAscii += $link
    }
    if (-not (Test-Path -LiteralPath (Join-Path $siteRoot $link) -PathType Leaf)) {
      $missing += $link
    }
  }

  if ($nonAscii.Count -gt 0) {
    throw "Post links must be ASCII-only: $($nonAscii -join ', ')"
  }

  if ($missing.Count -gt 0) {
    throw "Index contains missing post links: $($missing -join ', ')"
  }

  Write-Output "Verified $($matches.Count) post links."
}

Write-Output "Building site..."
npm run build
Test-SiteLinks

$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Output "No changes to publish."
  exit 0
}

Write-Output "Changed files:"
git status --short

$env:GIT_TERMINAL_PROMPT = "0"
$env:GIT_EDITOR = "true"

git add .
git commit -m $Message
git push

Write-Output "Published to GitHub. GitHub Pages will update after the workflow finishes."
