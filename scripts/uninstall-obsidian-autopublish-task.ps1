$ErrorActionPreference = "Stop"

$taskName = "SgecsWtpObsidianAutoPublish"
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($null -eq $task) {
  Write-Output "Scheduled task not found: $taskName"
  exit 0
}

if ($task.State -eq "Running") {
  Stop-ScheduledTask -TaskName $taskName
}

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Output "Removed scheduled task: $taskName"
