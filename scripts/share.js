
/**
 * Script para visualizar carpetas compartidas
 * Maneja la carga y visualización de contenido compartido con protecciones opcionales
 * Actualizado para usar APIs PHP reales
 */

class ShareViewer {
    constructor() {
        this.storage = new StorageManager();
        this.shareData = null;
        this.isProtected = false;
        this.folderData = null;
        this.userData = null;
        
        this.init();
    }

    /**
     * Inicializa el visor compartido
     */
    async init() {
        try {
            await this.loadShareData();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error inicializando visor compartido:', error);
        }
    }

    /**
     * Carga los datos del enlace compartido
     */
    async loadShareData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const shareId = urlParams.get('id');
            const token = urlParams.get('token');

            if (!shareId || !token) {
                this.showError('Enlace compartido no válido');
                return;
            }

            this.shareData = await this.storage.getShareData(shareId, token);
            this.isProtected = this.shareData.protectedDownload;

            // Cargar datos del usuario propietario
            this.userData = await this.storage.loadUserData(this.shareData.userId);
            if (!this.userData) {
                this.showError('No se pudieron cargar los datos del propietario');
                return;
            }

            // Cargar datos de la carpeta
            this.folderData = this.userData.folders[this.shareData.folderId];
            if (!this.folderData) {
                this.showError('La carpeta compartida no existe');
                return;
            }

