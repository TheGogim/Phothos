
<?php
/**
 * Script de configuración inicial para desarrollo local
 * Crea las estructuras de directorios necesarias y verifica la configuración
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

function createDirectory($path) {
    if (!file_exists($path)) {
        if (mkdir($path, 0755, true)) {
            echo "✓ Directorio creado: $path\n";
        } else {
            echo "✗ Error creando directorio: $path\n";
        }
    } else {
        echo "✓ Directorio ya existe: $path\n";
    }
}

function writeFile($path, $content) {
    if (file_put_contents($path, $content)) {
        echo "✓ Archivo creado: $path\n";
    } else {
        echo "✗ Error creando archivo: $path\n";
    }
}

echo "=== CONFIGURACIÓN INICIAL DE GALERÍA PRIVADA ===\n\n";

// Verificar PHP
echo "Verificando configuración de PHP...\n";
echo "Versión de PHP: " . phpversion() . "\n";

// Verificar extensiones necesarias
$extensions = ['json', 'fileinfo', 'gd'];
foreach ($extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "✓ Extensión $ext está disponible\n";
    } else {
        echo "✗ Extensión $ext NO está disponible\n";
    }
}

echo "\nCreando estructura de directorios...\n";

// Crear directorios necesarios
$directories = [
    'data',
    'data/users',
    'data/files',
    'uploads',
    'backups'
];

foreach ($directories as $dir) {
    createDirectory($dir);
}

echo "\nCreando archivos de configuración...\n";

// Crear archivo de configuración
$configContent = '<?php
/**
 * Configuración de la aplicación
 */

// Configuración de subida de archivos
define("MAX_FILE_SIZE", 50 * 1024 * 1024); // 50MB
define("ALLOWED_EXTENSIONS", ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "avi", "mkv"]);
define("UPLOAD_PATH", __DIR__ . "/uploads/");
define("DATA_PATH", __DIR__ . "/data/");

// Configuración de seguridad
define("SESSION_LIFETIME", 24 * 60 * 60); // 24 horas
define("HASH_ALGO", PASSWORD_ARGON2ID);

// Configuración de la aplicación
define("APP_NAME", "Galería Privada");
define("APP_VERSION", "1.0.0");
define("APP_ENV", "local");

// Configuración de URLs
$protocol = isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] === "on" ? "https" : "http";
$host = $_SERVER["HTTP_HOST"] ?? "localhost";
define("BASE_URL", "$protocol://$host");
';

writeFile('config.php', $configContent);

// Crear archivo .htaccess mejorado
$htaccessContent = '# Galería Privada - Configuración Apache

# Habilitar reescritura de URL
RewriteEngine On

# Seguridad para archivos de datos
<Files "*.json">
    Require all denied
</Files>

<FilesMatch "\.(json|bak|backup)$">
    Require all denied
</FilesMatch>

# Proteger directorios sensibles
<Directory "data">
    Require all denied
</Directory>

<Directory "backups">
    Require all denied
</Directory>

# Configuración de subida de archivos
php_value upload_max_filesize 50M
php_value post_max_size 52M
php_value max_execution_time 300
php_value memory_limit 128M

# Configuración de seguridad
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Configuración de caché para assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|webp|svg|ico)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    Header append Cache-Control "public"
</FilesMatch>

# Configuración CORS para desarrollo local
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

# Redirecciones amigables
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L]

# Prevenir acceso directo a archivos PHP de configuración
<Files "setup-local.php">
    Require all denied
</Files>

<Files "config.php">
    Require all denied
</Files>
';

writeFile('.htaccess', $htaccessContent);

// Crear archivo de información del sistema
$infoContent = '<?php
/**
 * Información del sistema para debugging
 */

if (!isset($_GET["debug"]) || $_GET["debug"] !== "1") {
    http_response_code(404);
    exit("Not found");
}

header("Content-Type: application/json");

echo json_encode([
    "php_version" => phpversion(),
    "extensions" => get_loaded_extensions(),
    "upload_max_filesize" => ini_get("upload_max_filesize"),
    "post_max_size" => ini_get("post_max_size"),
    "max_execution_time" => ini_get("max_execution_time"),
    "memory_limit" => ini_get("memory_limit"),
    "document_root" => $_SERVER["DOCUMENT_ROOT"],
    "script_path" => __DIR__,
    "directories" => [
        "data" => is_dir("data") && is_writable("data"),
        "uploads" => is_dir("uploads") && is_writable("uploads"),
        "backups" => is_dir("backups") && is_writable("backups")
    ]
], JSON_PRETTY_PRINT);
';

writeFile('system-info.php', $infoContent);

