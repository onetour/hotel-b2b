@echo off
chcp 65001 >nul
title 酒店B2B - 外网隧道 (Cloudflare)
color 0A

echo ==============================================
echo       酒店B2B - 免费外网访问隧道
echo       技术方案: Cloudflare Tunnel
echo       0费用 / 无需注册 / 不限流量
echo ==============================================
echo.

set CF=%USERPROFILE%\cloudflared.exe

:: 杀掉残留进程
taskkill /f /im cloudflared.exe >nul 2>&1

:: 如果文件被锁，强制删除后重下
if exist %CF% (
    del /f %CF% >nul 2>&1
    if exist %CF% (
        echo [警告] cloudflared.exe 被占用，跳过下载
        echo 请手动删除 %CF% 后重试
        pause
        exit /b 1
    )
)

:: 下载
echo [1/2] 正在下载 cloudflared (~8MB)...
echo.
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%USERPROFILE%\cloudflared.exe' -UseBasicParsing; Write-Host '下载完成'"
if not exist %CF% (
    echo.
    echo [错误] 下载失败! 请检查网络连接
    echo 手动下载: https://github.com/cloudflare/cloudflared/releases
    pause
    exit /b 1
)

:: 启动隧道
echo.
echo [2/2] 正在启动外网隧道...
echo.
echo ==============================================
echo   重要! 下方会出现类似这样的地址:
echo   https://xxxx.trycloudflare.com
echo   把这个地址发给同事即可在外网访问!
echo ==============================================
echo.

%CF% tunnel --url http://localhost:8766 --no-autoupdate

pause
