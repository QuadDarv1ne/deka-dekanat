param(
  [ValidateSet('docker-config','docker-up','docker-demo','docker-down','docker-backup')][string]$Action='docker-up',
  [ValidateSet('auto','cpu')][string]$Acceleration='auto',
  [switch]$WithoutAssistant
)
$ErrorActionPreference='Stop'
$projectPath=Split-Path (Split-Path $PSScriptRoot)
$configuration=Join-Path $projectPath 'var/config/compose.env'
$composeFile=Join-Path $PSScriptRoot 'compose.yaml'
if(!(Test-Path -LiteralPath $configuration)){
  New-Item -ItemType Directory -Path (Split-Path $configuration) -Force | Out-Null
  function New-ComposePassword {
    $bytes=New-Object byte[] 24
    $generator=[Security.Cryptography.RandomNumberGenerator]::Create()
    try{$generator.GetBytes($bytes)}finally{$generator.Dispose()}
    return [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant()
  }
  $content='POSTGRES_PASSWORD='+(New-ComposePassword)+"`nAPP_DB_PASSWORD="+(New-ComposePassword)+"`nAPP_ORIGIN=http://localhost:5180`nAPP_PORT=5180`nDEKA_VERSION=local`n"
  [IO.File]::WriteAllText($configuration,$content)
}
if($Action -eq 'docker-config'){Write-Host 'Compose configuration is ready.';exit 0}
if(!(Get-Command docker -ErrorAction SilentlyContinue)){throw 'Install and start Docker Desktop with Linux containers first.'}
if($Action -eq 'docker-backup'){& (Join-Path $PSScriptRoot 'backup.ps1');exit $LASTEXITCODE}
$base=@('compose','--env-file',$configuration,'-f',$composeFile,'--profile','ai')
if($Action -eq 'docker-down'){& docker @base --profile sample-data down;exit $LASTEXITCODE}
$engine=@(& docker info --format '{{.OSType}}' 2>&1)
if($LASTEXITCODE -ne 0 -or ($engine -join '').Trim() -ne 'linux'){throw 'Docker is unavailable. Start Docker Desktop with Linux containers.'}
New-Item -ItemType Directory -Path (Join-Path $projectPath 'var/logs'),(Join-Path $projectPath 'var/run') -Force | Out-Null
. (Join-Path $PSScriptRoot 'assistant-runtime.ps1')
$previousDemo=$env:DEMO_MODE
try {
  if($Action -eq 'docker-demo'){$env:DEMO_MODE='true'}
  & docker @base up --build -d app
  if($LASTEXITCODE -ne 0){throw 'Application startup failed. Check Docker Compose logs.'}
  if($Action -eq 'docker-demo'){
    & docker @base --profile sample-data run --rm seed
    if($LASTEXITCODE -ne 0){throw 'Initial data setup failed.'}
  }
  if(!$WithoutAssistant){
    & docker @base run --rm --no-deps model-init
    if($LASTEXITCODE -ne 0){throw 'Model download or checksum verification failed. Run the same command to resume.'}
    $backend=Get-DekaDockerBackend -BaseArguments $base -Acceleration $Acceleration
    $selected=Start-DekaDockerAssistant -BaseArguments $base -Backend $backend -ProjectPath $projectPath
    Write-Host "Assistant is ready: $selected."
  }
  Write-Host 'Open http://localhost:5180 in your browser.'
}finally{$env:DEMO_MODE=$previousDemo}
