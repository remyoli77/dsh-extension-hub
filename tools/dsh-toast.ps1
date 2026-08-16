<#
=============================================================================
 dsh-toast.ps1 — 静默角落通知（WPF，随 DSH 主题亮/暗适配）
=============================================================================
 用法（由 dsh-watchdog 调用，勿手动直接运行）：
  powershell -STA -NoProfile -ExecutionPolicy Bypass -File dsh-toast.ps1 -payloadFile <json>

 payload JSON: { "title": "...", "message": "...", "theme": "dark|light",
                 "durationSec": 6, "corner": 4 }
 corner: 1=左上 2=右上 3=左下 4=右下（默认右下）

 特性：无边框、不抢焦点（ShowActivated=false）、不占任务栏、自动淡出关闭、点击即关。
=============================================================================
#>
[CmdletBinding()]
param(
  [string]$PayloadFile = ''
)

Add-Type -AssemblyName PresentationFramework

# ── 读取载荷 ────────────────────────────────────────────────────────────────
$title = 'dsh-watchdog'
$message = ''
$theme = 'dark'
$durationSec = 6
$corner = 4
if ($PayloadFile -and (Test-Path $PayloadFile)) {
  try {
    $p = Get-Content $PayloadFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($p.title) { $title = [string]$p.title }
    if ($p.message) { $message = [string]$p.message }
    if ($p.theme) { $theme = [string]$p.theme }
    if ($p.durationSec) { $durationSec = [int]$p.durationSec }
    if ($p.corner) { $corner = [int]$p.corner }
  } catch { }
}
if ($theme -ne 'light') { $theme = 'dark' }
if ($durationSec -lt 1) { $durationSec = 1 }
if ($durationSec -gt 30) { $durationSec = 30 }

# ── 主题配色（对齐 DSH 亮/暗风格）───────────────────────────────────────────
if ($theme -eq 'light') {
  $bg     = '#FFFFFFFF'
  $fg     = '#FF1A1A1A'
  $muted  = '#FF5F6368'
  $border = '#FFD8D8DC'
  $accent = '#FF2F6FED'
} else {
  $bg     = '#FF202124'
  $fg     = '#FFE8EAED'
  $muted  = '#FF9AA0A6'
  $border = '#FF3C4043'
  $accent = '#FF8AB4F8'
}

$brush = { param($hex) [System.Windows.Media.BrushConverter]::new().ConvertFromString($hex) }

# ── 构建 UI ────────────────────────────────────────────────────────────────
$window = New-Object System.Windows.Window
$window.WindowStyle = [System.Windows.WindowStyle]::None
$window.AllowsTransparency = $true
$window.Background = [System.Windows.Media.Brushes]::Transparent
$window.ShowInTaskbar = $false
$window.Topmost = $true
$window.ShowActivated = $false
$window.SizeToContent = [System.Windows.SizeToContent]::WidthAndHeight

$outer = New-Object System.Windows.Controls.Border
$outer.Background = (& $brush $bg)
$outer.BorderBrush = (& $brush $border)
$outer.BorderThickness = New-Object System.Windows.Thickness(1)
$outer.CornerRadius = New-Object System.Windows.CornerRadius(10)
$outer.Padding = New-Object System.Windows.Thickness(16, 12, 16, 12)
$outer.MaxWidth = 420

$stack = New-Object System.Windows.Controls.StackPanel

$titleText = New-Object System.Windows.Controls.TextBlock
$titleText.Text = $title
$titleText.FontSize = 13
$titleText.FontWeight = [System.Windows.FontWeights]::Bold
$titleText.Foreground = (& $brush $fg)
$stack.Children.Add($titleText) | Out-Null

if ($message) {
  $msgText = New-Object System.Windows.Controls.TextBlock
  $msgText.Text = $message
  $msgText.FontSize = 12
  $msgText.Foreground = (& $brush $muted)
  $msgText.TextWrapping = [System.Windows.TextWrapping]::Wrap
  $msgText.Margin = New-Object System.Windows.Thickness(0, 5, 0, 0)
  $stack.Children.Add($msgText) | Out-Null
}

$outer.Child = $stack
$window.Content = $outer

# ── 角落定位 ────────────────────────────────────────────────────────────────
$window.Measure([System.Windows.Size]::new([double]::PositiveInfinity, [double]::PositiveInfinity))
$w = $window.DesiredSize.Width
$h = $window.DesiredSize.Height
$area = [System.Windows.SystemParameters]::WorkArea
$margin = 16
switch ($corner) {
  1 { $window.Left = $area.Left + $margin;  $window.Top = $area.Top + $margin }
  2 { $window.Left = $area.Right - $w - $margin; $window.Top = $area.Top + $margin }
  3 { $window.Left = $area.Left + $margin;  $window.Top = $area.Bottom - $h - $margin }
  default { $window.Left = $area.Right - $w - $margin; $window.Top = $area.Bottom - $h - $margin }
}

# ── 显示与自动关闭 ──────────────────────────────────────────────────────────
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds($durationSec)
$timer.Add_Tick({ $timer.Stop(); $window.Close() })
$timer.Start()

$window.Add_MouseDown({ try { $window.Close() } catch { } })

$window.ShowDialog()
