
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
        const viewerContainer = document.getElementById('imageViewerModal');
        const imageElement = document.getElementById('viewerImage');
        
        // Limpiar contenido anterior
        const existingMedia = viewerContainer.querySelector('.custom-protected-player');
        if (existingMedia) {
            existingMedia.remove();
        }
        
        imageElement.style.display = 'block';
        imageElement.src = file.path;
        
        const titleElement = document.getElementById('viewerTitle');
        const descElement = document.getElementById('viewerDescription');
        if (titleElement) titleElement.textContent = file.name;
        if (descElement) descElement.textContent = file.description || 'Sin descripción';
        
        viewerContainer.classList.remove('hidden');
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
        const existingMedia = viewerContainer.querySelector('.custom-protected-player');
        if (existingMedia) {
            existingMedia.remove();
        }
        
        imageElement.style.display = 'none';
        
        if (isVideo) {
            this.createProtectedVideoPlayer(file, imageElement.parentNode, imageElement);
        } else if (isAudio) {
            this.createProtectedAudioPlayer(file, imageElement.parentNode, imageElement);
        }
        
        const titleElement = document.getElementById('viewerTitle');
        const descElement = document.getElementById('viewerDescription');
        if (titleElement) titleElement.textContent = file.name;
        if (descElement) descElement.textContent = file.description || 'Sin descripción';
        
        viewerContainer.classList.remove('hidden');
    }

    /**
     * Crea un reproductor de video protegido personalizado
     */
    createProtectedVideoPlayer(file, container, beforeElement) {
        const playerId = 'protectedVideo_' + Date.now();
        const playerContainer = document.createElement('div');
        playerContainer.className = 'custom-protected-player relative max-w-4xl mx-auto bg-black rounded-lg overflow-hidden';
        
        playerContainer.innerHTML = `
            <video id="${playerId}" class="w-full max-h-[80vh] object-contain" 
                   src="${file.path}" 
                   preload="metadata"
                   style="outline: none;">
                Tu navegador no soporta la reproducción de video.
            </video>
            
            <!-- Controles personalizados -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
                <div class="flex items-center space-x-4">
                    <button id="playBtn_${playerId}" class="text-white hover:text-blue-400 transition-colors">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    
                    <div class="flex-1 flex items-center space-x-2">
                        <span id="currentTime_${playerId}" class="text-white text-sm">0:00</span>
                        <div class="flex-1 bg-gray-600 rounded-full h-2 cursor-pointer" id="progressBar_${playerId}">
                            <div class="bg-blue-500 h-2 rounded-full transition-all" id="progress_${playerId}" style="width: 0%"></div>
                        </div>
                        <span id="duration_${playerId}" class="text-white text-sm">0:00</span>
                    </div>
                    
                    <button id="muteBtn_${playerId}" class="text-white hover:text-blue-400 transition-colors">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                    </button>
                    
                    <button id="fullscreenBtn_${playerId}" class="text-white hover:text-blue-400 transition-colors">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        container.insertBefore(playerContainer, beforeElement);
        this.initializeVideoControls(playerId);
    }

    /**
     * Crea un reproductor de audio protegido personalizado
     */
    createProtectedAudioPlayer(file, container, beforeElement) {
        const playerId = 'protectedAudio_' + Date.now();
        const playerContainer = document.createElement('div');
        playerContainer.className = 'custom-protected-player flex flex-col items-center justify-center p-8 max-w-2xl mx-auto';
        
        playerContainer.innerHTML = `
            <div class="w-64 h-64 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-8 shadow-2xl relative">
                <svg class="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                
                <!-- Indicador de reproducción -->
                <div id="playIndicator_${playerId}" class="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center opacity-0 transition-opacity">
                    <div class="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                </div>
            </div>
            
            <audio id="${playerId}" src="${file.path}" preload="metadata" style="display: none;">
                Tu navegador no soporta la reproducción de audio.
            </audio>
            
            <!-- Controles personalizados -->
            <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 w-full max-w-lg">
                <div class="flex items-center space-x-4 mb-4">
                    <button id="playBtn_${playerId}" class="text-white hover:text-blue-400 transition-colors">
                        <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    
                    <div class="flex-1">
                        <div class="text-white font-medium text-lg mb-1 truncate">${file.name}</div>
                        <div class="flex items-center space-x-2">
                            <span id="currentTime_${playerId}" class="text-white text-sm">0:00</span>
                            <div class="flex-1 bg-white bg-opacity-30 rounded-full h-2 cursor-pointer" id="progressBar_${playerId}">
                                <div class="bg-white h-2 rounded-full transition-all" id="progress_${playerId}" style="width: 0%"></div>
                            </div>
                            <span id="duration_${playerId}" class="text-white text-sm">0:00</span>
                        </div>
                    </div>
                    
                    <button id="muteBtn_${playerId}" class="text-white hover:text-blue-400 transition-colors">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        container.insertBefore(playerContainer, beforeElement);
        this.initializeAudioControls(playerId);
    }

    /**
     * Inicializa los controles del reproductor de video
     */
    initializeVideoControls(playerId) {
        const video = document.getElementById(playerId);
        const playBtn = document.getElementById(`playBtn_${playerId}`);
        const progressBar = document.getElementById(`progressBar_${playerId}`);
        const progress = document.getElementById(`progress_${playerId}`);
        const currentTime = document.getElementById(`currentTime_${playerId}`);
        const duration = document.getElementById(`duration_${playerId}`);
        const muteBtn = document.getElementById(`muteBtn_${playerId}`);
        const fullscreenBtn = document.getElementById(`fullscreenBtn_${playerId}`);

        // Play/Pause
        playBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playBtn.innerHTML = '<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            } else {
                video.pause();
                playBtn.innerHTML = '<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
            }
        });

        // Progress bar
        video.addEventListener('timeupdate', () => {
            const percent = (video.currentTime / video.duration) * 100;
            progress.style.width = percent + '%';
            currentTime.textContent = this.formatTime(video.currentTime);
        });

        video.addEventListener('loadedmetadata', () => {
            duration.textContent = this.formatTime(video.duration);
        });

        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            video.currentTime = percent * video.duration;
        });

        // Mute
        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            muteBtn.innerHTML = video.muted ? 
                '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>' :
                '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
        });

        // Fullscreen
        fullscreenBtn.addEventListener('click', () => {
            if (video.requestFullscreen) {
                video.requestFullscreen();
            }
        });
    }

    /**
     * Inicializa los controles del reproductor de audio
     */
    initializeAudioControls(playerId) {
        const audio = document.getElementById(playerId);
        const playBtn = document.getElementById(`playBtn_${playerId}`);
        const progressBar = document.getElementById(`progressBar_${playerId}`);
        const progress = document.getElementById(`progress_${playerId}`);
        const currentTime = document.getElementById(`currentTime_${playerId}`);
        const duration = document.getElementById(`duration_${playerId}`);
        const muteBtn = document.getElementById(`muteBtn_${playerId}`);
        const playIndicator = document.getElementById(`playIndicator_${playerId}`);

        // Play/Pause
        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playBtn.innerHTML = '<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
                playIndicator.style.opacity = '1';
            } else {
                audio.pause();
                playBtn.innerHTML = '<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
                playIndicator.style.opacity = '0';
            }
        });

        // Progress bar
        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            progress.style.width = percent + '%';
            currentTime.textContent = this.formatTime(audio.currentTime);
        });

        audio.addEventListener('loadedmetadata', () => {
            duration.textContent = this.formatTime(audio.duration);
        });

        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        });

        // Mute
        muteBtn.addEventListener('click', () => {
            audio.muted = !audio.muted;
            muteBtn.innerHTML = audio.muted ? 
                '<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>' :
                '<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
        });

        // Auto-hide indicator when audio ends
        audio.addEventListener('ended', () => {
            playIndicator.style.opacity = '0';
            playBtn.innerHTML = '<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        });
    }

    /**
     * Formatea tiempo en segundos a MM:SS
     */
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Oculta el visor de imágenes
     */
    hideImageViewer() {
        // Limpiar elementos de media
        const viewerContainer = document.getElementById('imageViewerModal');
        const existingMedia = viewerContainer.querySelectorAll('.custom-protected-player');
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