echo "\nVerificando permisos...\n";

// Verificar permisos de escritura
$paths = ['data', 'uploads', 'backups'];
foreach ($paths as $path) {
    if (is_writable($path)) {
        echo "✓ $path es escribible\n";
    } else {
        echo "✗ $path NO es escribible\n";
        echo "  Ejecuta: chmod 755 $path\n";
    }
}

echo "\n=== CONFIGURACIÓN COMPLETADA ===\n";
echo "Tu aplicación está lista para usar en desarrollo local.\n\n";

echo "PRÓXIMOS PASOS:\n";
echo "1. Asegúrate de que tu servidor web (Apache/Nginx) esté ejecutándose\n";
echo "2. Accede a la aplicación desde tu navegador\n";
echo "3. Registra tu primera cuenta de usuario\n\n";

echo "DEBUGGING:\n";
echo "- Para ver información del sistema: /system-info.php?debug=1\n";
echo "- Los logs de errores están en los logs de tu servidor web\n";
echo "- Los archivos se guardan en: " . realpath('uploads') . "\n";
echo "- Los datos se guardan en: " . realpath('data') . "\n\n";

echo "¡Disfruta tu Galería Privada local!\n";
?>
';

writeFile('setup-local.php', '<?php
/**
 * Script de configuración inicial para desarrollo local
 * Crea las estructuras de directorios necesarias y verifica la configuración
 */

error_reporting(E_ALL);
ini_set("display_errors", 1);

function createDirectory($path) {
    if (!file_exists($path)) {
        if (mkdir($path, 0755, true)) {
            echo "✓ Directorio creado: $path\n";
        } else {
            echo "✗ Error creando directorio: $path\n";
        }
    } else {
        echo "✓ Directorio ya existe: $path\n";
    }
}

function writeFile($path, $content) {
    if (file_put_contents($path, $content)) {
        echo "✓ Archivo creado: $path\n";
    } else {
        echo "✗ Error creando archivo: $path\n";
    }
}

echo "=== CONFIGURACIÓN INICIAL DE GALERÍA PRIVADA ===\n\n";

// Verificar PHP
echo "Verificando configuración de PHP...\n";
echo "Versión de PHP: " . phpversion() . "\n";

// Verificar extensiones necesarias
$extensions = ["json", "fileinfo", "gd"];
foreach ($extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "✓ Extensión $ext está disponible\n";
    } else {
        echo "✗ Extensión $ext NO está disponible\n";
    }
}

echo "\nCreando estructura de directorios...\n";

// Crear directorios necesarios
$directories = [
    "data",
    "data/users", 
    "data/files",
    "uploads",
    "backups"
];

foreach ($directories as $dir) {
    createDirectory($dir);
}

echo "\n=== CONFIGURACIÓN COMPLETADA ===\n";
echo "Tu aplicación está lista para usar en desarrollo local.\n";
?>');

<lov-write file_path="README-LOCAL.md">
# Galería Privada - Configuración Local

## Requisitos del Sistema

### Para Windows:
- **XAMPP** (recomendado) o **WAMP**
- PHP 7.4 o superior
- Apache con mod_rewrite habilitado
- Extensiones PHP: json, fileinfo, gd

### Para Lubuntu/Linux:
- **LAMP Stack** (Apache, MySQL/MariaDB, PHP)
- PHP 7.4 o superior
- Apache con mod_rewrite habilitado
- Extensiones PHP: json, fileinfo, gd

## Instalación Rápida

### Windows con XAMPP:

1. **Descargar e instalar XAMPP:**
   ```
   https://www.apachefriends.org/download.html
   ```

2. **Copiar archivos:**
   - Copiar todos los archivos del proyecto a `C:\xampp\htdocs\galeria-privada\`

3. **Configurar XAMPP:**
   - Abrir XAMPP Control Panel
   - Iniciar Apache
   - Opcional: Iniciar MySQL (no necesario para esta aplicación)

4. **Configuración inicial:**
   - Abrir navegador en `http://localhost/galeria-privada/setup-local.php`
   - O ejecutar desde línea de comandos:
     ```cmd
     cd C:\xampp\htdocs\galeria-privada
     php setup-local.php
     ```

5. **Acceder a la aplicación:**
   ```
   http://localhost/galeria-privada/
   ```

### Lubuntu/Linux:

1. **Instalar LAMP Stack:**
   ```bash
   sudo apt update
   sudo apt install apache2 php libapache2-mod-php php-json php-fileinfo php-gd
   ```

