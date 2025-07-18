
/**
 * Script principal para la página de inicio de Galería Privada
 * Maneja la interfaz de usuario y la comunicación con el backend PHP
 */

class MainApp {
    constructor() {
        this.auth = new AuthManager();
        this.storage = new StorageManager();
        this.init();
    }

    init() {
        // Verificar si ya hay una sesión activa
        if (this.auth.isLoggedIn()) {
            // Redirigir a la galería si ya está logueado
            window.location.href = 'gallery.html';
            return;
        }

        this.setupEventListeners();
        this.setupModals();
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('registerBtn').addEventListener('click', () => this.showRegisterModal());
        document.getElementById('startBtn').addEventListener('click', () => this.showRegisterModal());
        document.getElementById('createAccountBtn').addEventListener('click', () => this.showRegisterModal());
        document.getElementById('hasAccountBtn').addEventListener('click', () => this.showLoginModal());

        // Modales
        document.getElementById('closeLoginModal').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('closeRegisterModal').addEventListener('click', () => this.hideRegisterModal());

        // Formularios
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Cerrar modales al hacer clic fuera
        document.getElementById('loginModal').addEventListener('click', (e) => {
            if (e.target.id === 'loginModal') this.hideLoginModal();
        });
        document.getElementById('registerModal').addEventListener('click', (e) => {
            if (e.target.id === 'registerModal') this.hideRegisterModal();
        });

        // Cerrar modales con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideLoginModal();
                this.hideRegisterModal();
            }
        });
    }

    setupModals() {
        // Configurar validación en tiempo real
        const registerPassword = document.getElementById('registerPassword');
        const registerConfirmPassword = document.getElementById('registerConfirmPassword');

        registerConfirmPassword.addEventListener('input', () => {
            if (registerPassword.value !== registerConfirmPassword.value) {
                registerConfirmPassword.setCustomValidity('Las contraseñas no coinciden');
            } else {
                registerConfirmPassword.setCustomValidity('');
            }
        });
    }

    showLoginModal() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('loginModal').classList.add('flex');
        document.getElementById('loginUsername').focus();
        this.clearLoginErrors();
    }

    hideLoginModal() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('loginModal').classList.remove('flex');
        this.clearLoginForm();
    }

    showRegisterModal() {
        document.getElementById('registerModal').classList.remove('hidden');
        document.getElementById('registerModal').classList.add('flex');
        document.getElementById('registerUsername').focus();
        this.clearRegisterErrors();
    }

    hideRegisterModal() {
        document.getElementById('registerModal').classList.add('hidden');
        document.getElementById('registerModal').classList.remove('flex');
        this.clearRegisterForm();
    }

    showLoading() {
        document.getElementById('loadingSpinner').classList.remove('hidden');
        document.getElementById('loadingSpinner').classList.add('flex');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('hidden');
        document.getElementById('loadingSpinner').classList.remove('flex');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showLoginError('Por favor, completa todos los campos');
            return;
        }

        this.showLoading();
        this.clearLoginErrors();

        try {
            const user = await this.auth.login(username, password);
            
            this.hideLoading();
            this.hideLoginModal();
            
            // Mostrar mensaje de bienvenida
            this.showNotification(`¡Bienvenido, ${user.username}!`, 'success');
            
            // Redirigir a la galería después de un momento
            setTimeout(() => {
                window.location.href = 'gallery.html';
            }, 1000);

        } catch (error) {
            this.hideLoading();
            console.error('Error en login:', error);
            this.showLoginError(error.message || 'Error al iniciar sesión');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        // Validaciones
        if (!username || !email || !password || !confirmPassword) {
            this.showRegisterError('Por favor, completa todos los campos');
            return;
        }

        if (username.length < 3) {
            this.showRegisterError('El nombre de usuario debe tener al menos 3 caracteres');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showRegisterError('El email no es válido');
            return;
        }

        if (password.length < 8) {
            this.showRegisterError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            this.showRegisterError('Las contraseñas no coinciden');
            return;
        }

        this.showLoading();
        this.clearRegisterErrors();

        try {
            const user = await this.auth.register({
                username: username,
                email: email,
                password: password,
                confirmPassword: confirmPassword
            });

            this.hideLoading();
            
            // Mostrar mensaje de éxito
            this.showRegisterSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
            
            // Redirigir a la galería después de un momento
            setTimeout(() => {
                window.location.href = 'gallery.html';
            }, 2000);

        } catch (error) {
            this.hideLoading();
            console.error('Error en registro:', error);
            this.showRegisterError(error.message || 'Error al crear la cuenta');
        }
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    clearLoginErrors() {
        document.getElementById('loginError').classList.add('hidden');
    }

    showRegisterError(message) {
        const errorDiv = document.getElementById('registerError');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        document.getElementById('registerSuccess').classList.add('hidden');
    }

    showRegisterSuccess(message) {
        const successDiv = document.getElementById('registerSuccess');
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
        document.getElementById('registerError').classList.add('hidden');
    }

    clearRegisterErrors() {
        document.getElementById('registerError').classList.add('hidden');
        document.getElementById('registerSuccess').classList.add('hidden');
    }

    clearLoginForm() {
        document.getElementById('loginForm').reset();
        this.clearLoginErrors();
    }

    clearRegisterForm() {
        document.getElementById('registerForm').reset();
        this.clearRegisterErrors();
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remover después de 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.mainApp = new MainApp();
});

// Función para debugging
window.debugGallery = () => {
    console.log('=== DEBUG GALERÍA PRIVADA ===');
    console.log('Auth Manager:', window.mainApp?.auth);
    console.log('Storage Manager:', window.mainApp?.storage);
    console.log('Usuario actual:', window.mainApp?.auth?.getCurrentUser());
    console.log('Sesión activa:', window.mainApp?.auth?.isLoggedIn());
};
