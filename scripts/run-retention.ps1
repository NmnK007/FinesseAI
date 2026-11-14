[CmdletBinding()]
param([ValidateSet('DryRun','Apply')][string]$Mode='DryRun')
$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location -LiteralPath $repoRoot
try {
 if($Mode -eq 'Apply'){& npm.cmd run data:retention -- --apply}else{& npm.cmd run data:retention}
 if($LASTEXITCODE -ne 0){throw 'Retention task failed.'}
} finally {Pop-Location}
