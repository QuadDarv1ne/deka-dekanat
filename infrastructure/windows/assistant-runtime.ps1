function Set-DekaAssistantEnvironment {
  param([string]$Path)
  if(!(Test-Path -LiteralPath $Path)){throw 'Configure application.env before starting the assistant.'}
  $content=[IO.File]::ReadAllText($Path)
  $missing=@()
  if($content -notmatch '(?m)^AI_BASE_URL='){$missing+='AI_BASE_URL=http://127.0.0.1:5188/v1'}
  if($content -notmatch '(?m)^AI_MODEL='){$missing+='AI_MODEL=deka-assistant'}
  if($missing.Count){[IO.File]::AppendAllText($Path,"`n"+($missing -join "`n")+"`n")}
}
function Get-DekaOwnedAssistant {
  param($Record)
  $process=Get-Process -Id $Record.pid -ErrorAction SilentlyContinue
  if(!$process){return $null}
  $expected=if($Record.started -is [datetime]){$Record.started.ToUniversalTime()}else{[datetime]::Parse($Record.started,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()}
  if($process.Path -ne $Record.path -or [Math]::Abs(($process.StartTime.ToUniversalTime()-$expected).TotalSeconds) -gt 1){throw 'Assistant process identity changed. No process stopped.'}
  return $process
}
function Get-DekaNativeGpu {
  param([string]$Server)
  if(!(Test-Path -LiteralPath $Server)){return $null}
  try{$devices=@(& $Server --list-devices 2>&1)}catch{return $null}
  if($LASTEXITCODE -ne 0){return $null}
  $available=@(foreach($line in $devices){if([string]$line -match '^\s*(Vulkan\d+):\s+(.+?)\s+\((\d+) MiB, (\d+) MiB free\)'){
    [pscustomobject]@{id=$Matches[1];name=$Matches[2];free=[int]$Matches[4];discrete=($Matches[2] -match 'GeForce|Quadro|RTX|Tesla|Radeon.*RX|Intel.*Arc')}
  }})
  return $available|Sort-Object @{Expression='discrete';Descending=$true}|Select-Object -First 1
}
function Start-DekaNativeAssistant {
  param([string]$Server,[string]$Model,[ValidateSet('gpu','cpu')][string]$Backend,[string]$Device,[string]$GpuName,[string]$ProjectPath,[int]$Attempts=120)
  $logs=Join-Path $ProjectPath 'var/logs'
  $recordPath=Join-Path $ProjectPath 'var/run/assistant-process.json'
  $arguments=@('--model',('"'+$Model+'"'),'--host','127.0.0.1','--port','5188','--ctx-size','16384','--parallel','2','--jinja','--alias','deka-assistant','--threads','6','--log-verbosity','1')
  if($Backend -eq 'gpu'){$arguments+=@('--device',$Device,'--n-gpu-layers','99')}else{$arguments+=@('--n-gpu-layers','0')}
  try{
    $process=Start-Process -FilePath $Server -ArgumentList $arguments -WorkingDirectory $ProjectPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs 'assistant.log') -RedirectStandardError (Join-Path $logs 'assistant-error.log')
  }catch{Write-Host "Could not launch assistant on $Backend. $($_.Exception.Message)";return $false}
  $record=@{pid=$process.Id;started=$process.StartTime.ToUniversalTime().ToString('O');path=$Server;backend=$Backend;device=$Device;gpu=$GpuName;model=$Model;alias='deka-assistant'}
  $record|ConvertTo-Json|Set-Content -LiteralPath $recordPath
  for($attempt=0;$attempt -lt $Attempts;$attempt++){
    try{if((Invoke-RestMethod 'http://127.0.0.1:5188/health' -TimeoutSec 1).status -eq 'ok'){return $true}}catch{}
    if($process.HasExited){break}
    Start-Sleep -Milliseconds 500
  }
  $owned=Get-DekaOwnedAssistant -Record $record
  if($owned){Stop-Process -Id $owned.Id;$owned.WaitForExit(5000)|Out-Null}
  Remove-Item -LiteralPath $recordPath -ErrorAction SilentlyContinue
  return $false
}
