$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'read-config.ps1')
$courseConfig = Get-CourseConfig
$cdpAddress = [Uri]$courseConfig.cdpUrl
if ($cdpAddress.Host -notin @('127.0.0.1','localhost')) { throw 'The Edge launcher requires a localhost CDP address.' }
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $edgePath)) { $edgePath = Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe' }
if (-not (Test-Path -LiteralPath $edgePath)) { throw 'Edge executable not found.' }
$profilePath = Join-Path $PSScriptRoot 'edge-control-profile'
$landingPage = 'https://studyvideoh5.zhihuishu.com/'
if ($courseConfig.courseUrl) { $landingPage = $courseConfig.courseUrl }
Start-Process -FilePath $edgePath -ArgumentList @(('--remote-debugging-port=' + $cdpAddress.Port), '--remote-debugging-address=127.0.0.1', ('--user-data-dir="' + $profilePath + '"'), '--no-first-run', '--new-window', $landingPage)
