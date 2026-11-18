param([string]$Repository,[string]$TestDirectory)
$ErrorActionPreference='Stop'
$global:DekaDockerTestCalls=[Collections.Generic.List[string]]::new()
$global:DekaDockerTestMode='gpu'
$global:DekaDockerTestBackend='cpu'
function global:docker {
  $command=$args -join ' '
  $global:DekaDockerTestCalls.Add($command)
  $global:LASTEXITCODE=0
  if($command -match '^info '){'linux';return}
  if($command -match 'images -q app'){'test-image';return}
  if($command -match '^run .*--gpus all'){if($global:DekaDockerTestMode -eq 'no-gpu'){$global:LASTEXITCODE=1};return}
  if($command -match 'up --no-deps -d ai'){
    $global:DekaDockerTestBackend=if($command -match 'compose.cuda.yaml'){'cuda'}else{'cpu'}
    if($global:DekaDockerTestMode -eq 'gpu-start-failure' -and $global:DekaDockerTestBackend -eq 'cuda'){$global:LASTEXITCODE=1}
    return
  }
  if($command -match 'ps -q ai'){'test-container';return}
  if($command -match '^inspect '){
    if($global:DekaDockerTestMode -eq 'all-fail' -or ($global:DekaDockerTestMode -eq 'gpu-health-failure' -and $global:DekaDockerTestBackend -eq 'cuda')){'unhealthy running'}else{'healthy running'}
  }
}
New-Item -ItemType Directory -Path (Join-Path $TestDirectory 'infrastructure/docker') -Force|Out-Null
Copy-Item -LiteralPath (Join-Path $Repository 'deka.ps1') -Destination (Join-Path $TestDirectory 'deka.ps1')
Get-ChildItem -LiteralPath (Join-Path $Repository 'infrastructure/docker') -File|Copy-Item -Destination (Join-Path $TestDirectory 'infrastructure/docker')
& (Join-Path $TestDirectory 'deka.ps1') docker-demo
if($LASTEXITCODE -ne 0){throw 'Default startup failed.'}
$record=Get-Content -LiteralPath (Join-Path $TestDirectory 'var/run/docker-acceleration.json')|ConvertFrom-Json
if($record.backend -ne 'cuda'){throw 'GPU was not selected by default.'}
$calls=$global:DekaDockerTestCalls.ToArray()
$downloadIndex=-1;$startIndex=-1
for($i=0;$i -lt $calls.Length;$i++){if($calls[$i] -match 'run --rm --no-deps model-init'){$downloadIndex=$i};if($calls[$i] -match 'up --no-deps -d ai'){$startIndex=$i}}
if($downloadIndex -lt 0 -or $downloadIndex -ge $startIndex){throw 'The model must be downloaded before inference starts.'}
if(Test-Path -LiteralPath (Join-Path $TestDirectory 'var/config/runtime.json')){throw 'Docker bootstrap unexpectedly needs native Node.js configuration.'}
. (Join-Path $Repository 'infrastructure/docker/assistant-runtime.ps1')
$base=@('compose','-f',(Join-Path $Repository 'infrastructure/docker/compose.yaml'))
$global:DekaDockerTestMode='no-gpu'
if((Get-DekaDockerBackend -BaseArguments $base -Acceleration auto) -ne 'cpu'){throw 'Missing GPU did not select CPU.'}
foreach($mode in @('gpu-start-failure','gpu-health-failure')){
  $global:DekaDockerTestMode=$mode
  if((Start-DekaDockerAssistant -BaseArguments $base -Backend cuda -ProjectPath $TestDirectory) -ne 'cpu'){throw "CPU fallback failed: $mode"}
}
$global:DekaDockerTestMode='all-fail'
$failed=$false
try{$null=Start-DekaDockerAssistant -BaseArguments $base -Backend cpu -ProjectPath $TestDirectory}catch{$failed=$true}
if(!$failed){throw 'An unavailable CPU assistant was reported as successful.'}
$before=$global:DekaDockerTestCalls.Count
if((Get-DekaDockerBackend -BaseArguments $base -Acceleration cpu) -ne 'cpu' -or $global:DekaDockerTestCalls.Count -ne $before){throw 'CPU override unexpectedly probed GPU.'}
Write-Output 'Docker startup, GPU selection, CPU fallback and model initialization order passed.'
. (Join-Path $Repository 'infrastructure/windows/assistant-runtime.ps1')
$environmentPath=Join-Path $TestDirectory 'native-application.env'
[IO.File]::WriteAllText($environmentPath,"DATABASE_URL=postgres://existing/installation`n")
Set-DekaAssistantEnvironment -Path $environmentPath
Set-DekaAssistantEnvironment -Path $environmentPath
$environment=[IO.File]::ReadAllText($environmentPath)
if($environment -notmatch 'DATABASE_URL=postgres://existing/installation' -or [regex]::Matches($environment,'(?m)^AI_MODEL=deka-assistant').Count -ne 1 -or [regex]::Matches($environment,'(?m)^AI_BASE_URL=http://127.0.0.1:5188/v1').Count -ne 1){throw 'Native assistant defaults are missing, duplicated or changed database settings.'}
[IO.File]::WriteAllText($environmentPath,"AI_BASE_URL=http://localhost:5198/v1`nAI_MODEL=custom-model`n")
Set-DekaAssistantEnvironment -Path $environmentPath
if([IO.File]::ReadAllText($environmentPath) -ne "AI_BASE_URL=http://localhost:5198/v1`nAI_MODEL=custom-model`n"){throw 'Native setup replaced existing assistant settings.'}
Write-Output 'Native assistant environment preserves existing settings and adds defaults once.'
