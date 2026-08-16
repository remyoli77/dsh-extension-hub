<#
=============================================================================
 dsh-watchdog.ps1 — DSH Web 进程守护（挂死自动重启）v2
=============================================================================
 功能：
  - 监控 127.0.0.1:3080 上的 dsh web 进程（按端口 + 命令行匹配，PID 变化也能找到）
  - 进程崩溃消失 / HTTP 连续无响应（挂死）/ CPU·内存异常 -> 强制杀掉并自动重启
  - 重启命令自适应：自动沿用当前 dsh 进程的启动方式（生产 bin.js / tsx 开发 bin.ts）
  - 重启统计：状态文件 ~/.dsh/dsh-watchdog-state.json（重启次数/原因/时间/总检查数）
  - 告警：重启时系统弹窗 + 响铃 + 可选 Webhook（JSON POST）
  - 防失控：窗口内重启次数超限（默认 30 分钟 5 次）即停止自动重启并告警
  - 重启冷却（防抖）+ 启动宽限期 + 单实例保护 + 心跳日志 + 日志轮转

 用法：
  powershell -NoProfile -ExecutionPolicy Bypass -File dsh-watchdog.ps1          # 前台运行
  powershell -NoProfile -ExecutionPolicy Bypass -File dsh-watchdog.ps1 -MonitorOnly   # 只检测不重启（测试）
  # 自定义参数示例：
  #   -WebhookUrl "https://example.com/hook" -MaxMemoryMB 2048 -FailThreshold 4
=============================================================================
#>
[CmdletBinding()]
param(
  # 监听端口（dsh web 默认 3080）
  [int]$Port = 3080,
  # 健康检查 URL：全部返回响应即视为存活（默认：前端根页 + 扩展中心 API 深层检查）
  [string[]]$HealthUrls = @(
    'http://127.0.0.1:3080/',
    'http://127.0.0.1:3080/api/dsh-extension-hub/skills'
  ),
  # 检查间隔（秒）
  [int]$IntervalSec = 15,
  # 连续失败多少次判定为异常（15s x 3 = 45s 无响应即重启）
  [int]$FailThreshold = 3,
  # 两次重启之间的最小间隔（秒），防抖
  [int]$RestartCooldownSec = 90,
  # 重启后的启动宽限期（秒）：期间只观察不计失败
  [int]$BootGraceSec = 120,
  # 日志文件
  [string]$LogFile = "$env:USERPROFILE\.dsh\dsh-watchdog.log",
  # 状态/统计文件
  [string]$StateFile = "$env:USERPROFILE\.dsh\dsh-watchdog-state.json",
  # 重启命令；留空 = 自动沿用当前 dsh 进程的启动命令（推荐）
  [string]$RestartCommand = '',
  # 可选：CPU 使用率持续超过该百分比（0=关闭），示例 95
  [double]$MaxCpuPercent = 0,
  # 可选：内存（MB）超过该值判定异常（0=关闭），示例 2048
  [int]$MaxMemoryMB = 0,
  # 心跳日志间隔（分钟，0=关闭），用于确认守护本身还活着
  [int]$HeartbeatMinutes = 10,
  # 重启告警 Webhook（可选）：POST JSON {event,title,message,time,port}
  [string]$WebhookUrl = '',
  # 防失控：窗口内最大重启次数（超过则停止自动重启）
  [int]$MaxRestartsPerWindow = 5,
  # 防失控统计窗口（分钟）
  [int]$RestartWindowMinutes = 30,
  # 关闭系统弹窗告警（msg）
  [switch]$NoPopup,
  # 只监控不重启（用于测试）
  [switch]$MonitorOnly,
  # 进程命令行匹配正则（确认监听端口的进程是 dsh web；兼容生产 dsh 与 tsx 开发模式）
  [string]$ProcessMatch = 'dsh|tsx|bin\.ts',
  # 告警 toast 的鲸鱼娘图片（留空 = 自动从 dsh-pet 资产定位）
  [string]$ToastImage = ''
)

$ErrorActionPreference = 'Continue'
$cpuSampleWindowSec = 6   # CPU 采样窗口（秒）
$logMaxBytes = 1MB        # 日志轮转阈值
$devCheckoutCandidates = @('C:\Users\User\deepseek-harness', 'C:\77\codex工作区\deepseek-harness')

