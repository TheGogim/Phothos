
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

function generateId() {
    return uniqid() . bin2hex(random_bytes(8));
}

function getCurrentBaseUrl() {
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['REQUEST_URI'];
    $path = dirname(dirname($uri));
    return $protocol . '://' . $host . $path;
}

function extractImageMetadata($filePath) {
    $metadata = [];
    
    try {
        // Intentar extraer datos EXIF para imágenes
        $exifData = @exif_read_data($filePath);
        if ($exifData !== false) {
            // Fecha de captura
            if (isset($exifData['DateTimeOriginal'])) {
                $metadata['captureDate'] = date('Y-m-d', strtotime($exifData['DateTimeOriginal']));
            } elseif (isset($exifData['DateTime'])) {
                $metadata['captureDate'] = date('Y-m-d', strtotime($exifData['DateTime']));
            }
            
            // Información de cámara
            $camera = '';
            if (isset($exifData['Make']) && isset($exifData['Model'])) {
                $camera = trim($exifData['Make'] . ' ' . $exifData['Model']);
            } elseif (isset($exifData['Model'])) {
                $camera = $exifData['Model'];
            }
            if (!empty($camera)) {
                $metadata['camera'] = $camera;
            }
            
            // Configuración de cámara
            $cameraSettings = [];
            if (isset($exifData['ISOSpeedRatings'])) {
                $cameraSettings[] = 'ISO ' . $exifData['ISOSpeedRatings'];
            }
            if (isset($exifData['FNumber'])) {
                $cameraSettings[] = 'f/' . round($exifData['FNumber'], 1);
            }
            if (isset($exifData['ExposureTime'])) {
                $cameraSettings[] = $exifData['ExposureTime'] . 's';
            }
            if (isset($exifData['FocalLength'])) {
                $cameraSettings[] = round($exifData['FocalLength']) . 'mm';
            }
            
            if (!empty($cameraSettings)) {
                $metadata['cameraSettings'] = implode(', ', $cameraSettings);
            }
            
            // GPS si está disponible
            if (isset($exifData['GPSLatitude']) && isset($exifData['GPSLongitude'])) {
                $metadata['hasGPS'] = true;
            }
            
            // Dimensiones
            if (isset($exifData['COMPUTED']['Width']) && isset($exifData['COMPUTED']['Height'])) {
                $metadata['dimensions'] = $exifData['COMPUTED']['Width'] . 'x' . $exifData['COMPUTED']['Height'];
            }
        }
        
        // Obtener dimensiones de imagen si no están en EXIF
        if (!isset($metadata['dimensions'])) {
            $imageInfo = @getimagesize($filePath);
            if ($imageInfo !== false) {
                $metadata['dimensions'] = $imageInfo[0] . 'x' . $imageInfo[1];
            }
        }
        
    } catch (Exception $e) {
        error_log('Error extrayendo metadatos: ' . $e->getMessage());
    }
    
    return $metadata;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }

    if (!isset($_POST['userId']) || empty($_POST['userId'])) {
        throw new Exception('ID de usuario requerido');
    }

    if (!isset($_POST['folderId']) || empty($_POST['folderId'])) {
        throw new Exception('ID de carpeta requerido');
    }

    $userId = $_POST['userId'];
    $folderId = $_POST['folderId'];

    // Verificar que el usuario existe
    $userDataFile = "../data/users/$userId.json";
    if (!file_exists($userDataFile)) {
        throw new Exception('Usuario no encontrado');
    }

    $userData = json_decode(file_get_contents($userDataFile), true);

    // Crear directorio de uploads si no existe
    $uploadDir = "../uploads/$userId/";
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $uploadedFiles = [];

    foreach ($_FILES as $fileInput) {
        if (is_array($fileInput['name'])) {
            // Múltiples archivos
            for ($i = 0; $i < count($fileInput['name']); $i++) {
                if ($fileInput['error'][$i] === UPLOAD_ERR_OK) {
                    $fileData = [
                        'name' => $fileInput['name'][$i],
                        'type' => $fileInput['type'][$i],
                        'tmp_name' => $fileInput['tmp_name'][$i],
                        'size' => $fileInput['size'][$i]
                    ];
                    $uploadedFiles[] = processFile($fileData, $uploadDir, $userId, $folderId);
                }
            }
        } else {
            // Archivo único
            if ($fileInput['error'] === UPLOAD_ERR_OK) {
                $uploadedFiles[] = processFile($fileInput, $uploadDir, $userId, $folderId);
            }
        }
    }

    // Actualizar datos del usuario
    foreach ($uploadedFiles as $fileId) {
        if (!in_array($fileId, $userData['folders'][$folderId]['files'])) {
            $userData['folders'][$folderId]['files'][] = $fileId;
        }
    }
    $userData['folders'][$folderId]['modifiedAt'] = date('c');

    file_put_contents($userDataFile, json_encode($userData, JSON_PRETTY_PRINT));

    echo json_encode([
        'success' => true,
        'message' => count($uploadedFiles) . ' archivo(s) subido(s) correctamente',
        'files' => $uploadedFiles
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

function processFile($fileData, $uploadDir, $userId, $folderId) {
    $fileId = generateId();
    $fileName = $fileData['name'];
    $filePath = $uploadDir . $fileId . '_' . $fileName;
    
    // Validar tipos de archivo permitidos
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Tipo de archivo no permitido: ' . $fileExtension);
    }
    
    if (!move_uploaded_file($fileData['tmp_name'], $filePath)) {
        throw new Exception('Error moviendo archivo: ' . $fileName);
    }

    // Extraer metadatos si es una imagen
    $metadata = [];
    if (strpos($fileData['type'], 'image/') === 0) {
        $metadata = extractImageMetadata($filePath);
    } elseif (strpos($fileData['type'], 'audio/') === 0) {
        $metadata = extractAudioMetadata($filePath);
    } elseif (strpos($fileData['type'], 'video/') === 0) {
        $metadata = extractVideoMetadata($filePath);
    }

    // Crear metadatos del archivo
    $fileMetadata = [
        'id' => $fileId,
        'name' => $fileName,
        'type' => $fileData['type'],
        'size' => $fileData['size'],
        'path' => "uploads/$userId/" . basename($filePath),
        'createdAt' => date('c'),
        'modifiedAt' => date('c'),
        'folderId' => $folderId,
        'description' => '',
        'tags' => [],
        'notes' => ''
    ];

    // Agregar metadatos extraídos
    $fileMetadata = array_merge($fileMetadata, $metadata);

    // Guardar metadatos
    $metaDir = '../data/files/';
    if (!file_exists($metaDir)) {
        mkdir($metaDir, 0755, true);
    }
    
    file_put_contents($metaDir . $fileId . '.json', json_encode($fileMetadata, JSON_PRETTY_PRINT));

    return $fileId;
}

/**
 * Extrae metadatos de archivos de audio
 */
function extractAudioMetadata($filePath) {
    $metadata = [];
    
    try {
        // Obtener información básica del archivo
        $fileInfo = pathinfo($filePath);
        $metadata['format'] = strtoupper($fileInfo['extension']);
        
        // Intentar obtener duración usando getid3 si está disponible
        // Por ahora, solo información básica
        $metadata['mediaType'] = 'audio';
        
    } catch (Exception $e) {
        error_log('Error extrayendo metadatos de audio: ' . $e->getMessage());
    }
    
    return $metadata;
}

/**
 * Extrae metadatos de archivos de video
 */
function extractVideoMetadata($filePath) {
    $metadata = [];
    
    try {
        // Obtener información básica del archivo
        $fileInfo = pathinfo($filePath);
        $metadata['format'] = strtoupper($fileInfo['extension']);
        $metadata['mediaType'] = 'video';
        
    } catch (Exception $e) {
        error_log('Error extrayendo metadatos de video: ' . $e->getMessage());
    }
    
    return $metadata;
}
?>
