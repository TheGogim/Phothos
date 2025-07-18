
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
        const isAudio = file.type.startsWith('audio/');
        
        let mediaElement;
        if (isVideo) {
            mediaElement = `
                <div class="relative w-full h-full bg-gray-900 flex items-center justify-center">
                    <video src="${file.path}" class="w-full h-full object-cover ${this.isProtected ? 'no-drag' : ''}" preload="metadata"></video>
                    <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 pointer-events-none">
                        <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>`;
        } else if (isAudio) {
            mediaElement = `
                <div class="relative w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                </div>`;
        } else {
            mediaElement = `<img src="${file.path}" alt="${file.name}" ${this.isProtected ? 'class="no-drag"' : ''}>`;
        }

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

        // Configurar event listeners según el tipo y protección
        if (this.isProtected) {
            // Para contenido protegido, usar reproductor personalizado
            element.addEventListener('click', () => {
                this.showProtectedMediaViewer(file);
            });
        } else {
            // Para contenido no protegido, permitir visualización normal
            if (isVideo || isAudio) {
                element.addEventListener('click', () => {
                    this.showMediaViewer(file);
                });
            } else {
                element.addEventListener('click', () => {
                    this.showImageViewer(file);
                });
            }
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

        document.getElementById('viewerImage').src = file.path;
        document.getElementById('viewerTitle').textContent = file.name;
        document.getElementById('viewerDescription').textContent = file.description || 'Sin descripción';
        document.getElementById('imageViewerModal').classList.remove('hidden');
    }

    /**
     * Muestra el visor de medios (video/audio)
     * @param {Object} file - Datos del archivo
     */
    showMediaViewer(file) {
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        
        const viewerContainer = document.getElementById('imageViewerModal');
        const imageElement = document.getElementById('viewerImage');
        
        // Limpiar contenido anterior
        const existingMedia = viewerContainer.querySelector('video, audio, .media-container');
        if (existingMedia) {
            existingMedia.remove();
        }
        
        if (isVideo) {
            imageElement.style.display = 'none';
            const videoElement = document.createElement('video');
            videoElement.src = file.path;
            videoElement.controls = true;
            videoElement.className = 'max-w-full max-h-screen object-contain mx-auto rounded-lg';
            videoElement.style.maxHeight = '80vh';
            imageElement.parentNode.insertBefore(videoElement, imageElement);
        } else if (isAudio) {
            imageElement.style.display = 'none';
            const audioContainer = document.createElement('div');
            audioContainer.className = 'media-container flex flex-col items-center justify-center p-8';
            audioContainer.innerHTML = `
                <div class="w-48 h-48 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6">
                    <svg class="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                </div>
                <audio src="${file.path}" controls class="w-full max-w-md">
                    Tu navegador no soporta la reproducción de audio.
                </audio>
            `;
            imageElement.parentNode.insertBefore(audioContainer, imageElement);
        }
        
        document.getElementById('viewerTitle').textContent = file.name;
        document.getElementById('viewerDescription').textContent = file.description || 'Sin descripción';
        viewerContainer.classList.remove('hidden');
    }

    /**
     * Muestra el visor protegido para medios
     * @param {Object} file - Datos del archivo
     */
    showProtectedMediaViewer(file) {
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        
        const viewerContainer = document.getElementById('imageViewerModal');
        const imageElement = document.getElementById('viewerImage');
        
        // Limpiar contenido anterior
        const existingMedia = viewerContainer.querySelector('video, audio, .media-container');
        if (existingMedia) {
            existingMedia.remove();
        }
        
        if (isVideo) {
            imageElement.style.display = 'none';
            const videoContainer = document.createElement('div');
            videoContainer.className = 'media-container protected-content no-context-menu';
            videoContainer.innerHTML = `
                <video src="${file.path}" controls class="max-w-full max-h-screen object-contain mx-auto rounded-lg no-drag" 
                       style="max-height: 80vh;" controlsList="nodownload" disablePictureInPicture>
                    Tu navegador no soporta la reproducción de video.
                </video>
            `;
            imageElement.parentNode.insertBefore(videoContainer, imageElement);
        } else if (isAudio) {
            imageElement.style.display = 'none';
            const audioContainer = document.createElement('div');
            audioContainer.className = 'media-container protected-content no-context-menu flex flex-col items-center justify-center p-8';
            audioContainer.innerHTML = `
                <div class="w-48 h-48 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6">
                    <svg class="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                </div>
                <audio src="${file.path}" controls class="w-full max-w-md no-drag" controlsList="nodownload">
                    Tu navegador no soporta la reproducción de audio.
                </audio>
            `;
            imageElement.parentNode.insertBefore(audioContainer, imageElement);
        } else {
            // Para imágenes protegidas, mostrar mensaje
            this.showProtectedMessage();
            return;
        }
        
        document.getElementById('viewerTitle').textContent = file.name;
        document.getElementById('viewerDescription').textContent = file.description || 'Sin descripción';
        viewerContainer.classList.remove('hidden');
    }
    /**
     * Oculta el visor de imágenes
     */
    hideImageViewer() {
        // Limpiar elementos de media
        const viewerContainer = document.getElementById('imageViewerModal');
        const existingMedia = viewerContainer.querySelectorAll('video, audio, .media-container');
        existingMedia.forEach(el => el.remove());
        
        // Restaurar imagen
        document.getElementById('viewerImage').style.display = 'block';
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
