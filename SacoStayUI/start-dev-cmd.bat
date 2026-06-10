@echo off
echo Starting SacoStay UI Development Server...
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js chua duoc cai. Tai tai: https://nodejs.org/ ^(chon ban LTS^)
    echo Sau khi cai xong, mo lai CMD va chay lai file nay.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Chua co node_modules. Dang chay npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install that bai.
        pause
        exit /b 1
    )
)

echo.
echo Mo trinh duyet tai http://localhost:4200
call npm start
pause
