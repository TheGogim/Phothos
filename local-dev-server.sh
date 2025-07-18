
#!/bin/bash

echo "===================================="
echo "   GALERIA PRIVADA - SERVIDOR LOCAL"
echo "===================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar Apache
if command_exists apache2; then
    echo -e "${GREEN}Apache2 encontrado!${NC}"
    
    # Verificar si Apache está ejecutándose
    if systemctl is-active --quiet apache2; then
        echo -e "${GREEN}Apache2 ya está ejecutándose${NC}"
    else
        echo "Iniciando Apache2..."
        sudo systemctl start apache2
        
        if systemctl is-active --quiet apache2; then
            echo -e "${GREEN}Apache2 iniciado correctamente${NC}"
        else
            echo -e "${RED}Error al iniciar Apache2${NC}"
            exit 1
        fi
    fi
    
    # Verificar si mod_rewrite está habilitado
    if a2enmod rewrite 2>/dev/null; then
        echo -e "${GREEN}mod_rewrite está habilitado${NC}"
        sudo systemctl reload apache2
    fi
    
    echo ""
    echo -e "${YELLOW}Tu aplicación debería estar disponible en:${NC}"
    echo "http://localhost/galeria-privada/"
    
elif command_exists php; then
    echo -e "${YELLOW}Apache no encontrado, usando PHP built-in server...${NC}"
    echo ""
    echo "Servidor iniciando en: http://localhost:8080"
    echo "Presiona Ctrl+C para detener"
    echo ""
    
    # Cambiar al directorio del script
    cd "$(dirname "$0")"
    
    # Ejecutar configuración inicial si es necesario
    if [ ! -d "data" ]; then
        echo "Ejecutando configuración inicial..."
        php setup-local.php
        echo ""
    fi
    
    php -S localhost:8080
    
else
    echo -e "${RED}Ni Apache ni PHP están disponibles${NC}"
    echo ""
    echo "Instala uno de los siguientes:"
    echo "1. LAMP stack completo:"
    echo "   sudo apt install apache2 php libapache2-mod-php php-json php-fileinfo php-gd"
    echo ""
    echo "2. Solo PHP para servidor de desarrollo:"
    echo "   sudo apt install php php-json php-fileinfo php-gd"
    echo ""
    exit 1
fi

echo ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo "- Detener Apache: sudo systemctl stop apache2"
echo "- Reiniciar Apache: sudo systemctl restart apache2"
echo "- Ver logs: sudo tail -f /var/log/apache2/error.log"
echo "- Configuración inicial: php setup-local.php"
echo ""
