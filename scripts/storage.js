/**
 * Sistema de almacenamiento para Galería Privada
 * Maneja la persistencia de datos usando archivos JSON reales en el servidor
 * y subida de archivos mediante APIs PHP
 */

class StorageManager {
    constructor() {
        this.apiUrl = 'api/';
    }

    /**
     * Crea un nuevo usuario
     * @param {Object} userInfo - Información del usuario
     * @returns {Promise<string>} ID del usuario creado
     */
    async createUser(userInfo) {
        try {
            const response = await fetch(`${this.apiUrl}auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'register',
                    username: userInfo.username,
                    email: userInfo.email,
                    password: userInfo.password
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al crear usuario');
            }

            return data.user.id;
        } catch (error) {
            console.error('Error creando usuario:', error);
            throw error;
        }
    }

    /**
     * Autentica un usuario
     * @param {string} username - Nombre de usuario
     * @param {string} password - Contraseña
     * @returns {Promise<Object>} Datos del usuario autenticado
     */
    async authenticateUser(username, password) {
        try {
            const response = await fetch(`${this.apiUrl}auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    username: username,
                    password: password
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error en autenticación');
            }

            return data.user;
        } catch (error) {
            console.error('Error en autenticación:', error);
            throw error;
        }
    }

    /**
     * Carga datos de un usuario específico
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} Datos del usuario
     */
    async loadUserData(userId) {
        try {
            const response = await fetch(`${this.apiUrl}data.php?action=user&userId=${userId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar datos de usuario');
            }

            return data;
        } catch (error) {
            console.error('Error cargando datos de usuario:', error);
            return null;
        }
    }

    /**
     * Guarda archivo en el servidor
     * @param {string} userId - ID del usuario
     * @param {File} file - Archivo a guardar
     * @param {string} folderId - ID de la carpeta
     * @returns {Promise<Object>} Información del archivo guardado
     */
    async saveFile(userId, file, folderId = 'root') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);
            formData.append('folderId', folderId);

            const response = await fetch(`${this.apiUrl}upload.php`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al subir archivo');
            }

            return data.file;
        } catch (error) {
            console.error('Error guardando archivo:', error);
            throw error;
        }
    }

    /**
     * Obtiene un archivo por ID
     * @param {string} fileId - ID del archivo
     * @returns {Promise<Object>} Datos del archivo
     */
    async getFile(fileId) {
        try {
            const response = await fetch(`${this.apiUrl}data.php?action=file&fileId=${fileId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al obtener archivo');
            }

            return data;
        } catch (error) {
            console.error('Error obteniendo archivo:', error);
            return null;
        }
    }

    /**
     * Elimina un archivo
     * @param {string} userId - ID del usuario
     * @param {string} fileId - ID del archivo
     * @param {string} folderId - ID de la carpeta
     */
    async deleteFile(userId, fileId, folderId) {
        try {
            const response = await fetch(`${this.apiUrl}data.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'file',
                    userId: userId,
                    fileId: fileId,
                    folderId: folderId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar archivo');
            }
        } catch (error) {
            console.error('Error eliminando archivo:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva carpeta
     * @param {string} userId - ID del usuario
     * @param {string} folderName - Nombre de la carpeta
     * @param {string} parentFolderId - ID de la carpeta padre
     * @returns {Promise<string>} ID de la carpeta creada
     */
    async createFolder(userId, folderName, parentFolderId = 'root') {
        try {
            const response = await fetch(`${this.apiUrl}data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'createFolder',
                    userId: userId,
                    folderName: folderName,
                    parentFolderId: parentFolderId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al crear carpeta');
            }

            return data.folderId;
        } catch (error) {
            console.error('Error creando carpeta:', error);
            throw error;
        }
    }

    /**
     * Elimina una carpeta y todo su contenido
     * @param {string} userId - ID del usuario
     * @param {string} folderId - ID de la carpeta
     * @param {string} parentFolderId - ID de la carpeta padre
     */
    async deleteFolder(userId, folderId, parentFolderId = 'root') {
        try {
            const response = await fetch(`${this.apiUrl}data.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'folder',
                    userId: userId,
                    folderId: folderId,
                    parentFolderId: parentFolderId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar carpeta');
            }
        } catch (error) {
            console.error('Error eliminando carpeta:', error);
            throw error;
        }
    }

    /**
     * Crea un enlace compartido
     * @param {string} userId - ID del usuario
     * @param {string} folderId - ID de la carpeta
     * @param {boolean} protectedDownload - Protección de descarga
     * @returns {Promise<Object>} Datos del enlace compartido
     */
    async createShareLink(userId, folderId, protectedDownload = false) {
        try {
            const response = await fetch(`${this.apiUrl}data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'createShare',
                    userId: userId,
                    folderId: folderId,
                    protectedDownload: protectedDownload
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al crear enlace compartido');
            }

            return data;
        } catch (error) {
            console.error('Error creando enlace compartido:', error);
            throw error;
        }
    }

    /**
     * Obtiene datos de un enlace compartido
     * @param {string} shareId - ID del enlace compartido
     * @param {string} token - Token de verificación
     * @returns {Promise<Object>} Datos del enlace compartido
     */
    async getShareData(shareId, token) {
        try {
            const response = await fetch(`${this.apiUrl}data.php?action=share&shareId=${shareId}&token=${token}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Enlace compartido no válido');
            }

            return data;
        } catch (error) {
            console.error('Error obteniendo datos compartidos:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los enlaces compartidos de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<Array>} Lista de enlaces compartidos
     */
    async getUserShares(userId) {
        try {
            const response = await fetch(`${this.apiUrl}data.php?action=shares&userId=${userId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al obtener enlaces compartidos');
            }

            return data;
        } catch (error) {
            console.error('Error obteniendo enlaces compartidos:', error);
            return [];
        }
    }

    /**
     * Elimina un enlace compartido
     * @param {string} shareId - ID del enlace compartido
     * @param {string} userId - ID del usuario
     */
    async deleteShare(shareId, userId) {
        try {
            const response = await fetch(`${this.apiUrl}data.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'share',
                    shareId: shareId,
                    userId: userId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar enlace compartido');
            }
        } catch (error) {
            console.error('Error eliminando enlace compartido:', error);
            throw error;
        }
    }

    /**
     * Actualiza metadatos de un archivo
     * @param {string} fileId - ID del archivo
     * @param {Object} metadata - Nuevos metadatos
     */
    async updateFileMetadata(fileId, metadata) {
        try {
            const response = await fetch(`${this.apiUrl}data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateFile',
                    fileId: fileId,
                    metadata: metadata
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al actualizar metadatos');
            }
        } catch (error) {
            console.error('Error actualizando metadatos:', error);
            throw error;
        }
    }
}

// Exportar para uso global
window.StorageManager = StorageManager;
