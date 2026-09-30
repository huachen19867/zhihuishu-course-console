$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'launcher.cjs') homework
exit $LASTEXITCODE
