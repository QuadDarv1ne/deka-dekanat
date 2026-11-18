param([ValidateSet('auto','cpu')][string]$Acceleration='auto')
$ErrorActionPreference='Stop'
$projectPath=Split-Path (Split-Path $PSScriptRoot)
& (Join-Path $PSScriptRoot 'setup-assistant.ps1') -Acceleration $Acceleration
if($LASTEXITCODE -ne 0){throw 'Assistant setup failed.'}
$runtime=Get-Content -LiteralPath (Join-Path $projectPath 'var/config/runtime.json')|ConvertFrom-Json
$recordPath=Join-Path $projectPath 'var/run/assistant-process.json'
$logDirectory=Join-Path $projectPath 'var/logs'
New-Item -ItemType Directory -Path (Split-Path $recordPath),$logDirectory -Force|Out-Null
. (Join-Path $PSScriptRoot 'assistant-runtime.ps1')
$candidate=$null
if($Acceleration -eq 'auto' -and $runtime.llama_gpu_server){$candidate=Get-DekaNativeGpu -Server $runtime.llama_gpu_server}
$existing=Get-NetTCPConnection -LocalPort 5188 -State Listen -ErrorAction SilentlyContinue
if($existing){
  if(!(Test-Path -LiteralPath $recordPath)){throw 'Port 5188 is occupied by an untracked process.'}
  $record=Get-Content -LiteralPath $recordPath|ConvertFrom-Json
  $process=Get-DekaOwnedAssistant -Record $record
  if(!$process -or $existing.OwningProcess -notcontains $process.Id){throw 'Port 5188 is occupied by another process.'}
  $healthy=$false
  try{$healthy=(Invoke-RestMethod 'http://127.0.0.1:5188/health' -TimeoutSec 2).status -eq 'ok'}catch{}
  $desired=if($candidate){'gpu'}else{'cpu'}
  if($healthy -and $record.backend -eq $desired -and $record.model -eq $runtime.ai_model -and $record.alias -eq 'deka-assistant'){Write-Host "Assistant is already running on $desired.";exit 0}
  Stop-Process -Id $process.Id
  $process.WaitForExit(5000)|Out-Null
}
if($candidate){
  if(Start-DekaNativeAssistant -Server $runtime.llama_gpu_server -Model $runtime.ai_model -Backend 'gpu' -Device $candidate.id -GpuName $candidate.name -ProjectPath $projectPath){Write-Host "Assistant is ready on GPU: $($candidate.name).";exit 0}
  if(Test-Path -LiteralPath (Join-Path $logDirectory 'assistant-error.log')){Copy-Item -LiteralPath (Join-Path $logDirectory 'assistant-error.log') -Destination (Join-Path $logDirectory 'assistant-gpu-error.log') -Force}
  Write-Host 'GPU startup failed or timed out. Switching to CPU.'
}
if(!(Start-DekaNativeAssistant -Server $runtime.llama_server -Model $runtime.ai_model -Backend 'cpu' -ProjectPath $projectPath)){throw 'Assistant failed to start on CPU. See var/logs/assistant-error.log.'}
Write-Host 'Assistant is ready on CPU.'
exit 0