# ── 单实例保护：已有守护实例则退出 ───────────────────────────────────────────
# 仅当存在 "powershell -File ...dsh-watchdog.ps1" 形式的真实守护进程时才退出；
# 排除命令行含 -Command 的进程（终端/工具宿主可能只是提到了脚本路径）。
$existing = Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -match 'dsh-watchdog\.ps1' -and $_.CommandLine -notmatch '\-Command' }
if ($existing) {
  Write-Host "[dsh-watchdog] 已有实例运行（PID $($existing.ProcessId -join ','))，本实例退出"
  exit 0
}

function Write-Log([string]$msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Write-Host $line
  try {
    if (Test-Path $LogFile) {
      $size = (Get-Item $LogFile -ErrorAction SilentlyContinue).Length
      if ($size -gt $logMaxBytes) {
        Remove-Item "$LogFile.old" -Force -ErrorAction SilentlyContinue
        Rename-Item $LogFile "$LogFile.old" -ErrorAction SilentlyContinue
      }
    }
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
  } catch { }
}

# ── 状态文件（统计持久化）───────────────────────────────────────────────────
function Read-WatchdogState {
  try {
    $s = Get-Content $StateFile -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    if ($null -eq $s.startTime) { $s.startTime = (Get-Date).ToString('o') }
    return $s
  } catch { }
  return [pscustomobject]@{
    startTime       = (Get-Date).ToString('o')
    restartCount    = 0
    lastRestartAt   = $null
    lastRestartReason = ''
    totalChecks     = 0
    lastHealthyAt   = $null
    restarts        = @()
  }
}

function Save-WatchdogState($s) {
  try {
    $json = $s | ConvertTo-Json -Depth 6
    [System.IO.File]::WriteAllText($StateFile, $json, [System.Text.UTF8Encoding]::new($false))
  } catch { }
}

# ── 主题识别：读取 DSH 主题偏好（system 时回退 Windows 系统主题）──────────────
function Get-ThemePreference {
  try {
    $yamlPath = Join-Path $env:USERPROFILE '.dsh\settings.yaml'
    if (Test-Path $yamlPath) {
      $yaml = Get-Content $yamlPath -Raw -ErrorAction Stop
      if ($yaml -match 'preference:\s*(\S+)') {
        $pref = $Matches[1].ToLower()
        if ($pref -eq 'light') { return 'light' }
        if ($pref -eq 'dark') { return 'dark' }
      }
    }
  } catch { }
  # system / 未知 → 跟随 Windows 应用主题
  try {
    $v = Get-ItemPropertyValue -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -Name 'AppsUseLightTheme' -ErrorAction Stop
    if ($v -eq 0) { return 'dark' }
    return 'light'
  } catch { return 'dark' }
}

# ── 鲸鱼娘图片自动定位（优先女仆工坊皮肤立绘，dsh-pet 动画兜底）──────────────
function Get-WhaleImage {
  if ($ToastImage -and (Test-Path $ToastImage)) { return $ToastImage }
  # 1) 插件自带立绘（tools/assets/，透明背景 PNG）
  foreach ($name in @('maid-right.png', 'maid-left.png')) {
    $cand = Join-Path $PSScriptRoot "assets\$name"
    if (Test-Path $cand) { return $cand }
  }
  # 2) dsh-pet 桌面宠物动画兜底
  $roots = @()
  $profiles = Join-Path $env:USERPROFILE '.dsh\profiles'
  if (Test-Path $profiles) {
    $roots += Get-ChildItem $profiles -Directory -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName 'node_modules\@linxin666\dsh-pet\assets\whale\previews' }
  }
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    foreach ($prefer in @('waving.gif', 'idle.gif', 'review.gif')) {
      $cand = Join-Path $root $prefer
      if (Test-Path $cand) { return $cand }
    }
    $first = Get-ChildItem $root -Filter '*.gif' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($first) { return $first.FullName }
  }
  return ''
}

