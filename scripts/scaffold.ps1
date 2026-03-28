# VoiceTrace - Directory Scaffolding Script (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scaffold.ps1

param(
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot)
)

Write-Host "Scaffolding VoiceTrace at: $RootPath" -ForegroundColor Cyan

$dirs = @(
    "backend\src\config"
    "backend\src\controllers"
    "backend\src\middlewares"
    "backend\src\models"
    "backend\src\routes"
    "backend\src\services"
    "backend\src\utils"
    "backend\src\jobs"
    "backend\src\events"
    "backend\database\migrations"
    "backend\database\seeds"
    "backend\tests\unit"
    "backend\tests\integration"
    "backend\storage"
    "backend\logs"
    "frontend\public"
    "frontend\src\api"
    "frontend\src\assets"
    "frontend\src\components\common"
    "frontend\src\components\forms"
    "frontend\src\layouts"
    "frontend\src\views"
    "frontend\src\routing"
    "frontend\src\state"
    "frontend\src\hooks"
    "frontend\src\utils"
    "frontend\src\types"
    "frontend\tests\components"
    "frontend\tests\e2e"
    "docs"
    "scripts"
    ".github\workflows"
)

foreach ($dir in $dirs) {
    $fullPath = Join-Path $RootPath $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Green
    }
    $gitkeep = Join-Path $fullPath ".gitkeep"
    if (-not (Test-Path $gitkeep)) {
        New-Item -ItemType File -Path $gitkeep -Force | Out-Null
    }
}

Write-Host ""
Write-Host "Directory structure created successfully!" -ForegroundColor Green
