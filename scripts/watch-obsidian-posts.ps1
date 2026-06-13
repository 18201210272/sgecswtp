param(
  [string]$ObsidianPosts = "D:\Nutstore\Obsidian Vault\posts",
  [int]$DebounceSeconds = 60,
  [int]$PollSeconds = 10,
  [string]$Message = "Auto publish Obsidian posts"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$syncScript = Join-Path $PSScriptRoot "sync-obsidian-posts.ps1"
$logDir = Join-Path $env:LOCALAPPDATA "sgecswtp-site"
$logFile = Join-Path $logDir "obsidian-autopublish.log"

if ($PollSeconds -lt 3) {
  $PollSeconds = 3
}

if ($DebounceSeconds -lt $PollSeconds) {
  $DebounceSeconds = $PollSeconds
}

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Write-Log {
  param([string]$Text)

  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Text
  Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
  Write-Output $line
}

function Get-PostsSnapshot {
  if (-not (Test-Path -LiteralPath $ObsidianPosts -PathType Container)) {
    throw "Obsidian posts folder not found: $ObsidianPosts"
  }

  $items = Get-ChildItem -LiteralPath $ObsidianPosts -Filter "*.md" -File |
    Sort-Object FullName |
    ForEach-Object {
      "{0}|{1}|{2}" -f $_.Name, $_.Length, $_.LastWriteTimeUtc.Ticks
    }

  return ($items -join "`n")
}

function Invoke-AutoPublish {
  Write-Log "Quiet period reached. Starting publish."
  Set-Location $repoRoot
  $runLog = Join-Path $logDir ("publish-run-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

  $args = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $syncScript,
    "-Direction",
    "obsidian-to-site",
    "-Prune",
    "-Publish",
    "-Message",
    $Message
  )

  $process = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList $args `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $runLog `
    -RedirectStandardError $runLog `
    -WindowStyle Hidden `
    -PassThru

  $timeout = [TimeSpan]::FromMinutes(10)
  $started = Get-Date
  $lastSize = 0

  while (-not $process.HasExited) {
    Start-Sleep -Seconds 5

    if (Test-Path -LiteralPath $runLog -PathType Leaf) {
      $item = Get-Item -LiteralPath $runLog
      if ($item.Length -ne $lastSize) {
        $lastSize = $item.Length
        Write-Log "Publish is still running. Log: $runLog"
      }
    }

    if (((Get-Date) - $started) -gt $timeout) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      Write-Log "Publish timed out after $($timeout.TotalMinutes) minutes. Stopped process $($process.Id)."
      return $false
    }
  }

  if (Test-Path -LiteralPath $runLog -PathType Leaf) {
    foreach ($line in (Get-Content -LiteralPath $runLog -Tail 80)) {
      Write-Log $line.ToString()
    }
  }

  if ($process.ExitCode -ne 0) {
    Write-Log "Publish failed with exit code $($process.ExitCode). Full log: $runLog"
    return $false
  }

  Write-Log "Publish finished."
  return $true
}

$obsidianPath = (Resolve-Path -LiteralPath $ObsidianPosts).Path
Write-Log "Watching Obsidian posts: $obsidianPath"
Write-Log "Debounce: $DebounceSeconds seconds; poll: $PollSeconds seconds."
Write-Log "Log file: $logFile"

$lastSnapshot = Get-PostsSnapshot
$pendingSince = $null

while ($true) {
  Start-Sleep -Seconds $PollSeconds

  try {
    $currentSnapshot = Get-PostsSnapshot
  } catch {
    Write-Log $_.Exception.Message
    continue
  }

  if ($currentSnapshot -ne $lastSnapshot) {
    $lastSnapshot = $currentSnapshot
    $pendingSince = Get-Date
    Write-Log "Markdown change detected. Publish scheduled after $DebounceSeconds seconds without more changes."
    continue
  }

  if ($null -eq $pendingSince) {
    continue
  }

  $quietSeconds = ((Get-Date) - $pendingSince).TotalSeconds
  if ($quietSeconds -lt $DebounceSeconds) {
    continue
  }

  $snapshotBeforePublish = $lastSnapshot
  $null = Invoke-AutoPublish
  $snapshotAfterPublish = Get-PostsSnapshot

  if ($snapshotAfterPublish -ne $snapshotBeforePublish) {
    $lastSnapshot = $snapshotAfterPublish
    $pendingSince = Get-Date
    Write-Log "More changes appeared during publish. Another publish is scheduled."
  } else {
    $lastSnapshot = $snapshotAfterPublish
    $pendingSince = $null
  }
}
