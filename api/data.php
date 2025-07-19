<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

function generateId() {
    return uniqid() . bin2hex(random_bytes(8));
}

function getCurrentBaseUrl() {
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['REQUEST_URI'];
    $path = dirname($uri);
    return $protocol . '://' . $host . $path;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            if ($action === 'user') {
                $userId = $_GET['userId'] ?? '';
                if (empty($userId)) {
                    throw new Exception('ID de usuario requerido');
                }

                $userDataFile = "../data/users/$userId.json";
                if (!file_exists($userDataFile)) {
                    throw new Exception('Usuario no encontrado');
                }

                $userData = json_decode(file_get_contents($userDataFile), true);
                echo json_encode($userData);

            } elseif ($action === 'file') {
                $fileId = $_GET['fileId'] ?? '';
                if (empty($fileId)) {
                    throw new Exception('ID de archivo requerido');
                }

                $fileMetaPath = "../data/files/$fileId.json";
                if (!file_exists($fileMetaPath)) {
                    throw new Exception('Archivo no encontrado');
                }

                $fileData = json_decode(file_get_contents($fileMetaPath), true);
                echo json_encode($fileData);

            } elseif ($action === 'share') {
                $shareId = $_GET['shareId'] ?? '';
                $token = $_GET['token'] ?? '';
                
                if (empty($shareId) || empty($token)) {
                    throw new Exception('Datos de enlace compartido requeridos');
                }

                $shareFile = '../data/shares.json';
                if (!file_exists($shareFile)) {
                    throw new Exception('Enlace no encontrado');
                }

                $shares = json_decode(file_get_contents($shareFile), true) ?: [];
                if (!isset($shares[$shareId]) || $shares[$shareId]['token'] !== $token) {
                    throw new Exception('Enlace compartido no válido');
                }

                echo json_encode($shares[$shareId]);

            } elseif ($action === 'shares') {
                $userId = $_GET['userId'] ?? '';
                if (empty($userId)) {
                    throw new Exception('ID de usuario requerido');
                }

                $shareFile = '../data/shares.json';
                if (!file_exists($shareFile)) {
                    echo json_encode([]);
                    return;
                }

                $shares = json_decode(file_get_contents($shareFile), true) ?: [];
                $userShares = array_filter($shares, function($share) use ($userId) {
                    return $share['userId'] === $userId;
                });

                echo json_encode(array_values($userShares));
            }
            break;

        case 'POST':
            $action = $input['action'] ?? '';

            if ($action === 'createFolder') {
                $userId = $input['userId'] ?? '';
                $folderName = $input['folderName'] ?? '';
                $parentFolderId = $input['parentFolderId'] ?? 'root';

                if (empty($userId) || empty($folderName)) {
                    throw new Exception('Datos requeridos');
                }

                $userDataFile = "../data/users/$userId.json";
                if (!file_exists($userDataFile)) {
                    throw new Exception('Usuario no encontrado');
                }

                $userData = json_decode(file_get_contents($userDataFile), true);
                $folderId = generateId();

                $folderData = [
                    'id' => $folderId,
                    'name' => $folderName,
                    'files' => [],
                    'subfolders' => [],
                    'createdAt' => date('c'),
                    'modifiedAt' => date('c')
                ];

                $userData['folders'][$folderId] = $folderData;
                
                if (!isset($userData['folders'][$parentFolderId])) {
                    $userData['folders'][$parentFolderId] = [
                        'id' => $parentFolderId,
                        'name' => 'Carpeta',
                        'files' => [],
                        'subfolders' => [],
                        'createdAt' => date('c')
                    ];
                }

                $userData['folders'][$parentFolderId]['subfolders'][] = $folderId;
                $userData['folders'][$parentFolderId]['modifiedAt'] = date('c');

                file_put_contents($userDataFile, json_encode($userData, JSON_PRETTY_PRINT));

                echo json_encode(['success' => true, 'folderId' => $folderId]);

            } elseif ($action === 'createShare') {
                $userId = $input['userId'] ?? '';
                $folderId = $input['folderId'] ?? '';
                $protectedDownload = $input['protectedDownload'] ?? false;

                if (empty($userId) || empty($folderId)) {
                    throw new Exception('Datos requeridos');
                }

                $shareId = generateId();
                $token = bin2hex(random_bytes(16));
                
                // Generar URL dinámica basada en la petición actual
                $baseUrl = getCurrentBaseUrl();
                $shareUrl = str_replace('/api', '', $baseUrl) . "/share.html?id=$shareId&token=$token";

                $shareData = [
                    'shareId' => $shareId,
                    'token' => $token,
                    'url' => $shareUrl,
                    'userId' => $userId,
                    'folderId' => $folderId,
                    'protectedDownload' => $protectedDownload,
                    'createdAt' => date('c')
                ];

                $shareFile = '../data/shares.json';
                $shareDir = dirname($shareFile);
                if (!file_exists($shareDir)) {
                    mkdir($shareDir, 0755, true);
                }

                $shares = [];
                if (file_exists($shareFile)) {
                    $shares = json_decode(file_get_contents($shareFile), true) ?: [];
                }

                $shares[$shareId] = $shareData;
                file_put_contents($shareFile, json_encode($shares, JSON_PRETTY_PRINT));

                echo json_encode($shareData);

            } elseif ($action === 'updateFile') {
                $fileId = $input['fileId'] ?? '';
                $metadata = $input['metadata'] ?? [];

                if (empty($fileId)) {
                    throw new Exception('ID de archivo requerido');
                }

                $fileMetaPath = "../data/files/$fileId.json";
                if (!file_exists($fileMetaPath)) {
                    throw new Exception('Archivo no encontrado');
                }

                $fileData = json_decode(file_get_contents($fileMetaPath), true);
                $fileData = array_merge($fileData, $metadata);
                $fileData['modifiedAt'] = date('c');

                file_put_contents($fileMetaPath, json_encode($fileData, JSON_PRETTY_PRINT));

                echo json_encode(['success' => true]);
            }
            break;

        case 'DELETE':
            $action = $input['action'] ?? '';

            if ($action === 'file') {
                $userId = $input['userId'] ?? '';
                $fileId = $input['fileId'] ?? '';
                $folderId = $input['folderId'] ?? '';

                if (empty($userId) || empty($fileId)) {
                    throw new Exception('Datos requeridos');
                }

                // Eliminar archivo físico
                $fileMetaPath = "../data/files/$fileId.json";
                if (file_exists($fileMetaPath)) {
                    $fileData = json_decode(file_get_contents($fileMetaPath), true);
                    $filePath = "../{$fileData['path']}";
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                    unlink($fileMetaPath);
                }

                // Actualizar datos del usuario
                $userDataFile = "../data/users/$userId.json";
                if (file_exists($userDataFile)) {
                    $userData = json_decode(file_get_contents($userDataFile), true);
                    if (isset($userData['folders'][$folderId])) {
                        $userData['folders'][$folderId]['files'] = array_filter(
                            $userData['folders'][$folderId]['files'],
                            function($id) use ($fileId) { return $id !== $fileId; }
                        );
                        // Reindexar el array para evitar problemas
                        $userData['folders'][$folderId]['files'] = array_values($userData['folders'][$folderId]['files']);
                        $userData['folders'][$folderId]['modifiedAt'] = date('c');
                        file_put_contents($userDataFile, json_encode($userData, JSON_PRETTY_PRINT));
                    }
                }

                echo json_encode(['success' => true]);

            } elseif ($action === 'folder') {
                $userId = $input['userId'] ?? '';
                $folderId = $input['folderId'] ?? '';
                $parentFolderId = $input['parentFolderId'] ?? 'root';

                if (empty($userId) || empty($folderId)) {
                    throw new Exception('Datos requeridos');
                }

                $userDataFile = "../data/users/$userId.json";
                if (!file_exists($userDataFile)) {
                    throw new Exception('Usuario no encontrado');
                }

                $userData = json_decode(file_get_contents($userDataFile), true);
                
                // Función recursiva para eliminar carpeta y contenido
                function deleteFolder($userData, $folderId) {
                    if (!isset($userData['folders'][$folderId])) return;
                    
                    $folder = $userData['folders'][$folderId];
                    
                    // Eliminar archivos
                    foreach ($folder['files'] as $fileId) {
                        $fileMetaPath = "../data/files/$fileId.json";
                        if (file_exists($fileMetaPath)) {
                            $fileData = json_decode(file_get_contents($fileMetaPath), true);
                            $filePath = "../{$fileData['path']}";
                            if (file_exists($filePath)) {
                                unlink($filePath);
                            }
                            unlink($fileMetaPath);
                        }
                    }
                    
                    // Eliminar subcarpetas recursivamente
                    foreach ($folder['subfolders'] as $subfolderId) {
                        deleteFolder($userData, $subfolderId);
                    }
                }

                deleteFolder($userData, $folderId);

                // Remover carpeta de la carpeta padre
                if (isset($userData['folders'][$parentFolderId])) {
                    $userData['folders'][$parentFolderId]['subfolders'] = array_filter(
                        $userData['folders'][$parentFolderId]['subfolders'],
                        function($id) use ($folderId) { return $id !== $folderId; }
                    );
                    $userData['folders'][$parentFolderId]['modifiedAt'] = date('c');
                }

                // Eliminar carpeta
                unset($userData['folders'][$folderId]);

                file_put_contents($userDataFile, json_encode($userData, JSON_PRETTY_PRINT));

                echo json_encode(['success' => true]);

            } elseif ($action === 'share') {
                $shareId = $input['shareId'] ?? '';
                $userId = $input['userId'] ?? '';

                if (empty($shareId) || empty($userId)) {
                    throw new Exception('Datos requeridos');
                }

                $shareFile = '../data/shares.json';
                if (!file_exists($shareFile)) {
                    throw new Exception('Archivo de compartidos no encontrado');
                }

                $shares = json_decode(file_get_contents($shareFile), true) ?: [];
                
                // Verificar que el usuario sea el propietario del enlace
                if (!isset($shares[$shareId]) || $shares[$shareId]['userId'] !== $userId) {
                    throw new Exception('No tienes permisos para eliminar este enlace');
                }

                unset($shares[$shareId]);
                file_put_contents($shareFile, json_encode($shares, JSON_PRETTY_PRINT));

                echo json_encode(['success' => true]);
            }
            break;

        default:
            throw new Exception('Método no permitido');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
