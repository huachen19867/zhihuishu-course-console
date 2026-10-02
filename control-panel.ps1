param([switch]$SmokeTest)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$projectPath = $PSScriptRoot
$runtimePath = Join-Path $projectPath 'runtime'
function Read-SharedJson($filePath) {
    $stream = $null
    $reader = $null
    try {
        $shareMode = [System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete
        $stream = [System.IO.File]::Open($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, $shareMode)
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8, $true)
        return ($reader.ReadToEnd() | ConvertFrom-Json -ErrorAction Stop)
    } finally {
        if ($reader) { $reader.Dispose() } elseif ($stream) { $stream.Dispose() }
    }
}
$script:launcher = $null
$script:notice = ''
$script:homeworkLauncher = $null
$script:masteryLauncher = $null
$script:masteryNotice = ''
$script:portalLauncher = $null
$form = New-Object System.Windows.Forms.Form
$form.Text = '智慧树课程控制台'
$form.ClientSize = New-Object System.Drawing.Size(650, 780)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(245,247,250)
$form.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',10)
$heading = New-Object System.Windows.Forms.Label
$heading.Text = '智慧树课程照看'
$heading.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',18,[System.Drawing.FontStyle]::Bold)
$heading.SetBounds(24,20,590,40)
$form.Controls.Add($heading)
$status = New-Object System.Windows.Forms.Label
$status.SetBounds(24,72,595,30)
$form.Controls.Add($status)
$details = New-Object System.Windows.Forms.Label
$details.SetBounds(24,110,595,70)
$form.Controls.Add($details)
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = '启动课程观看'
$startButton.SetBounds(24,185,180,46)
$startButton.BackColor = [System.Drawing.Color]::FromArgb(220,245,230)
$form.Controls.Add($startButton)
$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = '停止课程观看'
$stopButton.SetBounds(220,185,180,46)
$form.Controls.Add($stopButton)
$durationButton = New-Object System.Windows.Forms.Button
$durationButton.Text = '自动刷课30分钟'
$durationButton.SetBounds(416,185,200,46)
$durationButton.BackColor = [System.Drawing.Color]::FromArgb(232,235,255)
$form.Controls.Add($durationButton)
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.SetBounds(24,502,595,165)
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = 'Vertical'
$logBox.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($logBox)
$footer = New-Object System.Windows.Forms.Label
$footer.Text = '停止只停止自动操作。关闭控制台不会停止后台或关闭浏览器。'
$footer.SetBounds(24,688,600,28)
$footer.ForeColor = [System.Drawing.Color]::DimGray
$form.Controls.Add($footer)
$homeworkLabel = New-Object System.Windows.Forms.Label
$homeworkLabel.SetBounds(24,248,595,90)
$form.Controls.Add($homeworkLabel)
$homeworkStart = New-Object System.Windows.Forms.Button
$homeworkStart.Text = '启动单元测试'
$homeworkStart.SetBounds(24,342,180,46)
$form.Controls.Add($homeworkStart)
$homeworkStop = New-Object System.Windows.Forms.Button
$homeworkStop.Text = '停止单元测试'
$homeworkStop.SetBounds(220,342,180,46)
$form.Controls.Add($homeworkStop)
foreach ($control in $form.Controls) { $control.Top += 60 }
$portalButton = New-Object System.Windows.Forms.Button
$portalButton.Text = '启动智慧树'
$portalButton.SetBounds(24,16,180,44)
$form.Controls.Add($portalButton)
$portalHint = New-Object System.Windows.Forms.Label
$portalHint.Text = '打开智慧树，登录后自行选择课程'
$portalHint.SetBounds(220,27,400,28)
$form.Controls.Add($portalHint)
$masteryLabel = New-Object System.Windows.Forms.Label
$masteryLabel.SetBounds(24,462,595,46)
$masteryLabel.AutoEllipsis = $true
$form.Controls.Add($masteryLabel)
$masteryStart = New-Object System.Windows.Forms.Button
$masteryStart.Text = '启动掌握度测试'
$masteryStart.SetBounds(24,512,180,46)
$form.Controls.Add($masteryStart)
$masteryStop = New-Object System.Windows.Forms.Button
$masteryStop.Text = '停止掌握度测试'
$masteryStop.SetBounds(220,512,180,46)
$form.Controls.Add($masteryStop)
function Get-MasteryWorker {
    try {
        $workerPid = [int]([System.IO.File]::ReadAllText((Join-Path $runtimePath 'mastery/worker.pid')).Trim())
        $worker = Get-CimInstance Win32_Process -Filter "ProcessId = $workerPid" -ErrorAction Stop
        if ($worker -and $worker.Name -eq 'node.exe' -and $worker.CommandLine -like '*mastery*auto.cjs*') { return $worker }
    } catch {}
    return $null
}
function Get-HomeworkWorker {
    try {
        $workerPid = [int]([System.IO.File]::ReadAllText((Join-Path $runtimePath 'homework/worker.pid')).Trim())
        $worker = Get-CimInstance Win32_Process -Filter "ProcessId = $workerPid" -ErrorAction Stop
        if ($worker -and $worker.Name -eq 'node.exe' -and $worker.CommandLine -like '*homework*auto.cjs*') { return $worker }
    } catch {}
    return $null
}
function Get-Watcher {
    $pidPath = Join-Path $runtimePath 'watcher.pid'
    if (-not (Test-Path -LiteralPath $pidPath)) { return $null }
    try {
        $watchPid = [int]([System.IO.File]::ReadAllText($pidPath).Trim())
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $watchPid" -ErrorAction Stop
        if ($process -and $process.Name -eq 'node.exe' -and $process.CommandLine.Contains((Join-Path $projectPath 'watch-course.cjs'))) { return $process }
    } catch {}
    return $null
}
function Update-Panel {
    if ($script:portalLauncher) {
        $script:portalLauncher.Refresh()
        if ($script:portalLauncher.HasExited) {
            $script:portalLauncher.WaitForExit()
            if ($script:portalLauncher.ExitCode -ne 0) {
                $script:notice = '启动智慧树失败：'
                try { $script:notice += [System.IO.File]::ReadAllText((Join-Path $runtimePath 'portal-launch.stderr.log')).Trim() } catch {}
            } else { $script:notice = '智慧树已打开，进入目标课程视频页后点击启动课程观看。' }
            $script:portalLauncher.Dispose(); $script:portalLauncher = $null
        }
    }
    $portalButton.Enabled = -not $script:portalLauncher
    $homeworkWorker = Get-HomeworkWorker
    $homeworkState = $null
    try { $homeworkState = Read-SharedJson (Join-Path $runtimePath 'homework/status.json') } catch {}
    if ($script:homeworkLauncher) {
        $script:homeworkLauncher.Refresh()
        if ($script:homeworkLauncher.HasExited) {
            $script:homeworkLauncher.WaitForExit()
            if ($script:homeworkLauncher.ExitCode -ne 0) {
                $script:notice = '单元测试启动失败：'
                try { $script:notice += [System.IO.File]::ReadAllText((Join-Path $runtimePath 'homework-launch.stderr.log')).Trim() } catch { $script:notice += '请查看启动日志。' }
            } else { $script:notice = '' }
            $script:homeworkLauncher.Dispose(); $script:homeworkLauncher=$null
        }
    }
    $homeworkText = '单元测试：未运行（先在 Edge 打开单元测试列表）'
    $homeworkStopping = $homeworkWorker -and (Test-Path -LiteralPath (Join-Path $runtimePath 'homework/STOP'))
    if ($homeworkStopping) { $homeworkText = '单元测试：正在停止，当前分析完成后停止操作' }
    elseif ($homeworkWorker) {
        $phase = switch ($homeworkState.stage) { 'waiting-verification' {'等待你手动完成人机验证'} 'opening' {'打开作业'} 'solving' {'集中分析答案'} 'answering' {'填写并保存'} 'recovering' {'刷新恢复页面'} 'submitting' {'提交并核验成绩'} 'submitted' {'已提交，继续下一份'} default {'运行中'} }
        $homeworkText = '单元测试：'+$phase+'  '+$homeworkState.unit
    } elseif ($script:homeworkLauncher) { $homeworkText = '单元测试：正在启动' }
    elseif ($homeworkState.stage -eq 'complete') { $homeworkText = '单元测试：全部未提交单元作业已完成' }
    elseif ($homeworkState.stage -eq 'error') { $homeworkText = '单元测试已停止：'+$homeworkState.message.Split("`n")[0].Substring(0,[Math]::Min(150,$homeworkState.message.Split("`n")[0].Length)) }
    elseif ($homeworkState.stage -eq 'stopped') {
        $homeworkText = '单元测试：已停止'
        if ($homeworkState.message) { $homeworkText += '；' + $homeworkState.message.Split("`n")[0] }
    }
    if ($homeworkState.completed) { $homeworkText += "`r`n已提交：" + $homeworkState.completed.Count + ' 份；最新：' + $homeworkState.completed[-1].unit + ' / ' + $homeworkState.completed[-1].score + ' 分' }
    $homeworkLabel.Text = $homeworkText
    $homeworkStart.Enabled = (-not $homeworkWorker) -and (-not $script:homeworkLauncher)
    $homeworkStop.Enabled = [bool]$homeworkWorker -and (-not $homeworkStopping)
    $masteryWorker = Get-MasteryWorker
    $masteryState = $null
    try { $masteryState = Read-SharedJson (Join-Path $runtimePath 'mastery/status.json') } catch {}
    if ($script:masteryLauncher) {
        $script:masteryLauncher.Refresh()
        if ($script:masteryLauncher.HasExited) {
            $script:masteryLauncher.WaitForExit()
            if ($script:masteryLauncher.ExitCode -ne 0) {
                $script:masteryNotice = '掌握度测试启动失败：'
                try { $script:masteryNotice += [System.IO.File]::ReadAllText((Join-Path $runtimePath 'mastery-launch.stderr.log')).Trim() } catch { $script:masteryNotice += '请查看启动日志。' }
            }
            $script:masteryLauncher.Dispose(); $script:masteryLauncher = $null
        }
    }
    $masteryText = '掌握度测试：未运行（先在 Edge 打开目标课程）'
    $masteryStopping = $masteryWorker -and (Test-Path -LiteralPath (Join-Path $runtimePath 'mastery/STOP'))
    if ($masteryStopping) { $masteryText = '掌握度测试：正在停止，等待当前操作结束' }
    elseif ($masteryWorker) {
        $phase = switch ($masteryState.stage) {
            'opening' {'打开掌握度测试'} 'reading' {'读取题目'} 'solving' {'集中分析答案'}
            'answering' {'填写答案'} 'submitting' {'提交并核验'} 'result' {'读取测试结果'}
            'returning' {'返回测试列表'} 'waiting-verification' {'等待你手动完成人机验证'}
            'complete' {'全部测试已完成'} 'error' {'遇到异常'} 'stopped' {'已停止'} default {'运行中'}
        }
        $masteryText = '掌握度测试：' + $phase
        if ($masteryState.unit) { $masteryText += '  ' + $masteryState.unit }
    } elseif ($script:masteryLauncher) { $masteryText = '掌握度测试：正在启动' }
    elseif ($script:masteryNotice) { $masteryText = $script:masteryNotice.Split("`n")[0] }
    elseif ($masteryState.stage -eq 'complete') { $masteryText = '掌握度测试：全部测试已完成' }
    elseif ($masteryState.stage -eq 'error') { $masteryText = '掌握度测试：已停止，需要处理异常' }
    elseif ($masteryState.stage -eq 'stopped') { $masteryText = '掌握度测试：已停止' }
    $masteryDetails = ''
    if ($masteryState.completed) { $masteryDetails = '已完成：' + @($masteryState.completed).Count + ' 份' }
    if ($masteryState.message) {
        if ($masteryDetails) { $masteryDetails += '；' }
        $masteryDetails += ([string]$masteryState.message).Split("`n")[0].Trim()
    }
    if ($masteryDetails) { $masteryText += "`r`n" + $masteryDetails }
    $masteryLabel.Text = $masteryText
    $masteryStart.Enabled = (-not $masteryWorker) -and (-not $script:masteryLauncher)
    $masteryStop.Enabled = [bool]$masteryWorker -and (-not $masteryStopping)
    $watcher = Get-Watcher
    $state = $null
    try { $state = Read-SharedJson (Join-Path $runtimePath 'status.json') } catch {}
    if ($script:launcher) {
        $script:launcher.Refresh()
        if ($script:launcher.HasExited) {
            $script:launcher.WaitForExit()
            if ($script:launcher.ExitCode -ne 0) {
                $script:notice = '启动课程观看失败：'
                try { $script:notice += [System.IO.File]::ReadAllText((Join-Path $runtimePath 'console-launch.stderr.log')).Trim() } catch { $script:notice += '请查看启动日志。' }
            } else { $script:notice = '' }
            $script:launcher.Dispose()
            $script:launcher = $null
        }
    }
    $stopping = $watcher -and (Test-Path -LiteralPath (Join-Path $runtimePath 'STOP'))
    if ($stopping) {
        $status.Text = '正在停止，等待当前操作结束（最多约一分钟）'
        $status.ForeColor = [System.Drawing.Color]::DarkOrange
    } elseif ($watcher) {
        $status.Text = '运行中'
        if ($state.waitingForCourse) { $status.Text = '等待登录并打开课程：' + $state.courseName }
        elseif ($state.waitingVerification) { $status.Text = '等待你手动完成人机验证；完成后自动继续' }
        elseif ($state.waitingCompletion) { $status.Text = '视频已播完，等待网站更新学习完成标记' }
        elseif ($state.question) { $status.Text = '正在处理弹题' }
        if ($state.durationMinutesRemaining -gt 0) { $status.Text += '（定时剩余约 ' + $state.durationMinutesRemaining + ' 分钟）' }
        $status.ForeColor = [System.Drawing.Color]::ForestGreen
    } elseif ($script:launcher) {
        $status.Text = '正在启动浏览器和照看程序……'
        $status.ForeColor = [System.Drawing.Color]::DarkOrange
    } elseif ($state.complete) {
        $status.Text = '课程视频已全部完成'
        $status.ForeColor = [System.Drawing.Color]::ForestGreen
    } else {
        $status.Text = '已停止'
        if ($state.needsAttention) { $status.Text = '已停止，需要处理异常' }
        $status.ForeColor = [System.Drawing.Color]::Firebrick
    }
    $startButton.Enabled = (-not $watcher) -and (-not $script:launcher)
    $stopButton.Enabled = [bool]$watcher -and (-not $stopping)
    $durationButton.Enabled = (-not $watcher) -and (-not $script:launcher)
    if ($state.timedCompletion) { $status.Text = '30分钟自动刷课时间已到，已停止'; $status.ForeColor = [System.Drawing.Color]::DarkOrange }
    $detailText = ''
    if ($state.title) { $detailText = '当前视频：' + $state.title }
    if ($null -ne $state.pending) { $detailText += "`r`n未完成：" + $state.pending + ' 节' }
    if ($state.video) {
        $detailText += '    倍速：' + $state.video.rate
        $detailText += '    静音：' + $(if($state.video.muted -or $state.video.volume -eq 0){'是'}else{'否'})
        $detailText += "`r`n播放进度：" + [TimeSpan]::FromSeconds([double]$state.video.time).ToString('mm\:ss')
        if ($state.video.paused) { $detailText += '（暂停）' }
    }
    $details.Text = $detailText
    $text = $script:notice
    if (-not $watcher -and $state.needsAttention) { $text += "`r`n停止原因：" + $state.message }
    try {
        $events = Get-Content -LiteralPath (Join-Path $runtimePath 'events.ndjson') -Tail 5 | ForEach-Object {
            $entry = $_ | ConvertFrom-Json
            $label = switch ($entry.kind) {
                'started' {'后台已启动'} 'playing' {'当前视频：'+$entry.title}
                'next-video' {'切换视频：'+$entry.title} 'resumed' {'已确认开始播放'}
                'answer-request' {'正在请求答案'} 'answered' {'已选择答案：'+($entry.answer -join ', ')}
                'question-closed' {'答题弹窗已关闭'} 'stopped' {'自动操作已停止'}
                'waiting-verification' {'等待手动人机验证'} 'verification-cleared' {'验证已消失，继续操作'}
                'complete' {'课程视频已全部完成'} 'needs-attention' {'程序已停止：'+$entry.message.Split("`n")[0]}
                default {$entry.kind}
            }
            ([DateTimeOffset]::Parse($entry.at).ToLocalTime().ToString('HH:mm:ss')) + '  ' + $label
        }
        $text += "`r`n" + ($events -join "`r`n")
    } catch {}
    $logBox.Text = $text.Trim()
}
$startButton.Add_Click({
    try {
        New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
        $script:notice = ''
        $script:launcher = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe') -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $projectPath 'start-watcher.ps1') + '"') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'console-launch.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'console-launch.stderr.log')
        Update-Panel
    } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'启动失败') | Out-Null }
})
$portalButton.Add_Click({
    try {
        New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
        $script:portalLauncher = Start-Process -FilePath 'node.exe' -ArgumentList ('"' + (Join-Path $projectPath 'launcher.cjs') + '" portal') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'portal-launch.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'portal-launch.stderr.log')
        Update-Panel
    } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'启动智慧树失败') | Out-Null }
})
$stopButton.Add_Click({
    try {
        New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
        [System.IO.File]::WriteAllText((Join-Path $runtimePath 'STOP'),'')
        $script:notice = '已发出停止请求。当前视频和浏览器会保留。'
        Update-Panel
    } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'停止失败') | Out-Null }
})
$durationButton.Add_Click({
    try {
        New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
        $script:notice = ''
        $script:launcher = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe') -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $projectPath 'start-watcher.ps1') + '" -DurationMinutes 30') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'console-launch.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'console-launch.stderr.log')
        $script:notice = '定时刷课已启动，到30分钟后自动停止。'
        Update-Panel
    } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'定时刷课启动失败') | Out-Null }
})
$homeworkStart.Add_Click({
    try {
        New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
        $script:homeworkLauncher = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe') -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $projectPath 'start-homework.ps1')+'"') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'homework-launch.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'homework-launch.stderr.log')
        Update-Panel
    } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'单元测试启动失败') | Out-Null }
})
$homeworkStop.Add_Click({
    New-Item -ItemType Directory -Path (Join-Path $runtimePath 'homework') -Force | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $runtimePath 'homework/STOP'),'')
    Update-Panel
})
$masteryStart.Add_Click({
    try {
        New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
        $script:masteryNotice = ''
        $script:masteryLauncher = Start-Process -FilePath 'node.exe' -ArgumentList ('"' + (Join-Path $projectPath 'launcher.cjs') + '" mastery') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'mastery-launch.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'mastery-launch.stderr.log')
        Update-Panel
    } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'掌握度测试启动失败') | Out-Null }
})
$masteryStop.Add_Click({
    try {
        New-Item -ItemType Directory -Path (Join-Path $runtimePath 'mastery') -Force | Out-Null
        [System.IO.File]::WriteAllText((Join-Path $runtimePath 'mastery/STOP'),'')
        Update-Panel
    } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'掌握度测试停止失败') | Out-Null }
})
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2000
$timer.Add_Tick({ try { Update-Panel } catch { $status.Text='状态读取失败：'+$_.Exception.Message } })
Update-Panel
if ($SmokeTest) {
    @{portalText=$portalButton.Text;portalTop=$portalButton.Top;headingTop=$heading.Top;status=$status.Text;details=$details.Text;startText=$startButton.Text;stopText=$stopButton.Text;durationText=$durationButton.Text;durationEnabled=$durationButton.Enabled;startEnabled=$startButton.Enabled;stopEnabled=$stopButton.Enabled;homework=$homeworkLabel.Text;homeworkStartEnabled=$homeworkStart.Enabled;homeworkStopEnabled=$homeworkStop.Enabled;mastery=$masteryLabel.Text;masteryStartText=$masteryStart.Text;masteryStopText=$masteryStop.Text;masteryStartEnabled=$masteryStart.Enabled;masteryStopEnabled=$masteryStop.Enabled;masteryTop=$masteryLabel.Top;masteryStartTop=$masteryStart.Top;panelHeight=$form.ClientSize.Height;logTop=$logBox.Top} | ConvertTo-Json
    $timer.Dispose(); $form.Dispose(); exit 0
}
$timer.Start()
$form.Add_FormClosed({ $timer.Stop(); $timer.Dispose() })
[System.Windows.Forms.Application]::Run($form)
$form.Dispose()
