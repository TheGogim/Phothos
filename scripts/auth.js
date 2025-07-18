
/**
 * Sistema de autenticación para Galería Privada
 * Maneja el registro, login y gestión de sesiones
 */

class AuthManager {
    constructor() {
        this.storage = new StorageManager();
        this.currentUser = null;
        this.sessionToken = null;
        
        // Cargar sesión existente
        this.loadSession();
    }

    /**
     * Carga la sesión actual desde localStorage
     */
    loadSession() {
        try {
            const sessionData = localStorage.getItem('galeria_privada_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const now = new Date().getTime();
                
                // Verificar si la sesión no ha expirado (24 horas)
                if (session.expiresAt > now) {
                    this.currentUser = session.user;
                    this.sessionToken = session.token;
                    return true;
                }
            }
        } catch (error) {
            console.error('Error cargando sesión:', error);
        }
        
        this.clearSession();
        return false;
    }

    /**
     * Guarda la sesión actual
     * @param {Object} user - Datos del usuario
     */
    saveSession(user) {
        try {
            const token = CryptoUtils.generateToken(64);
            const expiresAt = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 horas
            
            const sessionData = {
                user: user,
                token: token,
                createdAt: new Date().getTime(),
                expiresAt: expiresAt
            };

            localStorage.setItem('galeria_privada_session', JSON.stringify(sessionData));
            
            this.currentUser = user;
            this.sessionToken = token;
        } catch (error) {
            console.error('Error guardando sesión:', error);
            throw new Error('Error al guardar sesión');
        }
    }

    /**
     * Limpia la sesión actual
     */
    clearSession() {
        localStorage.removeItem('galeria_privada_session');
        this.currentUser = null;
        this.sessionToken = null;
    }

    /**
     * Registra un nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario registrado
     */
    async register(userData) {
        try {
            // Validar datos
            if (!userData.username || userData.username.length < 3) {
                throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
            }

            if (!userData.email || !this.isValidEmail(userData.email)) {
                throw new Error('El email no es válido');
            }

            if (!userData.password || userData.password.length < 8) {
                throw new Error('La contraseña debe tener al menos 8 caracteres');
            }

            if (userData.password !== userData.confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }

            // Validar fortaleza de contraseña
            const passwordValidation = CryptoUtils.validatePassword(userData.password);
            if (!passwordValidation.valid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            // Crear usuario
            const userId = await this.storage.createUser({
                username: userData.username,
                email: userData.email,
                password: userData.password
            });

            // Crear sesión automáticamente
            const user = {
                id: userId,
                username: userData.username,
                email: userData.email
            };

            this.saveSession(user);

            return user;
        } catch (error) {
            console.error('Error en registro:', error);
            throw error;
        }
    }

    /**
     * Inicia sesión de usuario
     * @param {string} username - Nombre de usuario
     * @param {string} password - Contraseña
     * @returns {Promise<Object>} Usuario autenticado
     */
    async login(username, password) {
        try {
            if (!username || !password) {
                throw new Error('Usuario y contraseña son requeridos');
            }

            const user = await this.storage.authenticateUser(username, password);
            this.saveSession(user);

            return user;
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    /**
     * Cierra la sesión actual
     */
    logout() {
        this.clearSession();
        
        // Redirigir a la página principal
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        } else {
            // Recargar la página para limpiar el estado
            window.location.reload();
        }
    }

    /**
     * Verifica si hay una sesión activa
     * @returns {boolean} True si hay sesión activa
     */
    isLoggedIn() {
        return this.currentUser !== null && this.sessionToken !== null;
    }

    /**
     * Obtiene el usuario actual
     * @returns {Object|null} Usuario actual o null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Valida un email
     * @param {string} email - Email a validar
     * @returns {boolean} True si es válido
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Cambia la contraseña del usuario actual
     * @param {string} currentPassword - Contraseña actual
     * @param {string} newPassword - Nueva contraseña
     * @returns {Promise<void>}
     */
    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.isLoggedIn()) {
                throw new Error('No hay sesión activa');
            }

            // Verificar contraseña actual
            await this.storage.authenticateUser(this.currentUser.username, currentPassword);

            // Validar nueva contraseña
            const passwordValidation = CryptoUtils.validatePassword(newPassword);
            if (!passwordValidation.valid) {
                throw new Error(passwordValidation.errors.join(', '));
            }

            // Actualizar contraseña
            const userData = this.storage.loadUserData(this.currentUser.id);
            userData.passwordHash = await CryptoUtils.hashPassword(newPassword);
            userData.modifiedAt = new Date().toISOString();
            
            this.storage.saveUserData(this.currentUser.id, userData);

        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            throw error;
        }
    }

    /**
     * Actualiza el perfil del usuario
     * @param {Object} profileData - Nuevos datos del perfil
     * @returns {Promise<void>}
     */
    async updateProfile(profileData) {
        try {
            if (!this.isLoggedIn()) {
                throw new Error('No hay sesión activa');
            }

            const userData = this.storage.loadUserData(this.currentUser.id);
            
            // Actualizar email si se proporciona
            if (profileData.email && profileData.email !== userData.email) {
                if (!this.isValidEmail(profileData.email)) {
                    throw new Error('El email no es válido');
                }
                
                // Verificar que el email no esté en uso
                const users = this.storage.loadUsers();
                for (let id in users) {
                    if (id !== this.currentUser.id && users[id].email === profileData.email) {
                        throw new Error('El email ya está en uso');
                    }
                }
                
                userData.email = profileData.email;
                this.currentUser.email = profileData.email;
                
                // Actualizar en la lista de usuarios
                users[this.currentUser.id].email = profileData.email;
                this.storage.saveUsers(users);
            }

            // Actualizar configuraciones
            if (profileData.settings) {
                userData.settings = { ...userData.settings, ...profileData.settings };
            }

            userData.modifiedAt = new Date().toISOString();
            this.storage.saveUserData(this.currentUser.id, userData);

            // Actualizar sesión
            this.saveSession(this.currentUser);

        } catch (error) {
            console.error('Error actualizando perfil:', error);
            throw error;
        }
    }

    /**
     * Elimina la cuenta del usuario actual
     * @param {string} password - Contraseña para confirmar
     * @returns {Promise<void>}
     */
    async deleteAccount(password) {
        try {
            if (!this.isLoggedIn()) {
                throw new Error('No hay sesión activa');
            }

            // Verificar contraseña
            await this.storage.authenticateUser(this.currentUser.username, password);

            const userId = this.currentUser.id;
            const userData = this.storage.loadUserData(userId);

            // Eliminar todos los archivos del usuario
            const files = JSON.parse(localStorage.getItem('galeria_privada_files')) || {};
            for (let folderId in userData.folders) {
                const folder = userData.folders[folderId];
                folder.files.forEach(fileId => {
                    delete files[fileId];
                });
            }
            localStorage.setItem('galeria_privada_files', JSON.stringify(files));

            // Eliminar enlaces compartidos del usuario
            const shares = this.storage.loadSharedFiles();
            for (let shareId in shares) {
                if (shares[shareId].userId === userId) {
                    delete shares[shareId];
                }
            }
            this.storage.saveSharedFiles(shares);

            // Eliminar datos del usuario
            localStorage.removeItem(`galeria_privada_user_${userId}`);

            // Eliminar de la lista de usuarios
            const users = this.storage.loadUsers();
            delete users[userId];
            this.storage.saveUsers(users);

            // Cerrar sesión
            this.logout();

        } catch (error) {
            console.error('Error eliminando cuenta:', error);
            throw error;
        }
    }
}

// Exportar para uso global
window.AuthManager = AuthManager;
