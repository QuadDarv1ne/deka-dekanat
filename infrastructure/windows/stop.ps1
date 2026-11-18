param([switch]$Database,[switch]$Assistant)
$projectPath = Split-Path (Split-Path $PSScriptRoot)
$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $projectPath 'var\run\app-process.json'
if (Test-Path -LiteralPath $pidFile) {
  $record = Get-Content -LiteralPath $pidFile | ConvertFrom-Json
  $running = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
  if ($running) {
    $expected = if($record.started -is [datetime]){$record.started.ToUniversalTime()}else{[datetime]::Parse($record.started,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()}
    if ([Math]::Abs(($running.StartTime.ToUniversalTime()-$expected).TotalSeconds) -gt 1) { throw 'PID belongs to another process. Refusing to stop it.' }
    $runtime = Get-Content -LiteralPath (Join-Path $projectPath 'var\config\runtime.json') | ConvertFrom-Json
    if ($running.Path -ne $runtime.node) { throw 'Executable does not match. Refusing to stop it.' }
    Stop-Process -Id $running.Id
  }
  Remove-Item -LiteralPath $pidFile
}
if ($Assistant) {
  $assistantFile=Join-Path $projectPath 'var\run\assistant-process.json'
  if(Test-Path -LiteralPath $assistantFile){
    $record=Get-Content -LiteralPath $assistantFile | ConvertFrom-Json
    $running=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if($running){
      $expected=if($record.started -is [datetime]){$record.started.ToUniversalTime()}else{[datetime]::Parse($record.started,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()}
      if($running.Path -ne $record.path -or [Math]::Abs(($running.StartTime.ToUniversalTime()-$expected).TotalSeconds) -gt 1){throw 'Assistant process identity changed. Refusing to stop it.'}
      Stop-Process -Id $running.Id
    }
    Remove-Item -LiteralPath $assistantFile
  }
}
if ($Database) {
  $runtime = Get-Content -LiteralPath (Join-Path $projectPath 'var\config\runtime.json') | ConvertFrom-Json
  $postgresCtl = Join-Path $runtime.postgres_bin 'pg_ctl.exe'
  $databasePath = Join-Path $projectPath 'var\postgres'
  & $postgresCtl -D $databasePath status *> $null
  if ($LASTEXITCODE -eq 0) { & $postgresCtl -D $databasePath -m fast -w stop }
}
exit 0