            this.setupProtections();
            await this.loadSharedContent();

        } catch (error) {
            console.error('Error cargando datos compartidos:', error);
            this.showError(error.message || 'Error al cargar el contenido compartido');
        }
    }

    /**
     * Configura las protecciones si están activadas
     */
    setupProtections() {
        if (this.isProtected) {
            // Mostrar aviso de protección
            document.getElementById('protectedNotice').classList.remove('hidden');

            // Aplicar clases de protección al body
            document.body.classList.add('protected-content', 'no-context-menu');

            // Bloquear clic derecho
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });

            // Bloquear teclas comunes de descarga/copia
            document.addEventListener('keydown', (e) => {
                // Ctrl+S (Guardar), Ctrl+A (Seleccionar todo), Ctrl+C (Copiar), etc.
                if (e.ctrlKey && ['s', 'a', 'c', 'v', 'x', 'p'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    return false;
                }
                
                // F12 (DevTools), Ctrl+Shift+I, Ctrl+U (Ver código fuente)
                if (e.key === 'F12' || 
                    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                    (e.ctrlKey && e.key === 'U')) {
                    e.preventDefault();
                    return false;
                }
            });

            // Bloquear selección de texto
            document.addEventListener('selectstart', (e) => {
                e.preventDefault();
                return false;
            });

            // Bloquear arrastrar imágenes
            document.addEventListener('dragstart', (e) => {
                e.preventDefault();
                return false;
            });

            // Prevenir touch callout en móviles
            document.addEventListener('touchstart', (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            });

            // Bloquear zoom con pellizco en móviles
            document.addEventListener('touchmove', (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });

            // Mensaje personalizado para copy
            document.addEventListener('copy', (e) => {
                e.clipboardData.setData('text/plain', 'Contenido protegido - No se puede copiar');
                e.preventDefault();
            });
        }
    }

    /**
     * Carga el contenido compartido
     */
    async loadSharedContent() {
        try {
            // Actualizar información de la carpeta
            document.getElementById('folderName').textContent = this.folderData.name;
            
            const fileCount = this.folderData.files ? this.folderData.files.length : 0;
            const subfolderCount = this.folderData.subfolders ? this.folderData.subfolders.length : 0;
            
            document.getElementById('folderStats').textContent = 
                `${fileCount} archivo(s) • ${subfolderCount} subcarpeta(s)`;

            document.getElementById('folderInfo').textContent = 
                `Compartido por: ${this.userData.username}`;

            // Mostrar header
            document.getElementById('folderHeader').classList.remove('hidden');

            // Renderizar contenido
            await this.renderSharedContent();

        } catch (error) {
            console.error('Error cargando contenido:', error);
            this.showError('Error al cargar el contenido de la carpeta');
        }
    }

    /**
     * Renderiza el contenido compartido
     */
    async renderSharedContent() {
        const gallery = document.getElementById('sharedGallery');
        gallery.innerHTML = '';

        let hasContent = false;

        // Renderizar subcarpetas (solo como vista, no navegables en compartido)
        if (this.folderData.subfolders && this.folderData.subfolders.length > 0) {
            this.folderData.subfolders.forEach(subfolderId => {
                const subfolder = this.userData.folders[subfolderId];
                if (subfolder) {
                    gallery.appendChild(this.createFolderElement(subfolder));
                    hasContent = true;
                }
            });
        }

        // Renderizar archivos
        if (this.folderData.files && this.folderData.files.length > 0) {
            for (const fileId of this.folderData.files) {
                try {
                    const file = await this.storage.getFile(fileId);
                    if (file) {
                        gallery.appendChild(this.createFileElement(file));
                        hasContent = true;
                    }
                } catch (error) {
                    console.error('Error cargando archivo:', fileId, error);
                }
            }
        }

        // Mostrar estado apropiado
        if (hasContent) {
            this.showGallery();
        } else {
            this.showEmpty();
        }
    }

    /**
     * Crea un elemento de carpeta (solo visual)
     * @param {Object} folder - Datos de la carpeta
     * @returns {HTMLElement} Elemento DOM
     */
    createFolderElement(folder) {
        const element = document.createElement('div');
        element.className = 'folder-item opacity-75 cursor-not-allowed';
        
        element.innerHTML = `
            <div class="folder-item-icon">📁</div>
            <div class="folder-item-name">${folder.name}</div>
            <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <span class="text-white text-sm font-medium">Subcarpeta</span>
            </div>
        `;

        return element;
    }

    /**
     * Crea un elemento de archivo
     * @param {Object} file - Datos del archivo
     * @returns {HTMLElement} Elemento DOM
     */
    createFileElement(file) {
        const element = document.createElement('div');
        element.className = 'gallery-item';
        
        if (this.isProtected) {
            element.classList.add('protected-content', 'no-context-menu');
        }
        
        const isVideo = file.type.startsWith('video/');
        const mediaElement = isVideo ? 
            `<video src="${file.path}" muted ${this.isProtected ? 'class="no-drag"' : ''}></video>` : 
            `<img src="${file.path}" alt="${file.name}" ${this.isProtected ? 'class="no-drag"' : ''}>`;

        element.innerHTML = `
            ${mediaElement}
            <div class="gallery-item-overlay">
                <h4 class="font-semibold text-sm">${file.name}</h4>
                ${file.description ? `<p class="text-xs opacity-75">${file.description}</p>` : ''}
                <p class="text-xs opacity-60 mt-1">
                    ${this.formatFileSize(file.size)} • ${this.formatDate(file.createdAt)}
                </p>
            </div>
        `;

        // Solo permitir visualización en modal para imágenes y si no está protegido
        if (!isVideo && !this.isProtected) {
            element.addEventListener('click', () => {
                this.showImageViewer(file);
            });
        } else if (!isVideo && this.isProtected) {
            // Para contenido protegido, mostrar mensaje al hacer clic
            element.addEventListener('click', () => {
                this.showProtectedMessage();
            });
        }

        return element;
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Image viewer
        document.getElementById('closeImageViewer').addEventListener('click', () => this.hideImageViewer());
        document.getElementById('imageViewerModal').addEventListener('click', (e) => {
            if (e.target.id === 'imageViewerModal') this.hideImageViewer();
        });

        // Tecla Escape para cerrar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideImageViewer();
            }
        });
    }

    /**
     * Muestra el visor de imágenes
     * @param {Object} file - Datos del archivo
     */
    showImageViewer(file) {
        if (this.isProtected) {
            this.showProtectedMessage();
            return;
        }

        document.getElementById('viewerImage').src = file.path;
        document.getElementById('viewerTitle').textContent = file.name;
        document.getElementById('viewerDescription').textContent = file.description || 'Sin descripción';
        document.getElementById('imageViewerModal').classList.remove('hidden');
    }

    /**
     * Oculta el visor de imágenes
     */
    hideImageViewer() {
        document.getElementById('imageViewerModal').classList.add('hidden');
    }

    /**
     * Muestra mensaje de contenido protegido
     */
    showProtectedMessage() {
        this.showToast('Este contenido está protegido y no se puede visualizar en pantalla completa', 'info');
    }

    /**
     * Muestra el estado de error
     * @param {string} message - Mensaje de error
     */
    showError(message) {
        document.getElementById('loadingShare').classList.add('hidden');
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorShare').classList.remove('hidden');
    }

    /**
     * Muestra la galería
     */
    showGallery() {
        document.getElementById('loadingShare').classList.add('hidden');
        document.getElementById('sharedGallery').classList.remove('hidden');
    }

    /**
     * Muestra el estado vacío
     */
    showEmpty() {
        document.getElementById('loadingShare').classList.add('hidden');
        document.getElementById('emptyShare').classList.remove('hidden');
    }

    /**
     * Formatea el tamaño de archivo
     * @param {number} bytes - Tamaño en bytes
     * @returns {string} Tamaño formateado
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Formatea una fecha
     * @param {string} dateString - Fecha en formato ISO
     * @returns {string} Fecha formateada
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Muestra un toast
     * @param {string} message - Mensaje
     * @param {string} type - Tipo (success, error, info)
     */
    showToast(message, type = 'info') {
        // Crear toast dinámicamente
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
        
        const colors = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            info: 'bg-blue-600 text-white'
        };
        
        toast.className += ` ${colors[type] || colors.info}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new ShareViewer();
});