# ── 告警：静默角落 toast（鲸鱼娘）+ 柔和响铃 + Webhook ───────────────────────
function Send-Alert([string]$title, [string]$message) {
  Write-Log "告警: $title - $message"
  if (-not $NoPopup) {
    try {
      $toast = Join-Path $PSScriptRoot 'dsh-toast.ps1'
      if (Test-Path $toast) {
        $theme = Get-ThemePreference
        $payload = @{
          title       = $title
          message     = $message
          theme       = $theme
          image       = Get-WhaleImage
          durationSec = 8
          corner      = 4
        } | ConvertTo-Json
        $payloadFile = Join-Path $env:TEMP ('dsh-toast-' + [guid]::NewGuid().ToString('N') + '.json')
        [System.IO.File]::WriteAllText($payloadFile, $payload, [System.Text.UTF8Encoding]::new($false))
        Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $toast, '-PayloadFile', $payloadFile) -WindowStyle Hidden -ErrorAction Stop
      }
    } catch { }
  }
  try { [console]::beep(880, 180); Start-Sleep -Milliseconds 120; [console]::beep(660, 180) } catch { }
  if ($WebhookUrl) {
    try {
      $body = @{ event = 'dsh-watchdog-alert'; title = $title; message = $message; time = (Get-Date).ToString('o'); port = $Port } | ConvertTo-Json
      Invoke-RestMethod -Uri $WebhookUrl -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 5 -ErrorAction Stop | Out-Null
    } catch {
      Write-Log "Webhook 发送失败: $($_.Exception.Message)"
    }
  }
}

# 找到监听 $Port 且命令行匹配 $ProcessMatch 的进程 ID（防止误杀占用端口的其他程序）
function Get-DshListenerPid {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $conn) { return $null }
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)" -ErrorAction Stop
    if ($proc -and $proc.CommandLine -match $ProcessMatch) { return [int]$conn.OwningProcess }
  } catch { }
  return $null
}

# 解析当前 dsh 进程的启动方式，返回 @{ Command; WorkingDirectory } 或 $null
function Get-RestartSpec {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $conn) { return $null }
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)" -ErrorAction Stop
    if (-not $proc -or [string]::IsNullOrWhiteSpace($proc.CommandLine)) { return $null }
    $cmdline = $proc.CommandLine.Trim()
    if ($cmdline -match 'bin\.js') {
      return @{ Command = $cmdline; WorkingDirectory = $env:USERPROFILE }
    }
    if ($cmdline -match 'bin\.ts') {
      foreach ($root in $devCheckoutCandidates) {
        if (Test-Path (Join-Path $root 'apps\cli\src\bin.ts')) {
          return @{ Command = 'node --import tsx/esm apps\cli\src\bin.ts web'; WorkingDirectory = $root }
        }
      }
    }
  } catch { }
  return $null
}

# 所有健康 URL 都返回响应 = 存活（超时/连接失败 = 不健康）
function Test-Health {
  foreach ($url in $HealthUrls) {
    if ([string]::IsNullOrWhiteSpace($url)) { continue }
    try {
      $resp = Invoke-WebRequest -Uri $url -TimeoutSec 8 -UseBasicParsing -ErrorAction Stop
      if ($null -eq $resp) { return $false }
    } catch {
      return $false
    }
  }
  return $true
}

# 采样进程 CPU 使用率（%）
function Get-CpuPercent([int]$procId) {
  try {
    $p1 = Get-Process -Id $procId -ErrorAction Stop
    $c1 = $p1.CPU
    Start-Sleep -Seconds $cpuSampleWindowSec
    $p2 = Get-Process -Id $procId -ErrorAction Stop
    $c2 = $p2.CPU
    if ($null -eq $c1 -or $null -eq $c2) { return 0 }
    $delta = $c2 - $c1
    if ($delta -lt 0) { return 0 }
    return [math]::Round(($delta / $cpuSampleWindowSec) * 100, 1)
  } catch { return 0 }
}

# 内存（MB）
function Get-MemoryMB([int]$procId) {
  try {
    $p = Get-Process -Id $procId -ErrorAction Stop
    if ($null -eq $p.WorkingSet64) { return 0 }
    return [math]::Round($p.WorkingSet64 / 1MB, 1)
  } catch { return 0 }
}

# 记录一次重启：更新统计 + 判断是否触发防失控
function Register-Restart([string]$reason) {
  $script:state.restartCount = [int]$script:state.restartCount + 1
  $script:state.lastRestartAt = (Get-Date).ToString('o')
  $script:state.lastRestartReason = $reason
  $arr = @($script:state.restarts)
  $arr += (Get-Date).ToString('o')
  if ($arr.Count -gt 30) { $arr = $arr | Select-Object -Last 30 }
  $script:state.restarts = $arr
  Save-WatchdogState $script:state

  $windowStart = (Get-Date).AddMinutes(-$RestartWindowMinutes)
  $recent = @($arr | Where-Object { try { [datetime]$_ -ge $windowStart } catch { $false } })
  if ($recent.Count -ge $MaxRestartsPerWindow) {
    $script:stopRestarting = $true
    Send-Alert 'dsh-watchdog 防失控' "窗口 $RestartWindowMinutes 分钟内重启达 $recent.Count 次（上限 $MaxRestartsPerWindow），已停止自动重启，请人工检查！日志: $LogFile"
    Write-Log "!! 防失控触发：$RestartWindowMinutes 分钟内重启 $recent.Count 次，停止自动重启"
  } else {
    Send-Alert 'dsh-watchdog 已重启 dsh' "原因: $reason（累计第 $($script:state.restartCount) 次重启）"
  }
}