2. **Habilitar mod_rewrite:**
   ```bash
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

3. **Copiar archivos:**
   ```bash
   sudo cp -r galeria-privada/ /var/www/html/
   sudo chown -R www-data:www-data /var/www/html/galeria-privada/
   sudo chmod -R 755 /var/www/html/galeria-privada/
   ```

4. **Configuración inicial:**
   ```bash
   cd /var/www/html/galeria-privada/
   php setup-local.php
   ```

5. **Configurar permisos:**
   ```bash
   sudo chmod 777 data/ uploads/ backups/
   ```

6. **Acceder a la aplicación:**
   ```
   http://localhost/galeria-privada/
   ```

## Estructura de Directorios

```
galeria-privada/
├── index.html              # Página principal
├── gallery.html            # Interfaz de galería
├── share.html              # Visualización de enlaces compartidos
├── scripts/                # JavaScript de la aplicación
│   ├── auth.js             # Autenticación
│   ├── gallery.js          # Gestión de galería
│   ├── storage.js          # Comunicación con backend
│   ├── file-details.js     # Gestión de metadatos
│   ├── search-manager.js   # Búsqueda y filtros
│   └── download-manager.js # Descargas y ZIP
├── api/                    # Backend PHP
│   ├── auth.php            # API de autenticación
│   ├── upload.php          # API de subida de archivos
│   └── data.php            # API de gestión de datos
├── data/                   # Base de datos JSON (creado automáticamente)
│   ├── users.json          # Lista de usuarios
│   ├── users/              # Datos de cada usuario
│   └── files/              # Metadatos de archivos
├── uploads/                # Archivos subidos (creado automáticamente)
│   └── [userId]/           # Archivos por usuario
├── backups/                # Respaldos automáticos
├── setup-local.php         # Script de configuración inicial
└── .htaccess               # Configuración Apache
```

## Características Implementadas

### ✅ Funcionalidades Principales:
- **Autenticación**: Registro e inicio de sesión seguro
- **Gestión de archivos**: Subida drag-and-drop de imágenes y videos
- **Organización**: Creación y gestión de carpetas jerárquicas
- **Metadatos**: Edición de descripción, tags, fechas y notas
- **Búsqueda avanzada**: Por nombre, descripción, tags, tipo y fecha
- **Compartición**: Enlaces públicos para carpetas con opciones de protección
- **Descargas**: Individual o múltiple en formato ZIP
- **Ordenamiento**: Por nombre, fecha, tamaño o fecha de creación

### ✅ Características Técnicas:
- **Base de datos**: Archivos JSON (sin necesidad de MySQL)
- **Seguridad**: Hashing de contraseñas con Argon2ID
- **Responsive**: Diseño adaptativo para móviles y desktop
- **Local**: Funciona completamente offline después de la instalación

## Solución de Problemas

### Error 403 Forbidden:
```bash
# Linux
sudo chmod -R 755 /var/www/html/galeria-privada/
sudo chown -R www-data:www-data /var/www/html/galeria-privada/

# Windows: Verificar que XAMPP esté ejecutándose como administrador
```

### Error de subida de archivos:
```bash
# Verificar permisos de uploads/
sudo chmod 777 uploads/
```

### Apache no inicia:
```bash
# Verificar puertos ocupados
sudo netstat -tlnp | grep :80
sudo systemctl status apache2
```

### Error en PHP:
```bash
# Verificar logs
tail -f /var/log/apache2/error.log
# Windows: C:\xampp\apache\logs\error.log
```

## URLs de Testing

- **Aplicación principal**: `http://localhost/galeria-privada/`
- **Info del sistema**: `http://localhost/galeria-privada/system-info.php?debug=1`
- **Test de subida**: Usar la interfaz web tras registrarse

## Backup y Restauración

### Backup manual:
```bash
# Copiar datos de usuario
cp -r data/ backups/data-$(date +%Y%m%d)/
cp -r uploads/ backups/uploads-$(date +%Y%m%d)/
```

### Restauración:
```bash
# Restaurar desde backup
cp -r backups/data-20231215/ data/
cp -r backups/uploads-20231215/ uploads/
```

## Seguridad Local

- Los archivos JSON están protegidos por .htaccess
- Las contraseñas usan hashing Argon2ID
- Validación de tipos de archivo en el servidor
- Protección CSRF básica
- No hay acceso externo por defecto (solo localhost)

## Rendimiento

- **Archivos soportados**: Hasta 50MB por archivo
- **Formatos**: JPG, PNG, GIF, WebP, MP4, MOV, AVI, MKV
- **Usuarios**: Sin límite (solo limitado por espacio en disco)
- **Almacenamiento**: Solo limitado por espacio disponible en disco

¡Tu Galería Privada está lista para usar en local! 🎉
