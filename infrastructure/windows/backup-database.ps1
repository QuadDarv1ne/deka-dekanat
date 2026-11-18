param([switch]$Verify)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path (Split-Path $PSScriptRoot)
$runtime = Get-Content -LiteralPath (Join-Path $projectPath 'var\config\runtime.json') | ConvertFrom-Json
$backupPath = Join-Path $projectPath 'var\backups'
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
$target = Join-Path $backupPath ('deka-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')
$configuration = Join-Path $projectPath 'var\config\application.env'
$dump = Join-Path $runtime.postgres_bin 'pg_dump.exe'
# Connection credentials are passed to the child environment, never in command arguments.
$script = @'
import { spawnSync } from 'node:child_process';
const connection = new URL(process.env.DATABASE_URL);
const [command, target] = process.argv.slice(1);
const result = spawnSync(command, ['--format=custom','--file='+target,'--no-password'], {
 env: {...process.env, PGHOST:connection.hostname, PGPORT:connection.port || '5432', PGUSER:decodeURIComponent(connection.username), PGPASSWORD:decodeURIComponent(connection.password), PGDATABASE:decodeURIComponent(connection.pathname.slice(1))},
 stdio: 'inherit', windowsHide: true
});
process.exit(result.status ?? 1);
'@
& $runtime.node "--env-file=$configuration" --input-type=module -e $script $dump $target
if ($LASTEXITCODE -ne 0) { throw 'Backup failed.' }
Write-Host "Backup saved: $target"
if($Verify){
  $previousRestore=$env:PG_RESTORE_BIN
  try {
    $env:PG_RESTORE_BIN=Join-Path $runtime.postgres_bin 'pg_restore.exe'
    & $runtime.node "--env-file=$configuration" (Join-Path $projectPath 'apps/portal/tooling/database/verify-backup.mjs') $target
    if($LASTEXITCODE -ne 0){throw 'Restore verification failed.'}
  } finally {$env:PG_RESTORE_BIN=$previousRestore}
}
