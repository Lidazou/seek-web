@echo off
chcp 65001 >nul
title SEEK 前端 · 本地预览
cd /d "%~dp0"

echo ============================================
echo   SEEK 前端 · 本地预览服务器
echo --------------------------------------------
echo   模块化版本必须通过 HTTP 打开，
echo   直接双击 index.html 会因为 ES Module
echo   的跨域限制而白屏。
echo ============================================
echo.

set PORT=8899

where python >nul 2>nul
if %errorlevel%==0 (
  echo 使用 Python 启动： http://127.0.0.1:%PORT%/
  start "" "http://127.0.0.1:%PORT%/"
  python -m http.server %PORT% --bind 127.0.0.1
  goto :eof
)

where node >nul 2>nul
if %errorlevel%==0 (
  echo 使用 Node 启动： http://127.0.0.1:%PORT%/
  start "" "http://127.0.0.1:%PORT%/"
  node -e "const h=require('http'),f=require('fs'),p=require('path');const t={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.md':'text/markdown; charset=utf-8'};h.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const file=p.join(process.cwd(),u);f.readFile(file,(e,d)=>{if(e){s.writeHead(404);s.end('not found');return}s.writeHead(200,{'Content-Type':t[p.extname(file)]||'application/octet-stream'});s.end(d)})}).listen(%PORT%,'127.0.0.1',()=>console.log('serving http://127.0.0.1:%PORT%'))"
  goto :eof
)

echo [错误] 没有找到 python 或 node，无法启动本地服务器。
echo        请安装 Python 或 Node.js 后重试。
pause
