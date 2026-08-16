<#
=============================================================================
 dsh-toast.ps1 — 静默角落通知（WinForms + GIF 动画鲸鱼娘，随 DSH 主题亮/暗）
=============================================================================
 用法（由 dsh-watchdog 调用）：
  powershell -STA -NoProfile -ExecutionPolicy Bypass -File dsh-toast.ps1 -PayloadFile <json>

 payload JSON:
  { "title": "...", "message": "...", "theme": "dark|light",
    "image": "c:/path/to/whale.gif",   # 可选：左侧鲸鱼娘动画
    "durationSec": 8, "corner": 4 }
 corner: 1=左上 2=右上 3=左下 4=右下（默认右下）

 特性：GIF 动画、圆角、不抢焦点、不占任务栏、自动关闭、点击即关。
=============================================================================
#>
[CmdletBinding()]
param(
  [string]$PayloadFile = ''
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ── 读取载荷 ────────────────────────────────────────────────────────────────
$title = 'dsh-watchdog'
$message = ''
$theme = 'dark'
$image = ''
$durationSec = 8
$corner = 4
if ($PayloadFile -and (Test-Path $PayloadFile)) {
  try {
    $p = Get-Content $PayloadFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($p.title) { $title = [string]$p.title }
    if ($p.message) { $message = [string]$p.message }
    if ($p.theme) { $theme = [string]$p.theme }
    if ($p.image) { $image = [string]$p.image }
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
} else {
  $bg     = '#FF202124'
  $fg     = '#FFE8EAED'
  $muted  = '#FF9AA0A6'
}

# ── 自定义窗体：不抢焦点 + 圆角 ──────────────────────────────────────────────
if (-not ('ToastForm' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
public class ToastForm : Form {
  public ToastForm() {
    this.FormBorderStyle = FormBorderStyle.None;
    this.ShowInTaskbar = false;
    this.TopMost = true;
    this.StartPosition = FormStartPosition.Manual;
    this.DoubleBuffered = true;
  }
  protected override bool ShowWithoutActivation { get { return true; } }
  public void SetRounded(int radius) {
    int w = this.Width, h = this.Height;
    using (GraphicsPath p = new GraphicsPath()) {
      p.AddArc(0, 0, radius, radius, 180, 90);
      p.AddArc(w - radius, 0, radius, radius, 270, 90);
      p.AddArc(w - radius, h - radius, radius, radius, 0, 90);
      p.AddArc(0, h - radius, radius, radius, 90, 90);
      p.CloseFigure();
      this.Region = new Region(p);
    }
  }
}
'@
}

$cvt = { param($hex) [System.Drawing.ColorTranslator]::FromHtml($hex) }

$form = New-Object ToastForm
$form.BackColor = (& $cvt $bg)
$form.ClientSize = New-Object System.Drawing.Size(432, 152)

# ── 左侧：鲸鱼娘立绘（全身，透明背景）────────────────────────────────────────
$pic = New-Object System.Windows.Forms.PictureBox
$pic.Location = New-Object System.Drawing.Point(10, 8)
$pic.Size = New-Object System.Drawing.Size(104, 136)
$pic.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
if ($image -and (Test-Path $image)) {
  try { $pic.Image = [System.Drawing.Image]::FromFile($image) } catch { }
}
$form.Controls.Add($pic) | Out-Null

# ── 右侧：标题 + 消息 ────────────────────────────────────────────────────────
$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = $title
$lblTitle.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 10, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = (& $cvt $fg)
$lblTitle.BackColor = (& $cvt $bg)
$lblTitle.Location = New-Object System.Drawing.Point(126, 16)
$lblTitle.AutoSize = $true
$form.Controls.Add($lblTitle) | Out-Null

if ($message) {
  $lblMsg = New-Object System.Windows.Forms.Label
  $lblMsg.Text = $message
  $lblMsg.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9)
  $lblMsg.ForeColor = (& $cvt $muted)
  $lblMsg.BackColor = (& $cvt $bg)
  $lblMsg.Location = New-Object System.Drawing.Point(126, 46)
  $lblMsg.MaximumSize = New-Object System.Drawing.Size(292, 88)
  $lblMsg.AutoSize = $true
  $lblMsg.AutoEllipsis = $true
  $form.Controls.Add($lblMsg) | Out-Null
}

# ── 角落定位 ────────────────────────────────────────────────────────────────
$area = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$w = $form.Width
$h = $form.Height
$margin = 16
switch ($corner) {
  1 { $form.Location = New-Object System.Drawing.Point($area.Left + $margin, $area.Top + $margin) }
  2 { $form.Location = New-Object System.Drawing.Point($area.Right - $w - $margin, $area.Top + $margin) }
  3 { $form.Location = New-Object System.Drawing.Point($area.Left + $margin, $area.Bottom - $h - $margin) }
  default { $form.Location = New-Object System.Drawing.Point($area.Right - $w - $margin, $area.Bottom - $h - $margin) }
}
$form.SetRounded(12)

# ── 关闭逻辑：定时 + 点击 ─────────────────────────────────────────────────────
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $durationSec * 1000
$timer.Add_Tick({ $form.Close() })
$timer.Start()

$closeAction = { try { $form.Close() } catch { } }
$form.Add_Click($closeAction)
$pic.Add_Click($closeAction)
$lblTitle.Add_Click($closeAction)
if ($lblMsg) { $lblMsg.Add_Click($closeAction) }

$form.Show()
[System.Windows.Forms.Application]::Run($form)
