
/**
 * Gestor de enlaces compartidos
 * Maneja la creación, gestión y eliminación de enlaces de carpetas compartidas
 */

class ShareManager {
    constructor(storage, gallery) {
        this.storage = storage;
        this.gallery = gallery;
    }

    /**
     * Crea un enlace compartido
     * @param {string} userId - ID del usuario
     * @param {string} folderId - ID de la carpeta
     * @param {boolean} protectedDownload - Si proteger descargas
     * @returns {Object} Datos del enlace compartido
     */
    async createShareLink(userId, folderId, protectedDownload = false) {
        try {
            const response = await fetch('api/data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'createShare',
                    userId: userId,
                    folderId: folderId,
                    protectedDownload: protectedDownload
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            return data;
        } catch (error) {
            console.error('Error creando enlace compartido:', error);
            throw error;
        }
    }

    /**
     * Obtiene los enlaces compartidos de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Array} Lista de enlaces compartidos
     */
    async getUserShares(userId) {
        try {
            const response = await fetch(`api/data.php?action=shares&userId=${userId}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
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
            const response = await fetch('api/data.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'share',
                    shareId: shareId,
                    userId: userId
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            return data;
        } catch (error) {
            console.error('Error eliminando enlace compartido:', error);
            throw error;
        }
    }
}

// Exportar para uso global
window.ShareManager = ShareManager;
