param([switch]$Cpu)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskCache = Join-Path $taskRoot '.localvoice-pc'
New-Item -ItemType Directory -Force -Path $taskCache | Out-Null
function Get-VerifiedAsset($Url, $Destination, $Hash, $Bytes = 0) {
  if (Test-Path -LiteralPath $Destination) {
    if (($Bytes -eq 0 -or (Get-Item -LiteralPath $Destination).Length -eq $Bytes) -and (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash.ToLower() -eq $Hash) { return }
    throw "Existing file failed verification: $Destination. Move it aside before retrying."
  }
  $taskPartial = "$Destination.part"
  & "$env:SystemRoot\System32\curl.exe" -f -L -C - --retry 3 -o $taskPartial $Url
  if ($LASTEXITCODE -ne 0) { throw 'Download interrupted; run setup again to resume.' }
  if ($Bytes -gt 0 -and (Get-Item -LiteralPath $taskPartial).Length -ne $Bytes) { throw 'Downloaded size differs from pinned manifest.' }
  if ((Get-FileHash -LiteralPath $taskPartial -Algorithm SHA256).Hash.ToLower() -ne $Hash) { throw 'Downloaded SHA-256 differs from pinned manifest.' }
  Move-Item -LiteralPath $taskPartial -Destination $Destination
}
$taskBase = 'https://github.com/ggml-org/llama.cpp/releases/download/b11516/'
$taskEngine = Join-Path $taskCache 'llama-b11516'
New-Item -ItemType Directory -Force -Path $taskEngine | Out-Null
if ($Cpu) {
  $taskArchive = Join-Path $taskCache 'llama-cpu-b11516.zip'
  Get-VerifiedAsset "${taskBase}llama-b11516-bin-win-cpu-x64.zip" $taskArchive '3b3cfa85b7c895b5cf580da009704c32d55975148ed3aaa6758efb815e9d062c'
} else {
  $taskArchive = Join-Path $taskCache 'llama-cuda-b11516.zip'
  Get-VerifiedAsset "${taskBase}llama-b11516-bin-win-cuda-13.4-x64.zip" $taskArchive '633f4cdc3a8710c40ae57abd5d0b0a98050e94e48841e672ae9f9ef2116b9eaa'
  $taskCuda = Join-Path $taskCache 'cudart-b11516.zip'
  Get-VerifiedAsset "${taskBase}cudart-llama-bin-win-cuda-13.4-x64.zip" $taskCuda '738f8c251ac22b70c3ae6f83a10cf222725df0395246a2cf58f32bdb85fbe668'
  Expand-Archive -LiteralPath $taskCuda -DestinationPath $taskEngine -Force
}
Expand-Archive -LiteralPath $taskArchive -DestinationPath $taskEngine -Force
$taskManifest = Get-Content -Raw -Encoding UTF8 (Join-Path $taskRoot 'src/data/models.json') | ConvertFrom-Json
$taskLfm = ($taskManifest | Where-Object id -eq 'llm').files[0]
$taskModelDir = Join-Path $taskCache 'models/llm'
New-Item -ItemType Directory -Force -Path $taskModelDir | Out-Null
Get-VerifiedAsset $taskLfm.url (Join-Path $taskModelDir $taskLfm.path) $taskLfm.sha256 $taskLfm.bytes
Write-Output 'PC LFM assets verified. Start with npm run pc:start; pairing token is in .localvoice-pc/pairing-token.txt.'
