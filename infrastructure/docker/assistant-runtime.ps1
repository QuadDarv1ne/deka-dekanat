function Get-DekaDockerBackend {
  param([string[]]$BaseArguments,[ValidateSet('auto','cpu')][string]$Acceleration)
  if($Acceleration -eq 'cpu'){return 'cpu'}
  $image=@(& docker @BaseArguments images -q app 2>$null) | Select-Object -First 1
  if($LASTEXITCODE -eq 0 -and $image){
    $probe="const {execFileSync}=require('node:child_process');try{const s=execFileSync('nvidia-smi',['--query-gpu=name','--format=csv,noheader'],{encoding:'utf8'});process.exit(s.trim()?0:1);}catch{process.exit(1);}"
    $null=& docker run --rm --network none --gpus all -e NVIDIA_DRIVER_CAPABILITIES=compute,utility --entrypoint node $image -e $probe 2>&1
    if($LASTEXITCODE -eq 0){return 'cuda'}
  }
  if(Test-Path -LiteralPath '/dev/dri'){return 'vulkan'}
  return 'cpu'
}
function Get-DekaAssistantArguments {
  param([string[]]$BaseArguments,[string]$Backend)
  $arguments=@($BaseArguments)
  if($Backend -ne 'cpu'){$arguments+=@('-f',(Join-Path $PSScriptRoot "compose.$Backend.yaml"))}
  return $arguments
}
function Wait-DekaDockerAssistant {
  param([string[]]$ComposeArguments,[int]$Attempts=90)
  $container=@(& docker @ComposeArguments ps -q ai 2>$null) | Select-Object -First 1
  if($LASTEXITCODE -ne 0 -or !$container){return $false}
  for($attempt=0;$attempt -lt $Attempts;$attempt++){
    $status=@(& docker inspect --format '{{.State.Health.Status}} {{.State.Status}}' $container 2>$null)
    if($LASTEXITCODE -ne 0){return $false}
    $state=($status -join '').Trim()
    if($state -eq 'healthy running'){return $true}
    if($state -match 'unhealthy|exited|dead|restarting'){return $false}
    Start-Sleep -Seconds 2
  }
  return $false
}
function Start-DekaDockerAssistant {
  param([string[]]$BaseArguments,[ValidateSet('cpu','cuda','vulkan')][string]$Backend,[string]$ProjectPath)
  $selected=$Backend
  $arguments=Get-DekaAssistantArguments -BaseArguments $BaseArguments -Backend $selected
  Write-Host "Starting assistant on $selected."
  & docker @arguments up --no-deps -d ai | Out-Host
  $ready=$LASTEXITCODE -eq 0 -and (Wait-DekaDockerAssistant -ComposeArguments $arguments)
  if(!$ready -and $selected -ne 'cpu'){
    & docker @arguments logs --tail 80 ai *> (Join-Path $ProjectPath 'var/logs/docker-ai-gpu.log')
    Write-Host 'GPU startup failed or timed out. Switching to CPU.'
    $selected='cpu'
    $arguments=Get-DekaAssistantArguments -BaseArguments $BaseArguments -Backend $selected
    & docker @arguments up --no-deps -d ai | Out-Host
    $ready=$LASTEXITCODE -eq 0 -and (Wait-DekaDockerAssistant -ComposeArguments $arguments)
  }
  if(!$ready){throw 'Assistant failed to start on CPU. Check Docker Compose logs for ai.'}
  @{backend=$selected;requested=$Backend;updated=[DateTime]::UtcNow.ToString('O')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $ProjectPath 'var/run/docker-acceleration.json')
  return $selected
}
