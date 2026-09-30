$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'launcher.cjs') video
exit $LASTEXITCODE
