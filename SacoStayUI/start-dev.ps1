# PowerShell script để start development server
Write-Host "Starting SacoStay UI Development Server..." -ForegroundColor Green
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js chưa được cài." -ForegroundColor Red
    Write-Host "Tải tại: https://nodejs.org/ (chọn bản LTS)" -ForegroundColor Yellow
    Write-Host "Sau khi cài xong, mở lại terminal và chạy lại script này." -ForegroundColor Yellow
    Read-Host "Nhấn Enter để thoát"
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Chưa có node_modules. Đang chạy npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install thất bại." -ForegroundColor Red
        Read-Host "Nhấn Enter để thoát"
        exit 1
    }
}

Write-Host ""
Write-Host "Mở trình duyệt tại http://localhost:4200" -ForegroundColor Cyan
npm start