# 重启 dsh web（hidden；优先沿用原启动命令）
# 启动命令的 stdout/stderr 重定向到 ~/.dsh/dsh-watchdog-restart.{out,err}.log，
# 重启失败时（进程没起来/立刻崩溃）可在 err log 里看到 node 的真实报错。
function Restart-Dsh {
  if ($MonitorOnly) {
    $spec = $script:RestartSpec
    $cmd = if ($spec) { $spec.Command } else { if ($RestartCommand) { $RestartCommand } else { 'dsh web' } }
    Write-Log "[MonitorOnly] 将重启: $cmd（已跳过）"
    return
  }
  $outLog = Join-Path $env:USERPROFILE '.dsh\dsh-watchdog-restart.out.log'
  $errLog = Join-Path $env:USERPROFILE '.dsh\dsh-watchdog-restart.err.log'
  Remove-Item $outLog, $errLog -Force -ErrorAction SilentlyContinue
  try {
    $spec = $script:RestartSpec
    if ($spec -and $spec.Command) {
      Write-Log "重启中(沿用原命令): $($spec.Command)  [cwd=$($spec.WorkingDirectory)]"
      Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $spec.Command) -WorkingDirectory $spec.WorkingDirectory -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -ErrorAction Stop
    } elseif ($RestartCommand) {
      Write-Log "重启中: $RestartCommand"
      Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $RestartCommand) -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -ErrorAction Stop
    } else {
      Write-Log '重启中(默认): dsh web'
      Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'dsh web') -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -ErrorAction Stop
    }
    Write-Log '重启命令已启动'
  } catch {
    Write-Log "重启失败: $($_.Exception.Message)"
  }
}

function Stop-Dsh([int]$procId) {
  if ($MonitorOnly) { Write-Log "[MonitorOnly] 将杀进程 $procId（已跳过）"; return }
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
    Write-Log "已强制终止进程 $procId"
  } catch {
    Write-Log "杀进程失败: $($_.Exception.Message)"
  }
}

# ── 启动 ─────────────────────────────────────────────────────────────────────
$state = Read-WatchdogState
Save-WatchdogState $state   # 启动即落盘一次，界面可立即读到统计
$script:stopRestarting = $false

Write-Log "=============================================================="
Write-Log "dsh-watchdog v2 启动: port=$Port interval=${IntervalSec}s threshold=$FailThreshold cooldown=${RestartCooldownSec}s bootGrace=${BootGraceSec}s heartbeat=${HeartbeatMinutes}min monitorOnly=$MonitorOnly"
Write-Log "健康检查: $($HealthUrls -join ' | ')"
Write-Log "异常阈值: cpu>=$MaxCpuPercent% mem>=$MaxMemoryMB MB (0=关闭) | 防失控: $MaxRestartsPerWindow 次/$RestartWindowMinutes 分钟"
Write-Log "历史统计: 累计重启 $($state.restartCount) 次，最近一次: $($state.lastRestartAt) ($($state.lastRestartReason))"

$script:RestartSpec = Get-RestartSpec
if ($script:RestartSpec) { Write-Log "重启方式(自动): $($script:RestartSpec.Command)  [cwd=$($script:RestartSpec.WorkingDirectory)]" }
elseif ($RestartCommand) { Write-Log "重启方式(指定): $RestartCommand" }
else { Write-Log '重启方式(默认): dsh web' }

$lastRestartAt = [datetime]::MinValue
$fail = 0
$cpuStreak = 0
$nextHeartbeat = [datetime]::Now.AddMinutes($HeartbeatMinutes)

