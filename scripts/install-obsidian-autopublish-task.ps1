param(
  [switch]$StartNow,
  [int]$DebounceSeconds = 60,
  [int]$PollSeconds = 10
)

$ErrorActionPreference = "Stop"

$taskName = "SgecsWtpObsidianAutoPublish"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$watchScript = (Resolve-Path (Join-Path $PSScriptRoot "watch-obsidian-posts.ps1")).Path
$userId = "$env:USERDOMAIN\$env:USERNAME"

$arguments = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-WindowStyle",
  "Hidden",
  "-File",
  "`"$watchScript`"",
  "-DebounceSeconds",
  $DebounceSeconds,
  "-PollSeconds",
  $PollSeconds
) -join " "

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited

$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal
Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null

if ($StartNow) {
  Start-ScheduledTask -TaskName $taskName
}

Write-Output "Installed scheduled task: $taskName"
Write-Output "User: $userId"
Write-Output "Watcher: $watchScript"
Write-Output "Start now: $StartNow"
Write-Output "Log: $env:LOCALAPPDATA\sgecswtp-site\obsidian-autopublish.log"
