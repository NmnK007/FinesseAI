[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('DryRun','Apply')][string]$Mode='DryRun',[string]$TaskName='FinneseRetention')
$ErrorActionPreference='Stop'
$runner=(Resolve-Path (Join-Path $PSScriptRoot 'run-retention.ps1')).Path
$arguments='-NoProfile -NonInteractive -WindowStyle Hidden -File "'+$runner+'" -Mode '+$Mode
if($PSCmdlet.ShouldProcess($TaskName,"Register daily 03:00 local retention task in $Mode mode")){
 $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
 $trigger=New-ScheduledTaskTrigger -Daily -At '03:00'
 $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
 Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Finnese source retention; inspect dry-run before enabling Apply.' -ErrorAction Stop | Out-Null
}
