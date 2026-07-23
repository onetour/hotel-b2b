$cf = "$env:USERPROFILE\cloudflared.exe"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  启动外网隧道 (Cloudflare Tunnel)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 确保服务在运行
try {
    $r = Invoke-WebRequest "http://localhost:8766/api" -UseBasicParsing -TimeoutSec 3
    Write-Host "[√] 本地服务 localhost:8766 正常" -ForegroundColor Green
} catch {
    Write-Host "[X] 本地服务未启动! 请先运行 server.js" -ForegroundColor Red
    Read-Host "按回车退出"
    exit
}

# 杀掉旧隧道
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "[→] 正在建立隧道，请稍候..." -ForegroundColor Yellow
Write-Host ""

# 启动隧道，实时显示输出
$proc = Start-Process -FilePath $cf -ArgumentList "tunnel --url http://localhost:8766 --no-autoupdate" -NoNewWindow -PassThru

# 等连接建立
Start-Sleep -Seconds 6

Write-Host "=====================================" -ForegroundColor Green
Write-Host "  隧道已启动! 外网访问地址:" -ForegroundColor Green
Write-Host "  (查看上方输出中的 trycloudflare.com 链接)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "关闭此窗口即可停止外网访问" -ForegroundColor DarkYellow

Read-Host "按回车退出"
