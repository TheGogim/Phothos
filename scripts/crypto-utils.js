
/**
 * Utilidades de criptografía para Galería Privada
 * Maneja encriptación de contraseñas y generación de tokens seguros
 */

class CryptoUtils {
    /**
     * Genera un hash SHA-256 de una cadena de texto
     * @param {string} text - Texto a hashear
     * @returns {Promise<string>} Hash en formato hexadecimal
     */
    static async hashPassword(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Genera un token aleatorio seguro
     * @param {number} length - Longitud del token (default: 32)
     * @returns {string} Token hexadecimal
     */
    static generateToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Genera un ID único para carpetas y archivos
     * @returns {string} ID único
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Valida la fortaleza de una contraseña
     * @param {string} password - Contraseña a validar
     * @returns {Object} Resultado de la validación
     */
    static validatePassword(password) {
        const result = {
            valid: true,
            errors: []
        };

        if (password.length < 8) {
            result.valid = false;
            result.errors.push('La contraseña debe tener al menos 8 caracteres');
        }

        if (!/[A-Z]/.test(password)) {
            result.valid = false;
            result.errors.push('Debe contener al menos una mayúscula');
        }

        if (!/[a-z]/.test(password)) {
            result.valid = false;
            result.errors.push('Debe contener al menos una minúscula');
        }

        if (!/[0-9]/.test(password)) {
            result.valid = false;
            result.errors.push('Debe contener al menos un número');
        }

        return result;
    }

    /**
     * Genera un enlace seguro para compartir carpetas
     * @param {string} userId - ID del usuario
     * @param {string} folderId - ID de la carpeta
     * @param {boolean} protectedDownload - Si debe proteger las descargas
     * @returns {Object} Datos del enlace
     */
    static generateShareLink(userId, folderId, protectedDownload = false) {
        const token = this.generateToken(48);
        const shareId = this.generateId();
        
        return {
            shareId,
            token,
            userId,
            folderId,
            protectedDownload,
            createdAt: new Date().toISOString(),
            url: `${window.location.origin}/share.html?id=${shareId}&token=${token}`
        };
    }

    /**
     * Encripta datos sensibles usando AES-GCM
     * @param {string} data - Datos a encriptar
     * @param {string} password - Contraseña para la encriptación
     * @returns {Promise<string>} Datos encriptados en base64
     */
    static async encryptData(data, password) {
        try {
            const encoder = new TextEncoder();
            const passwordKey = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );

            const salt = crypto.getRandomValues(new Uint8Array(16));
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                passwordKey,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(data)
            );

            // Combinar salt + iv + datos encriptados
            const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encrypted), salt.length + iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Error al encriptar:', error);
            throw new Error('Error en la encriptación');
        }
    }

    /**
     * Desencripta datos usando AES-GCM
     * @param {string} encryptedData - Datos encriptados en base64
     * @param {string} password - Contraseña para la desencriptación
     * @returns {Promise<string>} Datos desencriptados
     */
    static async decryptData(encryptedData, password) {
        try {
            const combined = new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)));
            
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);

            const encoder = new TextEncoder();
            const passwordKey = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                passwordKey,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Error al desencriptar:', error);
            throw new Error('Error en la desencriptación');
        }
    }
}

// Exportar para uso global
window.CryptoUtils = CryptoUtils;
