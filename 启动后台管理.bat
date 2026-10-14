@echo off
rem HengXing website admin launcher:
rem if service is already running just open the page; otherwise start it first
rem and open the browser only after port 4173 is ready (max 20s wait).
cd /d C:\workspace\hx_website
netstat -ano | findstr :4173 | findstr LISTENING >nul 2>&1
if %errorlevel%==0 goto open
start "hx-admin" /min cmd /c "npm run admin"
set /a tries=0
:wait
timeout /t 1 /nobreak >nul
netstat -ano | findstr :4173 | findstr LISTENING >nul 2>&1
if %errorlevel%==0 goto open
set /a tries+=1
if %tries% lss 20 goto wait
:open
start "" http://127.0.0.1:4173
