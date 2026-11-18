function Start-DekaPostgres {
  param([string]$BinPath, [string]$DataPath, [string]$LogPath, [int]$Port = 55438)

  $arguments = @(
    '-D', ('"' + $DataPath + '"'),
    '-l', ('"' + (Join-Path $LogPath 'postgres.log') + '"'),
    '-o', ('"-p ' + $Port + ' -h 127.0.0.1"'),
    '-w', 'start'
  )
  $process = Start-Process -FilePath (Join-Path $BinPath 'pg_ctl.exe') `
    -ArgumentList $arguments -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $LogPath 'postgres-start.log') `
    -RedirectStandardError (Join-Path $LogPath 'postgres-start-error.log')
  try {
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
      throw 'Could not start PostgreSQL. See var/logs/postgres.log and postgres-start-error.log.'
    }
  } finally {
    $process.Dispose()
  }
}
