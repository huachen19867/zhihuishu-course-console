function Get-CourseConfig {
    $configFile = Join-Path $PSScriptRoot 'config.local.json'
    if ($env:COURSE_CONFIG) { $configFile = $env:COURSE_CONFIG }
    $courseConfig = @{ cdpUrl = 'http://127.0.0.1:9222'; courseUrl = ''; courseName = '' }
    if (Test-Path -LiteralPath $configFile) {
        $userConfig = [System.IO.File]::ReadAllText($configFile) | ConvertFrom-Json
        foreach ($key in @('cdpUrl','courseUrl','courseName')) {
            if ($null -ne $userConfig.$key) { $courseConfig[$key] = $userConfig.$key }
        }
    }
    return $courseConfig
}