while ($true) {
  try {
    $now = [datetime]::Now
    $state.totalChecks = [int]$state.totalChecks + 1

    if ($script:stopRestarting) {
      # 防失控状态：只记录，不再重启
      Start-Sleep -Seconds $IntervalSec
      continue
    }

    $procIdNow = Get-DshListenerPid

    if (-not $procIdNow) {
      # 端口无监听：进程崩溃或没起来
      $inGrace = ($lastRestartAt -ne [datetime]::MinValue) -and (($now - $lastRestartAt).TotalSeconds -lt $BootGraceSec)
      if ($inGrace) {
        Write-Log "端口 $Port 无监听（启动宽限期内，等待）"
        $fail = 0
      } else {
        $fail++
        if ($fail -ge $FailThreshold) {
          $cooldownOk = ($lastRestartAt -eq [datetime]::MinValue) -or (($now - $lastRestartAt).TotalSeconds -ge $RestartCooldownSec)
          if ($cooldownOk) {
            Write-Log "检测到 dsh 未运行（连续 $fail 次无监听），准备重启"
            Register-Restart '进程未运行（崩溃或未启动）'
            Restart-Dsh
            $lastRestartAt = [datetime]::Now
            $fail = 0
          } else {
            Write-Log "无监听但处于重启冷却期，等待"
          }
        } else {
          Write-Log "端口 $Port 无监听（$fail/$FailThreshold）"
        }
      }
      Start-Sleep -Seconds $IntervalSec
      continue
    }

    # 刷新重启方式（进程可能在运行中被换过模式）
    $script:RestartSpec = Get-RestartSpec

    # 进程在：健康检查
    $healthy = Test-Health
    if (-not $healthy) {
      $inGrace = ($lastRestartAt -ne [datetime]::MinValue) -and (($now - $lastRestartAt).TotalSeconds -lt $BootGraceSec)
      if ($inGrace) {
        Write-Log "健康检查未通过但处于启动宽限期（等待，进程 $procIdNow）"
        $fail = 0
      } else {
        $fail++
        Write-Log "健康检查失败（$fail/$FailThreshold），进程 $procIdNow"
        if ($fail -ge $FailThreshold) {
          $cooldownOk = (($now - $lastRestartAt).TotalSeconds -ge $RestartCooldownSec)
          if ($cooldownOk) {
            Write-Log "判定进程 $procIdNow 挂死/无响应，杀进程并重启"
            Stop-Dsh $procIdNow
            Start-Sleep -Seconds 5
            Register-Restart "挂死/无响应（HTTP 连续 $FailThreshold 次失败）"
            Restart-Dsh
            $lastRestartAt = [datetime]::Now
            $fail = 0
          } else {
            Write-Log "挂死但处于重启冷却期，等待"
          }
        }
      }
    } else {
      # 健康：可选资源异常检测
      $abnormal = $false
      if ($MaxCpuPercent -gt 0) {
        $cpu = Get-CpuPercent $procIdNow
        if ($cpu -ge $MaxCpuPercent) {
          $cpuStreak++
          if ($cpuStreak -ge 2) { Write-Log "CPU 异常偏高 $cpu% ×$cpuStreak（进程 $procIdNow）"; $abnormal = $true }
        } else { $cpuStreak = 0 }
      }
      if (-not $abnormal -and $MaxMemoryMB -gt 0) {
        $mem = Get-MemoryMB $procIdNow
        if ($mem -gt $MaxMemoryMB) { Write-Log "内存异常 $mem MB > $MaxMemoryMB（进程 $procIdNow）"; $abnormal = $true }
      }
      if ($abnormal) {
        $cooldownOk = ($lastRestartAt -eq [datetime]::MinValue) -or (($now - $lastRestartAt).TotalSeconds -ge $RestartCooldownSec)
        if ($cooldownOk) {
          Write-Log "资源异常，杀进程并重启（进程 $procIdNow）"
          Stop-Dsh $procIdNow
          Start-Sleep -Seconds 5
          Register-Restart '资源异常（CPU/内存超限）'
          Restart-Dsh
          $lastRestartAt = [datetime]::Now
          $fail = 0
          $cpuStreak = 0
        } else {
          Write-Log "资源异常但处于重启冷却期，等待"
        }
      } else {
        if ($fail -gt 0) { Write-Log "恢复正常（重置失败计数）" }
        $fail = 0
        $state.lastHealthyAt = $now.ToString('o')
        if ($HeartbeatMinutes -gt 0 -and $now -ge $nextHeartbeat) {
          Write-Log "健康（进程 $procIdNow），守护运行中 | 统计: 检查 $($state.totalChecks) 次，累计重启 $($state.restartCount) 次，最近: $($state.lastRestartReason)"
          $nextHeartbeat = $now.AddMinutes($HeartbeatMinutes)
        }
      }
    }
  } catch {
    Write-Log "守护循环异常: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $IntervalSec
}
