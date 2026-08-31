@echo off
chcp 65001 >nul
title 設備數量統計系統 - 本地伺服器
echo 正在啟動本機伺服器並開啟瀏覽器 (http://localhost:3000)...
node server.js
pause
