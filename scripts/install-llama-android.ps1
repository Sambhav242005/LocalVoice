$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskPackageRoot = Join-Path $taskRoot 'node_modules\llama.rn'
$taskPackage = Get-Content -LiteralPath (Join-Path $taskPackageRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$taskManifest = Get-Content -LiteralPath (Join-Path $taskPackageRoot 'install\native-artifacts.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$taskArtifact = $taskManifest.artifacts | Where-Object name -eq 'android-jni-libs'
if (!$taskArtifact -or !$taskArtifact.sha256) { throw 'Missing Android artifact metadata.' }
$taskCache = Join-Path $taskRoot '.expo\native'
New-Item -ItemType Directory -Force -Path $taskCache | Out-Null
$taskArchive = Join-Path $taskCache "llama-android-$($taskPackage.version).tar.gz"
$taskUrl = "https://github.com/mybigday/llama.rn/releases/download/v$($taskPackage.version)/$($taskArtifact.assetName)"
& "$env:SystemRoot\System32\curl.exe" -4 -f -L -C - --max-time 900 -o $taskArchive $taskUrl
if ($LASTEXITCODE -ne 0) { throw 'Download interrupted. Run this script again to resume.' }
$taskHash = (Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLower()
if ($taskHash -ne $taskArtifact.sha256) { throw 'Native artifact checksum mismatch. Do not build with it.' }
tar -xzf $taskArchive -C $taskPackageRoot
if ($LASTEXITCODE -ne 0) { throw 'Native artifact extraction failed.' }
[IO.File]::WriteAllText((Join-Path $taskPackageRoot $taskArtifact.markerPath), $taskHash)
Write-Output "Installed verified llama.rn $($taskPackage.version) Android libraries."
