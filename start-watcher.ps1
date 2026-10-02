param([ValidateRange(0,180)][int]$DurationMinutes = 0)
$ErrorActionPreference = 'Stop'
$durationDeadline = 0
if ($DurationMinutes -gt 0) { $durationDeadline = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ($DurationMinutes * 60 * 1000) }
if ($durationDeadline) { $env:COURSE_WATCH_DEADLINE_UTC_MS = [string]$durationDeadline }
else { Remove-Item Env:COURSE_WATCH_DEADLINE_UTC_MS -ErrorAction SilentlyContinue }
& node (Join-Path $PSScriptRoot 'launcher.cjs') video
exit $LASTEXITCODE
