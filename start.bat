@echo off
REM Script para iniciar Backend y Frontend simultáneamente
REM Autor: Antigravity
REM Fecha: 2025-12-02

echo.
echo ========================================
echo   Iniciando Backend y Frontend
echo ========================================
echo.

REM Verificar si concurrently está instalado
where concurrently >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Instalando concurrently...
    call npm install -g concurrently
)

echo [INFO] Iniciando servicios...
echo.

REM Iniciar ambos servicios con concurrently
call npx concurrently -n "BACKEND,FRONTEND" -c "magenta,blue" "cd server && npm run dev" "npm run dev"

echo.
echo [INFO] Servicios detenidos.
pause
