param(
  [string]$PostgresBin,
  [string]$NodePath,
  [ValidateRange(1024,65535)][int]$AppPort = 5180,
  [ValidateRange(1024,65535)][int]$DatabasePort = 55438
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'postgres-runtime.ps1')
$projectPath = Split-Path (Split-Path $PSScriptRoot)
$configPath = Join-Path $projectPath 'var/config'
$logPath = Join-Path $projectPath 'var/logs'
$dataPath = Join-Path $projectPath 'var/postgres'
$envPath = Join-Path $configPath 'application.env'
if ((Test-Path -LiteralPath $envPath) -or (Test-Path -LiteralPath $dataPath)) {
  throw 'This project already has local settings or data. Run deka.ps1 start.'
}
if (!$NodePath) { $NodePath = (Get-Command node.exe -ErrorAction SilentlyContinue).Source }
if (!$PostgresBin) {
  $postgres = Get-Command pg_ctl.exe -ErrorAction SilentlyContinue
  if ($postgres) { $PostgresBin = Split-Path $postgres.Source }
}
if (!$PostgresBin -or !$NodePath) { throw 'Pass -PostgresBin and -NodePath or add PostgreSQL and Node.js to PATH.' }
if ($AppPort -eq $DatabasePort) { throw 'The application and database require different ports.' }
foreach ($port in @($AppPort, $DatabasePort)) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $port is in use. Choose a free port before running setup."
  }
}
$runtime = @{
  node = (Resolve-Path -LiteralPath $NodePath).Path
  postgres_bin = (Resolve-Path -LiteralPath $PostgresBin).Path
  app_port = $AppPort
  postgres_port = $DatabasePort
}
foreach ($binary in @('initdb.exe', 'createdb.exe', 'pg_ctl.exe')) {
  if (!(Test-Path -LiteralPath (Join-Path $runtime.postgres_bin $binary) -PathType Leaf)) {
    throw "Missing PostgreSQL executable: $binary"
  }
}
$env:PATH = (Split-Path $runtime.node) + ';' + $env:PATH
$npmCli = Join-Path (Split-Path $runtime.node) 'node_modules/npm/bin/npm-cli.js'
Push-Location -LiteralPath (Join-Path $projectPath 'apps/portal')
try {
  & $runtime.node $npmCli ci
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
} finally { Pop-Location }

New-Item -ItemType Directory -Path $configPath,$logPath -Force | Out-Null
$password = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$passwordPath = Join-Path $configPath 'init-password.tmp'
try {
  [IO.File]::WriteAllText($passwordPath, $password)
  & (Join-Path $runtime.postgres_bin 'initdb.exe') -D $dataPath -U deka --pwfile=$passwordPath --auth=scram-sha-256 --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initialization failed.' }
} finally { Remove-Item -LiteralPath $passwordPath -Force -ErrorAction SilentlyContinue }
Start-DekaPostgres -BinPath $runtime.postgres_bin -DataPath $dataPath -LogPath $logPath -Port $DatabasePort
$previousPassword = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $password
  & (Join-Path $runtime.postgres_bin 'createdb.exe') -h 127.0.0.1 -p $DatabasePort -U deka deka
  if ($LASTEXITCODE -ne 0) { throw 'Database creation failed.' }
} finally { $env:PGPASSWORD = $previousPassword }
$config = @(
  "DATABASE_URL=postgres://deka:${password}@127.0.0.1:$DatabasePort/deka"
  "ORIGIN=http://127.0.0.1:$AppPort"
  'HOST=127.0.0.1'
  "PORT=$AppPort"
  'DEMO_MODE=true'
)
$config | Set-Content -LiteralPath $envPath -Encoding utf8
$runtime | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $configPath 'runtime.json') -Encoding utf8
Write-Host "Created an isolated PostgreSQL database on 127.0.0.1:$DatabasePort."
