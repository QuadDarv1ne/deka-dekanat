param(
  [ValidateSet('start','dev','stop','check','test','build','migrate','seed','setup','assistant','backup','backup-check','package','docker-config','docker-up','docker-demo','docker-down','docker-backup')]
  [string]$Action='start',
  [string]$NodePath,
  [string]$PostgresBin,
  [ValidateRange(1024,65535)][int]$AppPort=5180,
  [ValidateRange(1024,65535)][int]$DatabasePort=55438,
  [ValidateSet('auto','cpu')][string]$Acceleration='auto',
  [switch]$WithoutAssistant
)
$ErrorActionPreference='Stop'
$windowsPath=Join-Path $PSScriptRoot 'infrastructure/windows'
switch($Action){
  'package' { & (Join-Path $PSScriptRoot 'infrastructure/release/package-source.ps1');exit $LASTEXITCODE }
  'setup' { & (Join-Path $windowsPath 'initialize-database.ps1') -NodePath $NodePath -PostgresBin $PostgresBin -AppPort $AppPort -DatabasePort $DatabasePort;exit $LASTEXITCODE }
  'stop' { & (Join-Path $windowsPath 'stop.ps1') -Assistant -Database;exit $LASTEXITCODE }
  {$_ -in @('start','dev')} { & (Join-Path $windowsPath 'start.ps1') -Dev:($Action -eq 'dev') -Acceleration $Acceleration -WithoutAssistant:$WithoutAssistant;exit $LASTEXITCODE }
  'assistant' { & (Join-Path $windowsPath 'setup-assistant.ps1') -Acceleration $Acceleration;exit $LASTEXITCODE }
  'backup' { & (Join-Path $windowsPath 'backup-database.ps1');exit $LASTEXITCODE }
  'backup-check' { & (Join-Path $windowsPath 'backup-database.ps1') -Verify;exit $LASTEXITCODE }
  {$_ -like 'docker-*'} { & (Join-Path $PSScriptRoot 'infrastructure/docker/start.ps1') -Action $Action -Acceleration $Acceleration -WithoutAssistant:$WithoutAssistant;exit $LASTEXITCODE }
}
$runtime=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'var/config/runtime.json')|ConvertFrom-Json
$node=(Resolve-Path -LiteralPath $runtime.node).Path
$env:PATH=(Split-Path $node)+';'+$env:PATH
$npm=Join-Path (Split-Path $node) 'node_modules/npm/bin/npm-cli.js'
$configuration=Join-Path $PSScriptRoot 'var/config/application.env'
$previousLocation=Get-Location
try {
  Set-Location -LiteralPath (Join-Path $PSScriptRoot 'apps/portal')
  $command=switch($Action){'migrate'{'db:migrate'}'seed'{'db:seed'}default{$Action}}
  & $node "--env-file=$configuration" $npm run $command
  $result=$LASTEXITCODE
}finally{Set-Location -LiteralPath $previousLocation}
exit $result
