$ErrorActionPreference='Stop'
$projectPath=Split-Path (Split-Path $PSScriptRoot)
$arguments=@('compose','--env-file',(Join-Path $projectPath 'var/config/compose.env'),'-f',(Join-Path $PSScriptRoot 'compose.yaml'))
$backupDirectory=Join-Path $projectPath 'var/backups'
New-Item -ItemType Directory -Path $backupDirectory -Force|Out-Null
$name='deka-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.dump'
$temporary='/tmp/deka-backup-'+[guid]::NewGuid().ToString('N')+'.dump'
if($temporary -notmatch '^/tmp/deka-backup-[0-9a-f]{32}\.dump$'){throw 'Unexpected container backup path.'}
try {
  & docker @arguments exec -T database pg_dump -U deka_owner -d deka --format=custom --file=$temporary
  if($LASTEXITCODE -ne 0){throw 'Database backup failed.'}
  & docker @arguments cp ('database:'+$temporary) (Join-Path $backupDirectory $name)
  if($LASTEXITCODE -ne 0){throw 'Could not copy the backup from Docker.'}
  Write-Host ('Backup saved: '+(Join-Path $backupDirectory $name))
}finally{
  & docker @arguments exec -T database rm -- $temporary | Out-Null
}
