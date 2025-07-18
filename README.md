# Galería Privada

Una aplicación web completa para crear galerías privadas de imágenes y videos, con funcionalidades de compartición y protección de contenido.

## 🚀 Características

- **Gestión de usuarios**: Registro e inicio de sesión seguros
- **Subida de archivos**: Soporte para imágenes (JPG, PNG, GIF, WebP), videos (MP4, MOV, AVI) y audio (MP3, WAV, OGG, AAC, M4A, FLAC)
- **Organización**: Creación de carpetas y subcarpetas
- **Compartición**: Enlaces públicos para carpetas con protección opcional
- **Protección de contenido**: Bloqueo de descarga directa y copia de imágenes
- **Reproductores integrados**: Visualización de videos y reproducción de audio con controles protegidos
- **Interfaz responsiva**: Diseño moderno que funciona en móviles y escritorio

## 📋 Requisitos del servidor

- **PHP 7.4 o superior**
- **Permisos de escritura** en las carpetas `data/` y `uploads/`
- **Extensiones PHP requeridas**:
  - `json` (incluida por defecto)
  - `fileinfo` (para detección de tipos de archivo)
  - `gd` o `imagick` (recomendado para procesamiento de imágenes)

## 🛠️ Instalación

### Opción 1: Hosting tradicional (cPanel, FTP)

1. **Descarga todos los archivos** del proyecto
2. **Sube los archivos** a la carpeta pública de tu hosting (normalmente `public_html/` o `www/`)
3. **Configura permisos** de las carpetas:
   ```bash
   chmod 755 data/
   chmod 755 uploads/
   chmod 755 api/
   ```
4. **Verifica que PHP esté funcionando** visitando `tu-dominio.com/api/auth.php`

### Opción 2: VPS/Servidor dedicado

1. **Clona o descarga** el repositorio:
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd galeria-privada
   ```

2. **Configura el servidor web** (Apache/Nginx):
   
   **Para Apache** (usar el .htaccess incluido):
   ```apache
   DocumentRoot /ruta/al/proyecto/galeria-privada
   ```

   **Para Nginx**:
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;
       root /ruta/al/proyecto/galeria-privada;
       index index.html;

       location / {
           try_files $uri $uri/ =404;
       }

       location /api/ {
           try_files $uri $uri/ =404;
           location ~ \.php$ {
               fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
               fastcgi_index index.php;
               include fastcgi_params;
               fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
           }
       }

       location ~* \.(jpg|jpeg|png|gif|webp|mp4|mov|avi)$ {
           expires 1M;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

3. **Configura permisos**:
   ```bash
   chmod 755 data/ uploads/ api/
   chown -R www-data:www-data data/ uploads/
   ```

### Opción 3: Hosting con soporte para aplicaciones

**Netlify con funciones**:
- Las funciones PHP no son compatibles directamente
- Considera migrar a Netlify Functions (JavaScript/TypeScript)

**Vercel**:
- Usa Vercel Functions para reemplazar los archivos PHP
- Configura `vercel.json` para redirecciones

## 🗂️ Estructura del proyecto

```
galeria-privada/
├── api/                    # Scripts PHP del backend
│   ├── auth.php           # Autenticación de usuarios
│   ├── data.php           # Gestión de datos
│   └── upload.php         # Subida de archivos
├── data/                  # Base de datos JSON (se crea automáticamente)
│   ├── users.json         # Lista de usuarios
│   ├── users/             # Datos individuales de usuarios
│   ├── files/             # Metadatos de archivos
│   └── shares.json        # Enlaces compartidos
├── uploads/               # Archivos subidos (se crea automáticamente)
├── scripts/               # JavaScript del frontend
├── styles/                # Hojas de estilo CSS
├── index.html             # Página principal
├── gallery.html           # Galería privada
├── share.html             # Visor de carpetas compartidas
├── .htaccess             # Configuración Apache
└── README.md             # Este archivo
```

## 🔒 Seguridad

### Protecciones implementadas:

1. **Encriptación de contraseñas**: Usando `password_hash()` de PHP con ARGON2ID
2. **Validación de tipos de archivo**: Solo se permiten extensiones seguras
3. **Tokens de compartición**: Enlaces únicos con tokens aleatorios
4. **Protección de archivos JSON**: `.htaccess` bloquea acceso directo
5. **Protección anti-descarga**: CSS y JavaScript para bloquear clic derecho, selección, etc.

### Recomendaciones adicionales:

- **HTTPS**: Configura SSL/TLS en tu servidor
- **Backups**: Respalda regularmente las carpetas `data/` y `uploads/`
- **Límites de tamaño**: Configura `upload_max_filesize` en PHP
- **Firewall**: Bloquea acceso directo a `/data/` y `/api/` desde el firewall

## 🎨 Personalización

### Cambiar colores y estilos:
Edita `styles/main.css` y `styles/gallery.css`

### Modificar límites de archivos:
Edita `api/upload.php` línea con `$allowedExtensions`

### Cambiar configuración PHP:
```ini
; En php.ini o .htaccess
upload_max_filesize = 10M
post_max_size = 12M
max_execution_time = 300
memory_limit = 256M
```

## 🐛 Solución de problemas

### Error 500 en archivos PHP:
1. Verifica que PHP esté instalado y funcionando
2. Revisa los logs de error del servidor
3. Comprueba permisos de carpetas

### No se pueden subir archivos:
1. Verifica permisos de escritura en `uploads/`
2. Aumenta `upload_max_filesize` en PHP
3. Revisa espacio disponible en disco

### Enlace compartido no funciona:
1. Verifica que el archivo `data/shares.json` exista
2. Comprueba que la URL incluya `id` y `token`
3. Revisa permisos de la carpeta `data/`

### Archivos JSON corruptos:
```bash
# Resetear base de datos (CUIDADO: elimina todos los usuarios)
rm -rf data/
mkdir data/
chmod 755 data/
```

## 📞 Soporte

Para reportar bugs o solicitar funcionalidades, crea un issue en el repositorio del proyecto.

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver archivo `LICENSE` para más detalles.

---

**¡Tu galería privada está lista para usar! 🎉**

Visita tu dominio y comienza a crear tu primera cuenta.