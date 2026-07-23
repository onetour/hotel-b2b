@echo off
chcp 65001 >nul
title 酒店B2B - 外网访问说明

echo ==============================================
echo   酒店B2B - 免费外网访问方案 (Tailscale)
echo ==============================================
echo.
echo 为什么换方案?
echo  - Cloudflare Tunnel 在中国大陆被 GFW 封锁，无法建立连接
echo  - Tailscale 同样免费，国内正常使用
echo.
echo ==============================================
echo   方案: Tailscale (免费 / 国内可用 / 手机端支持)
echo ==============================================
echo.
echo 一、服务器电脑 (你的电脑) 操作一次即可:
echo   1. 打开浏览器，访问 https://www.tailscale.com/download
echo   2. 下载 Windows 版 Tailscale，安装并注册账号
echo   3. 安装后右下角任务栏会出现 Tailscale 图标
echo   4. 右键图标 -> 查看本机IP，记下来 (例如 100.x.x.x)
echo.
echo 二、同事外地电脑或手机:
echo   1. 下载对应设备 Tailscale (Windows/Mac/iPhone/Android)
echo   2. 注册后用同一账号登录 (免费版支持3个用户共享)
echo   3. 连接后，浏览器打开 http://你的TailscaleIP:8766
echo      例如: http://100.123.45.67:8766
echo.
echo ===========================================
echo   免费额度: 最多100台设备, 3个用户
echo   官网: https://tailscale.com
echo ===========================================
echo.
pause
