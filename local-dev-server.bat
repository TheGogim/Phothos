
@echo off
echo ====================================
echo    GALERIA PRIVADA - SERVIDOR LOCAL
echo ====================================
echo.

REM Verificar si existe XAMPP
if exist "C:\xampp\apache\bin\httpd.exe" (
    echo Usando XAMPP instalado...
    cd /d "C:\xampp"
    start xampp-control.exe
    echo.
    echo XAMPP Control Panel abierto.
    echo Inicia Apache desde el panel de control.
    echo.
) else (
    echo XAMPP no encontrado en la ubicacion por defecto.
    echo.
    echo Opciones:
    echo 1. Instalar XAMPP desde: https://www.apachefriends.org/
    echo 2. O usar PHP built-in server:
    echo.
    
    REM Verificar si PHP esta disponible
    php --version >nul 2>&1
    if %errorlevel% == 0 (
        echo PHP encontrado! Iniciando servidor de desarrollo...
        echo.
        echo Servidor iniciando en: http://localhost:8080
        echo Presiona Ctrl+C para detener
        echo.
        php -S localhost:8080
    ) else (
        echo PHP no esta disponible en PATH.
        echo Instala XAMPP o agrega PHP al PATH del sistema.
    )
)

echo.
echo Una vez que Apache este ejecutandose:
echo - Ve a: http://localhost/galeria-privada/
echo - O ejecuta: php setup-local.php
echo.
pause
