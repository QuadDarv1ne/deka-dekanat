param([switch]$Dev,[ValidateSet('auto','cpu')][string]$Acceleration='auto',[switch]$WithoutAssistant)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path (Split-Path $PSScriptRoot)
$applicationPath = Join-Path $projectPath 'apps\portal'
$configuration = Join-Path $projectPath 'var\config\application.env'
. (Join-Path $PSScriptRoot 'assistant-runtime.ps1')
. (Join-Path $PSScriptRoot 'postgres-runtime.ps1')
Set-DekaAssistantEnvironment -Path $configuration
$runtime = Get-Content -LiteralPath (Join-Path $projectPath 'var\config\runtime.json') | ConvertFrom-Json
$appPort = $runtime.app_port ?? 5180
$databasePort = $runtime.postgres_port ?? 55438
$site = "http://127.0.0.1:$appPort"
$nodePath = (Resolve-Path -LiteralPath $runtime.node).Path
$databasePath = Join-Path $projectPath 'var\postgres'
$logPath = Join-Path $projectPath 'var\logs'
$runPath = Join-Path $projectPath 'var\run'
New-Item -ItemType Directory -Path $logPath,$runPath -Force | Out-Null
$env:PATH = (Split-Path $nodePath) + ';' + $env:PATH
if (!$env:BODY_SIZE_LIMIT) { $env:BODY_SIZE_LIMIT = '1200000' }
function Start-OptionalAssistant {
  if($WithoutAssistant){return}
  try {
    & (Join-Path $PSScriptRoot 'start-assistant.ps1') -Acceleration $Acceleration
    if($LASTEXITCODE -ne 0){throw 'Assistant startup failed.'}
  } catch {
    Write-Host 'Deka is running. Assistant is unavailable; see var/logs for details.'
    $_ | Out-String | Add-Content -LiteralPath (Join-Path $logPath 'assistant-start-error.log')
  }
}
if (Test-Path -LiteralPath (Join-Path $databasePath 'PG_VERSION')) {
  $postgresCtl = Join-Path $runtime.postgres_bin 'pg_ctl.exe'
  & $postgresCtl -D $databasePath status *> $null
  if ($LASTEXITCODE -ne 0) {
    Start-DekaPostgres -BinPath $runtime.postgres_bin -DataPath $databasePath -LogPath $logPath -Port $databasePort
  }
}
$existing = Get-NetTCPConnection -LocalPort $appPort -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  $pidFile = Join-Path $runPath 'app-process.json'
  if (Test-Path -LiteralPath $pidFile) {
    $record = Get-Content -LiteralPath $pidFile | ConvertFrom-Json
    if ($record.pid -in $existing.OwningProcess) {
      try { $health = Invoke-RestMethod "$site/health" -TimeoutSec 3 } catch { $health = $null }
      if ($health.service -eq 'deka' -and $health.status -eq 'ok') {
        Write-Host "Deka is already running: $site"
        Start-OptionalAssistant
        exit 0
      }
    }
  }
  throw "Port $appPort is in use."
}
$previousLocation = Get-Location
try {
  Set-Location -LiteralPath $applicationPath
  if (!(Test-Path -LiteralPath 'node_modules')) {
    $npmCli = Join-Path (Split-Path $nodePath) 'node_modules\npm\bin\npm-cli.js'
    & $nodePath $npmCli ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
  }
  & $nodePath "--env-file=$configuration" tooling/database/migrate.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
  if (!$Dev) {
    & $nodePath "--env-file=$configuration" node_modules/vite/bin/vite.js build
    if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
  }
  $arguments = if ($Dev) { @('"--env-file='+$configuration+'"','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',([string]$appPort),'--strictPort') } else { @('"--env-file='+$configuration+'"','.output/index.js') }
  $process = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $applicationPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logPath 'app.log') -RedirectStandardError (Join-Path $logPath 'app-error.log')
  @{pid=$process.Id;started=$process.StartTime.ToUniversalTime().ToString('O')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runPath 'app-process.json')
  for ($attempt=0;$attempt -lt 60;$attempt++) {
    try { $health = Invoke-RestMethod "$site/health" -TimeoutSec 2 } catch { $health=$null }
    if ($health.status -eq 'ok') { Write-Host "Deka is ready: $site"; Start-OptionalAssistant; exit 0 }
    if ($process.HasExited) { throw 'Application exited. See var/logs/app-error.log.' }
    Start-Sleep -Milliseconds 250
  }
  throw 'Application did not become ready. See var/logs/app-error.log.'
} finally { Set-Location -LiteralPath $previousLocation }
