
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

function hashPassword($password) {
    return password_hash($password, PASSWORD_ARGON2ID);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateId() {
    return uniqid() . bin2hex(random_bytes(8));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    try {
        switch ($action) {
            case 'register':
                $username = $input['username'] ?? '';
                $email = $input['email'] ?? '';
                $password = $input['password'] ?? '';

                if (empty($username) || empty($email) || empty($password)) {
                    throw new Exception('Todos los campos son requeridos');
                }

                // Verificar si existe el archivo de usuarios
                $usersFile = '../data/users.json';
                $usersDir = dirname($usersFile);
                if (!file_exists($usersDir)) {
                    mkdir($usersDir, 0755, true);
                }

                $users = [];
                if (file_exists($usersFile)) {
                    $users = json_decode(file_get_contents($usersFile), true) ?: [];
                }

                // Verificar usuario único
                foreach ($users as $user) {
                    if ($user['username'] === $username || $user['email'] === $email) {
                        throw new Exception('El usuario o email ya existe');
                    }
                }

                // Crear nuevo usuario
                $userId = generateId();
                $passwordHash = hashPassword($password);

                $newUser = [
                    'id' => $userId,
                    'username' => $username,
                    'email' => $email,
                    'createdAt' => date('c')
                ];

                $userData = [
                    'id' => $userId,
                    'username' => $username,
                    'email' => $email,
                    'passwordHash' => $passwordHash,
                    'createdAt' => date('c'),
                    'folders' => [
                        'root' => [
                            'id' => 'root',
                            'name' => 'Mi Galería',
                            'files' => [],
                            'subfolders' => [],
                            'createdAt' => date('c')
                        ]
                    ],
                    'settings' => [
                        'theme' => 'dark',
                        'language' => 'es'
                    ]
                ];

                // Guardar en lista de usuarios
                $users[] = $newUser;
                file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));

                // Guardar datos completos del usuario
                $userDataFile = "../data/users/$userId.json";
                file_put_contents($userDataFile, json_encode($userData, JSON_PRETTY_PRINT));

                // Crear directorio de uploads
                $userUploadsDir = "../uploads/$userId";
                if (!file_exists($userUploadsDir)) {
                    mkdir($userUploadsDir, 0755, true);
                }

                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $userId,
                        'username' => $username,
                        'email' => $email
                    ]
                ]);
                break;

            case 'login':
                $username = $input['username'] ?? '';
                $password = $input['password'] ?? '';

                if (empty($username) || empty($password)) {
                    throw new Exception('Usuario y contraseña requeridos');
                }

                $usersFile = '../data/users.json';
                if (!file_exists($usersFile)) {
                    throw new Exception('No hay usuarios registrados');
                }

                $users = json_decode(file_get_contents($usersFile), true) ?: [];
                $userId = null;

                // Buscar usuario
                foreach ($users as $user) {
                    if ($user['username'] === $username) {
                        $userId = $user['id'];
                        break;
                    }
                }

                if (!$userId) {
                    throw new Exception('Usuario o contraseña incorrectos');
                }

                // Verificar contraseña
                $userDataFile = "../data/users/$userId.json";
                if (!file_exists($userDataFile)) {
                    throw new Exception('Datos de usuario no encontrados');
                }

                $userData = json_decode(file_get_contents($userDataFile), true);
                if (!verifyPassword($password, $userData['passwordHash'])) {
                    throw new Exception('Usuario o contraseña incorrectos');
                }

                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $userId,
                        'username' => $userData['username'],
                        'email' => $userData['email']
                    ]
                ]);
                break;

            default:
                throw new Exception('Acción no válida');
        }

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
