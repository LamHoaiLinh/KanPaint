@echo off
setlocal
cd /d "%~dp0"
if not exist "dist\index.html" (
  echo [KanPaint] Chua co dist\index.html.
  echo Dat OpenShop vao thu muc upstream va chay: npm run build
  pause
  exit /b 1
)
start "" http://127.0.0.1:8765/
python -m http.server 8765 --bind 127.0.0.1 --directory dist
if errorlevel 1 py -m http.server 8765 --bind 127.0.0.1 --directory dist
endlocal
