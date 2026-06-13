param(
  [string]$Message = "Update site content"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Output "Building site..."
npm run build

$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Output "No changes to publish."
  exit 0
}

Write-Output "Changed files:"
git status --short

git add .
git commit -m $Message
git push

Write-Output "Published to GitHub. GitHub Pages will update after the workflow finishes."
