param([ValidateSet('auto','cpu')][string]$Acceleration='auto')
$ErrorActionPreference='Stop'
$projectPath=Split-Path (Split-Path $PSScriptRoot)
$manifest=Get-Content -LiteralPath (Join-Path $projectPath 'infrastructure/assistant/model-manifest.json')|ConvertFrom-Json
$runtimePath=Join-Path $projectPath 'var/config/runtime.json'
if(!(Test-Path -LiteralPath $runtimePath)){throw 'Configure var/config/runtime.json first.'}
$runtime=Get-Content -LiteralPath $runtimePath|ConvertFrom-Json
. (Join-Path $PSScriptRoot 'assistant-runtime.ps1')
Set-DekaAssistantEnvironment -Path (Join-Path $projectPath 'var/config/application.env')
$runtimeDirectory=Join-Path $projectPath 'var/runtime'
$modelDirectory=Join-Path $projectPath 'var/models'
$previousModelDirectory=$env:MODEL_DIRECTORY
try {
  $env:MODEL_DIRECTORY=$modelDirectory
  & $runtime.node (Join-Path $projectPath 'infrastructure/assistant/download-model.mjs')
  if($LASTEXITCODE -ne 0){throw 'Model download or checksum verification failed.'}
}finally{$env:MODEL_DIRECTORY=$previousModelDirectory}
function Install-DekaRuntime {
  param([string]$Archive,[string]$Checksum,[string]$Directory)
  $server=Join-Path $Directory 'llama-server.exe'
  if(Test-Path -LiteralPath $server){return $server}
  New-Item -ItemType Directory -Path $runtimeDirectory -Force|Out-Null
  $download=Join-Path $runtimeDirectory ($Archive+'.partial')
  $url="https://github.com/ggml-org/llama.cpp/releases/download/$($manifest.runtime.release)/$Archive"
  & curl.exe --fail --location --retry 2 --continue-at - $url -o $download
  if($LASTEXITCODE -ne 0){throw 'Runtime download failed.'}
  if((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Checksum){Remove-Item -LiteralPath $download;throw 'Runtime checksum mismatch.'}
  $zip=Join-Path $runtimeDirectory $Archive
  Move-Item -LiteralPath $download -Destination $zip -Force
  Expand-Archive -LiteralPath $zip -DestinationPath $Directory -Force
  Remove-Item -LiteralPath $zip
  return $server
}
$cpuServer=Install-DekaRuntime -Archive $manifest.runtime.windowsCpuArchive -Checksum $manifest.runtime.sha256 -Directory (Join-Path $runtimeDirectory 'llama-cpu')
$runtime|Add-Member -NotePropertyName llama_server -NotePropertyValue $cpuServer -Force
$runtime|Add-Member -NotePropertyName ai_model -NotePropertyValue (Join-Path $modelDirectory $manifest.filename) -Force
if($Acceleration -eq 'auto'){
  $gpu=@(Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue|Where-Object {$_.Name -notmatch 'Microsoft Basic|Remote|Virtual'})
  if($gpu.Count){
    try {
      $gpuServer=Install-DekaRuntime -Archive $manifest.runtime.windowsVulkanArchive -Checksum $manifest.runtime.windowsVulkanSha256 -Directory (Join-Path $runtimeDirectory 'llama-vulkan')
      $runtime|Add-Member -NotePropertyName llama_gpu_server -NotePropertyValue $gpuServer -Force
    }catch {Write-Host "GPU runtime is unavailable. CPU remains available. $($_.Exception.Message)"}
  }
}
$runtime|ConvertTo-Json|Set-Content -LiteralPath $runtimePath
Write-Host 'Assistant files are ready.'
exit 0
