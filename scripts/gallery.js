/**
 * Script principal para la galería de imágenes
 * Maneja la subida de archivos, navegación, y visualización de la galería
 * Actualizado con gestión de metadatos, búsqueda y descargas
 */

class GalleryApp {
    constructor() {
        this.auth = new AuthManager();
        this.storage = new StorageManager();
        this.currentUser = null;
        this.currentFolder = 'root';
        this.selectedFiles = new Set();
        this.userData = null;
        this.currentImageFile = null; // Para el visor de imágenes
        
        // Inicializar gestores
        this.fileDetailsManager = null;
        this.searchManager = null;
        this.downloadManager = null;
        this.selectionManager = null;
        this.shareManager = null;
        
        this.init();
    }

    /**
     * Inicializa la aplicación de galería
     */
    async init() {
        // Verificar autenticación
        if (!this.auth.isLoggedIn()) {
            window.location.href = this.getCurrentUrl();
            return;
        }

        this.currentUser = this.auth.getCurrentUser();
        
        try {
            this.userData = await this.storage.loadUserData(this.currentUser.id);
            
            if (!this.userData) {
                alert('Error cargando datos de usuario');
                this.auth.logout();
                return;
            }

            // Inicializar gestores después de cargar datos
            this.fileDetailsManager = new FileDetailsManager(this.storage, this);
            this.searchManager = new SearchManager(this);
            this.downloadManager = new DownloadManager(this.storage, this);
            this.selectionManager = new SelectionManager(this);
            this.shareManager = new ShareManager(this.storage, this);

            this.setupEventListeners();
            this.updateUI();
            this.loadGallery();
            this.loadSharedFolders();
        } catch (error) {
            console.error('Error inicializando aplicación:', error);
            alert('Error cargando la aplicación');
        }
    }

    /**
     * Obtiene la URL base actual dinámicamente
     */
    getCurrentUrl() {
        const protocol = window.location.protocol;
        const host = window.location.host;
        const pathname = window.location.pathname;
        const basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        return `${protocol}//${host}${basePath}`;
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Header actions
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Upload area
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Folder management
        document.getElementById('createFolderBtn').addEventListener('click', () => this.showCreateFolderModal());
        document.getElementById('createFolderForm').addEventListener('submit', (e) => this.handleCreateFolder(e));
        document.getElementById('cancelCreateFolder').addEventListener('click', () => this.hideCreateFolderModal());

        // Share folder
        document.getElementById('shareCurrentFolderBtn').addEventListener('click', () => this.showShareFolderModal());
        document.getElementById('generateShareLink').addEventListener('click', () => this.generateShareLink());
        document.getElementById('cancelShareFolder').addEventListener('click', () => this.hideShareFolderModal());
        document.getElementById('copyShareLink').addEventListener('click', () => this.copyShareLink());

        // Selection handled by SelectionManager

        // Image viewer
        document.getElementById('closeImageViewer').addEventListener('click', () => this.hideImageViewer());
        document.getElementById('imageViewerModal').addEventListener('click', (e) => {
            if (e.target.id === 'imageViewerModal') this.hideImageViewer();
        });

        // Modal close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideCreateFolderModal();
                this.hideShareFolderModal();
                this.hideImageViewer();
            }
        });

        // Prevent default drag behavior
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    /**
     * Carga las carpetas compartidas del usuario
     */
    async loadSharedFolders() {
        try {
            const shares = await this.shareManager.getUserShares(this.currentUser.id);
            this.displaySharedFolders(shares);
        } catch (error) {
            console.error('Error cargando carpetas compartidas:', error);
        }
    }

    /**
     * Muestra las carpetas compartidas en el sidebar
     */
    displaySharedFolders(shares) {
        const sidebar = document.querySelector('aside .p-4');
        
        // Remover sección anterior si existe
        const existingSection = document.getElementById('sharedFoldersSection');
        if (existingSection) {
            existingSection.remove();
        }

        if (shares.length === 0) return;

        const section = document.createElement('div');
        section.id = 'sharedFoldersSection';
        section.className = 'mt-6 pt-6 border-t border-gray-200';
        section.innerHTML = `
            <h3 class="text-sm font-medium text-gray-700 mb-3">Carpetas Compartidas</h3>
            <div class="space-y-2">
                ${shares.map(share => `
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">
                                ${this.userData.folders[share.folderId]?.name || 'Carpeta'}
                            </p>
                            <p class="text-xs text-gray-500">
                                ${share.protectedDownload ? '🔒 Protegida' : '📂 Pública'}
                            </p>
                        </div>
                        <div class="flex space-x-1">
                            <button onclick="gallery.copyShareUrl('${share.url}')" class="p-1 text-blue-600 hover:text-blue-800" title="Copiar enlace">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                </svg>
                            </button>
                            <button onclick="gallery.deleteShare('${share.shareId}')" class="p-1 text-red-600 hover:text-red-800" title="Dejar de compartir">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        sidebar.appendChild(section);
    }

    /**
     * Copia la URL de compartir
     */
    copyShareUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('Enlace copiado al portapapeles', 'success');
        }).catch(() => {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Enlace copiado al portapapeles', 'success');
        });
    }

    /**
     * Elimina un enlace compartido
     */
    async deleteShare(shareId) {
        if (confirm('¿Estás seguro de que quieres dejar de compartir esta carpeta?')) {
            try {
                await this.shareManager.deleteShare(shareId, this.currentUser.id);
                this.loadSharedFolders();
                this.showToast('Enlace eliminado correctamente', 'success');
            } catch (error) {
                console.error('Error eliminando enlace:', error);
                this.showToast('Error al eliminar enlace', 'error');
            }
        }
    }

    /**
     * Actualiza la interfaz con información del usuario
     */
    updateUI() {
        document.getElementById('userWelcome').textContent = `Hola, ${this.currentUser.username}`;
        this.updateFolderNavigation();
        this.updateBreadcrumb();
    }

    /**
     * Carga la galería actual
     */
    async loadGallery() {
        this.showLoading();
        
        setTimeout(async () => {
            try {
                const folder = this.userData.folders[this.currentFolder];
                if (!folder) {
                    this.showEmpty();
                    return;
                }

                await this.renderGallery(folder);
                this.selectionManager.clearSelection();
                this.selectionManager.updateSelectionActions();
            } catch (error) {
                console.error('Error cargando galería:', error);
                this.showEmpty();
            }
        }, 500);
    }

    /**
     * Renderiza la galería
     * @param {Object} folder - Datos de la carpeta
     */
    async renderGallery(folder) {
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';

        let hasContent = false;

        // Renderizar subcarpetas
        if (folder.subfolders && folder.subfolders.length > 0) {
            folder.subfolders.forEach(subfolderId => {
                const subfolder = this.userData.folders[subfolderId];
                if (subfolder) {
                    grid.appendChild(this.createFolderElement(subfolder));
                    hasContent = true;
                }
            });
        }

        // Renderizar archivos
        if (folder.files && folder.files.length > 0) {
            for (const fileId of folder.files) {
                try {
                    const file = await this.storage.getFile(fileId);
                    if (file) {
                        grid.appendChild(this.createFileElement(file));
                        hasContent = true;
                    }
                } catch (error) {
                    console.error('Error cargando archivo:', fileId, error);
                }
            }
        }

        if (hasContent) {
            this.showGallery();
        } else {
            this.showEmpty();
        }
    }

    /**
     * Crea un elemento de archivo con metadatos y opciones mejoradas
     * @param {Object} file - Datos del archivo
     * @returns {HTMLElement} Elemento DOM
     */
    createFileElement(file) {
        const element = document.createElement('div');
        element.className = 'gallery-item relative bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow';
        element.dataset.fileId = file.id;
        
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        
        let mediaElement;
        if (isVideo) {
            mediaElement = `
                <div class="relative w-full h-40 bg-gray-900 flex items-center justify-center">
                    <video src="${file.path}" class="w-full h-full object-cover" preload="metadata"></video>
                    <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                        <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>`;
        } else if (isAudio) {
            mediaElement = `
                <div class="relative w-full h-40 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                    <div class="absolute bottom-2 left-2 right-2">
                        <div class="text-white text-xs font-medium truncate">${file.name}</div>
                    </div>
                </div>`;
        } else {
            mediaElement = `<img src="${file.path}" alt="${file.name}" class="w-full h-40 object-cover">`;
        }

        // Formatear fecha de captura o creación
        const displayDate = file.captureDate ? 
            new Date(file.captureDate).toLocaleDateString('es-ES') :
            (file.createdAt ? new Date(file.createdAt).toLocaleDateString('es-ES') : 'Sin fecha');

        // Información adicional del archivo
        const fileInfo = [];
        if (file.camera) fileInfo.push(`📷 ${file.camera}`);
        if (file.location) fileInfo.push(`📍 ${file.location}`);
        if (file.tags && file.tags.length) fileInfo.push(`🏷️ ${file.tags.slice(0, 2).join(', ')}`);

        element.innerHTML = `
            <div class="gallery-item-select absolute top-2 left-2 z-10">
                <input type="checkbox" onchange="gallery.selectionManager.toggleSelection('${file.id}', 'file')" 
                       class="w-4 h-4 text-blue-600 rounded">
            </div>
            <div class="gallery-item-actions absolute top-2 right-2 z-10 flex space-x-1">
                <button class="gallery-item-action p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70" 
                        onclick="gallery.fileDetailsManager.showFileDetails(${JSON.stringify(file).replace(/"/g, '&quot;')})" 
                        title="Ver detalles">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </button>
                <button class="gallery-item-action p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70" 
                        onclick="gallery.downloadManager.downloadFile('${file.id}')" 
                        title="Descargar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </button>
                <button class="gallery-item-action p-1 bg-black bg-opacity-50 text-red-400 rounded hover:bg-opacity-70" 
                        onclick="gallery.deleteFile('${file.id}')" 
                        title="Eliminar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
            ${mediaElement}
            <div class="p-3">
                <h4 class="font-semibold text-sm text-gray-900 truncate">${file.name}</h4>
                <p class="text-xs text-gray-600 mt-1">
                    ${file.description || 'Sin descripción'}
                </p>
                <div class="text-xs text-gray-500 mt-1">
                    <div>📅 ${displayDate}</div>
                    ${fileInfo.length > 0 ? `<div class="mt-1">${fileInfo.join(' • ')}</div>` : ''}
                    ${file.notes ? `<div class="mt-1 italic">💭 ${file.notes.substring(0, 50)}${file.notes.length > 50 ? '...' : ''}</div>` : ''}
                </div>
            </div>
        `;

        // Agregar event listeners según el tipo de archivo
        if (isVideo || isAudio) {
            const mediaContainer = element.querySelector('.relative');
            if (mediaContainer) {
                mediaContainer.addEventListener('click', (e) => {
                    if (!e.target.closest('.gallery-item-select') && !e.target.closest('.gallery-item-actions')) {
                        this.showMediaViewer(file);
                    }
                });
            }
        } else {
            const mediaImg = element.querySelector('img');
            if (mediaImg) {
                mediaImg.addEventListener('click', (e) => {
                    if (!e.target.closest('.gallery-item-select') && !e.target.closest('.gallery-item-actions')) {
                        this.showImageViewer(file);
                    }
                });
            }
        }

        return element;
    }

    /**
     * Crea un elemento de carpeta con opción de descarga
     * @param {Object} folder - Datos de la carpeta
     * @returns {HTMLElement} Elemento DOM
     */
    createFolderElement(folder) {
        const element = document.createElement('div');
        element.className = 'folder-item';
        element.dataset.folderId = folder.id;
        
        element.innerHTML = `
            <div class="folder-item-select">
                <input type="checkbox" onchange="gallery.selectionManager.toggleSelection('${folder.id}', 'folder')">
            </div>
            <div class="folder-item-actions">
                <button class="gallery-item-action" onclick="gallery.downloadManager.downloadFolder('${folder.id}')" title="Descargar carpeta">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </button>
                <button class="gallery-item-action" onclick="gallery.shareFolder('${folder.id}')" title="Compartir">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                    </svg>
                </button>
                <button class="gallery-item-action" onclick="gallery.deleteFolder('${folder.id}')" title="Eliminar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
            <div class="folder-item-icon">📁</div>
            <div class="folder-item-name">${folder.name}</div>
            <div class="folder-item-info">
                ${folder.files ? folder.files.length : 0} archivos
            </div>
        `;

        element.addEventListener('click', (e) => {
            if (!e.target.closest('.folder-item-select') && !e.target.closest('.folder-item-actions')) {
                this.navigateToFolder(folder.id);
            }
        });

        return element;
    }

    /**
     * Maneja el arrastre sobre el área de subida
     * @param {Event} e - Evento de arrastre
     */
    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    /**
     * Maneja cuando sale del área de arrastre
     * @param {Event} e - Evento de arrastre
     */
    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    /**
     * Maneja el soltar archivos
     * @param {Event} e - Evento de soltar
     */
    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.uploadFiles(files);
    }

    /**
     * Maneja la selección de archivos
     * @param {Event} e - Evento de selección
     */
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.uploadFiles(files);
        e.target.value = ''; // Limpiar input
    }

    /**
     * Sube archivos al servidor
     * @param {Array} files - Lista de archivos
     */
    async uploadFiles(files) {
        if (files.length === 0) return;

        try {
            for (const file of files) {
                await this.storage.saveFile(this.currentUser.id, file, this.currentFolder);
            }

            // Recargar datos y galería
            this.userData = await this.storage.loadUserData(this.currentUser.id);
            this.loadGallery();
            
            this.showToast(`${files.length} archivo(s) subido(s) correctamente`, 'success');
        } catch (error) {
            console.error('Error subiendo archivos:', error);
            this.showToast('Error al subir archivos: ' + error.message, 'error');
        }
    }

    /**
     * Navega a una carpeta específica
     * @param {string} folderId - ID de la carpeta
     */
    navigateToFolder(folderId) {
        this.currentFolder = folderId;
        this.selectionManager.clearSelection();
        this.updateUI();
        this.loadGallery();
    }

    /**
     * Actualiza la navegación de carpetas
     */
    updateFolderNavigation() {
        const nav = document.getElementById('folderNav');
        nav.innerHTML = '';

        // Carpeta raíz
        const rootItem = this.createNavItem('root', 'Mi Galería', '🏠', this.currentFolder === 'root');
        nav.appendChild(rootItem);

        // Otras carpetas
        for (const folderId in this.userData.folders) {
            if (folderId !== 'root') {
                const folder = this.userData.folders[folderId];
                const item = this.createNavItem(folderId, folder.name, '📁', this.currentFolder === folderId);
                nav.appendChild(item);
            }
        }
    }

    /**
     * Crea un elemento de navegación
     * @param {string} folderId - ID de la carpeta
     * @param {string} name - Nombre de la carpeta
     * @param {string} icon - Icono de la carpeta
     * @param {boolean} active - Si está activa
     * @returns {HTMLElement} Elemento DOM
     */
    createNavItem(folderId, name, icon, active = false) {
        const item = document.createElement('a');
        item.className = `folder-nav-item ${active ? 'active' : ''}`;
        item.href = '#';
        item.innerHTML = `
            <span class="mr-2">${icon}</span>
            <span class="truncate">${name}</span>
        `;
        
        item.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToFolder(folderId);
        });

        return item;
    }

    /**
     * Actualiza el breadcrumb
     */
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = '';

        if (this.currentFolder === 'root') {
            breadcrumb.innerHTML = '<span class="breadcrumb-item active">Mi Galería</span>';
        } else {
            // Home link
            const homeLink = document.createElement('a');
            homeLink.className = 'breadcrumb-item';
            homeLink.href = '#';
            homeLink.textContent = 'Mi Galería';
            homeLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToFolder('root');
            });
            breadcrumb.appendChild(homeLink);

            // Separator
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '/';
            breadcrumb.appendChild(separator);

            // Current folder
            const currentFolder = this.userData.folders[this.currentFolder];
            const current = document.createElement('span');
            current.className = 'breadcrumb-item active';
            current.textContent = currentFolder ? currentFolder.name : 'Carpeta';
            breadcrumb.appendChild(current);
        }
    }

    /**
     * Muestra el modal para crear carpeta
     */
    showCreateFolderModal() {
        document.getElementById('createFolderModal').classList.remove('hidden');
        document.getElementById('folderNameInput').focus();
    }

    /**
     * Oculta el modal para crear carpeta
     */
    hideCreateFolderModal() {
        document.getElementById('createFolderModal').classList.add('hidden');
        document.getElementById('folderNameInput').value = '';
    }

    /**
     * Maneja la creación de carpeta
     * @param {Event} e - Evento del formulario
     */
    async handleCreateFolder(e) {
        e.preventDefault();
        
        const name = document.getElementById('folderNameInput').value.trim();
        if (!name) return;

        try {
            await this.storage.createFolder(this.currentUser.id, name, this.currentFolder);
            this.userData = await this.storage.loadUserData(this.currentUser.id);
            this.hideCreateFolderModal();
            this.updateUI();
            this.loadGallery();
            this.showToast('Carpeta creada correctamente', 'success');
        } catch (error) {
            console.error('Error creando carpeta:', error);
            this.showToast('Error al crear carpeta: ' + error.message, 'error');
        }
    }

    /**
     * Elimina una carpeta
     * @param {string} folderId - ID de la carpeta
     */
    async deleteFolder(folderId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta carpeta y todo su contenido?')) {
            try {
                await this.storage.deleteFolder(this.currentUser.id, folderId, this.currentFolder);
                this.userData = await this.storage.loadUserData(this.currentUser.id);
                this.updateUI();
                this.loadGallery();
                this.showToast('Carpeta eliminada correctamente', 'success');
            } catch (error) {
                console.error('Error eliminando carpeta:', error);
                this.showToast('Error al eliminar carpeta: ' + error.message, 'error');
            }
        }
    }

    /**
     * Elimina un archivo
     * @param {string} fileId - ID del archivo
     */
    async deleteFile(fileId) {
        if (confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
            try {
                await this.storage.deleteFile(this.currentUser.id, fileId, this.currentFolder);
                this.userData = await this.storage.loadUserData(this.currentUser.id);
                this.loadGallery();
                this.showToast('Archivo eliminado correctamente', 'success');
            } catch (error) {
                console.error('Error eliminando archivo:', error);
                this.showToast('Error al eliminar archivo: ' + error.message, 'error');
            }
        }
    }

    /**
     * Descarga la imagen actual del visor
     */
    downloadCurrentImage() {
        if (this.currentImageFile) {
            this.downloadManager.downloadFile(this.currentImageFile.id);
        }
    }

    /**
     * Edita la imagen actual del visor
     */
    editCurrentImage() {
        if (this.currentImageFile) {
            this.hideImageViewer();
            this.fileDetailsManager.showFileDetails(this.currentImageFile);
        }
    }

    /**
     * Comparte la imagen actual del visor
     */
    async shareCurrentImage() {
        if (this.currentImageFile) {
            try {
                const baseUrl = this.getCurrentUrl();
                const shareUrl = `${baseUrl}share.html?file=${this.currentImageFile.id}`;
                
                await navigator.clipboard.writeText(shareUrl);
                this.showToast('Enlace de imagen copiado al portapapeles', 'success');
            } catch (error) {
                console.error('Error compartiendo imagen:', error);
                this.showToast('Error al compartir imagen', 'error');
            }
        }
    }

    /**
     * Descarga archivos seleccionados
     */
    downloadSelected() {
        this.downloadManager.downloadSelected(this.selectionManager.selectedItems);
    }

    /**
     * Muestra el visor de imágenes con controles mejorados
     * @param {Object} file - Datos del archivo
     */
    showImageViewer(file) {
        this.currentImageFile = file;
        
        const viewerContainer = document.getElementById('imageViewerModal');
        const imageElement = document.getElementById('viewerImage');
        
        // Limpiar contenido anterior
        const existingMedia = viewerContainer.querySelector('video, audio, .custom-media-player');
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
        this.currentImageFile = file;
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        
        const viewerContainer = document.getElementById('imageViewerModal');
        const imageElement = document.getElementById('viewerImage');
        
        // Limpiar contenido anterior
        const existingMedia = viewerContainer.querySelector('video, audio, .custom-media-player');
        if (existingMedia) {
            existingMedia.remove();
        }
        
        imageElement.style.display = 'none';
        
        if (isVideo) {
            this.createCustomVideoPlayer(file, imageElement.parentNode, imageElement);
        } else if (isAudio) {
            this.createCustomAudioPlayer(file, imageElement.parentNode, imageElement);
        }
        
        const titleElement = document.getElementById('viewerTitle');
        const descElement = document.getElementById('viewerDescription');
        if (titleElement) titleElement.textContent = file.name;
        if (descElement) descElement.textContent = file.description || 'Sin descripción';
        
        viewerContainer.classList.remove('hidden');
    }

    /**
     * Crea un reproductor de video personalizado
     */
    createCustomVideoPlayer(file, container, beforeElement) {
        const playerContainer = document.createElement('div');
        playerContainer.className = 'custom-media-player relative max-w-4xl mx-auto';
        
        playerContainer.innerHTML = `
            <video class="w-full max-h-[80vh] object-contain rounded-lg bg-black" 
                   src="${file.path}" 
                   controls
                   preload="metadata">
                Tu navegador no soporta la reproducción de video.
            </video>
        `;
        
        container.insertBefore(playerContainer, beforeElement);
    }

    /**
     * Crea un reproductor de audio personalizado
     */
    createCustomAudioPlayer(file, container, beforeElement) {
        const playerContainer = document.createElement('div');
        playerContainer.className = 'custom-media-player flex flex-col items-center justify-center p-8 max-w-2xl mx-auto';
        
        playerContainer.innerHTML = `
            <div class="w-64 h-64 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-8 shadow-2xl">
                <svg class="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
            </div>
            <audio src="${file.path}" controls class="w-full max-w-lg rounded-lg">
                Tu navegador no soporta la reproducción de audio.
            </audio>
        `;
        
        container.insertBefore(playerContainer, beforeElement);
    }

    /**
     * Oculta el visor de imágenes
     */
    hideImageViewer() {
        // Limpiar elementos de media
        const viewerContainer = document.getElementById('imageViewerModal');
        const existingMedia = viewerContainer.querySelectorAll('video, audio, .custom-media-player');
        existingMedia.forEach(el => el.remove());
        
        // Restaurar imagen
        document.getElementById('viewerImage').style.display = 'block';
        document.getElementById('imageViewerModal').classList.add('hidden');
        this.currentImageFile = null;
    }

    /**
     * Muestra el estado de carga
     */
    showLoading() {
        document.getElementById('loadingGallery').classList.remove('hidden');
        document.getElementById('galleryGrid').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    /**
     * Muestra la galería
     */
    showGallery() {
        document.getElementById('loadingGallery').classList.add('hidden');
        document.getElementById('galleryGrid').classList.remove('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    /**
     * Muestra el estado vacío
     */
    showEmpty() {
        document.getElementById('loadingGallery').classList.add('hidden');
        document.getElementById('galleryGrid').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
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

    /**
     * Cierra sesión con URL dinámica
     */
    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            this.auth.logout();
            window.location.href = this.getCurrentUrl();
        }
    }

    /**
     * Muestra el modal para compartir carpeta
     */
    showShareFolderModal() {
        document.getElementById('shareFolderModal').classList.remove('hidden');
        document.getElementById('generatedLink').classList.add('hidden');
        document.getElementById('protectDownloads').checked = false;
    }

    /**
     * Oculta el modal para compartir carpeta
     */
    hideShareFolderModal() {
        document.getElementById('shareFolderModal').classList.add('hidden');
    }

    /**
     * Genera un enlace para compartir con URL dinámica
     */
    async generateShareLink() {
        try {
            const protectDownloads = document.getElementById('protectDownloads').checked;
            const shareData = await this.shareManager.createShareLink(
                this.currentUser.id, 
                this.currentFolder, 
                protectDownloads
            );

            document.getElementById('shareUrl').value = shareData.url;
            document.getElementById('generatedLink').classList.remove('hidden');
            this.loadSharedFolders(); // Actualizar lista
            this.showToast('Enlace generado correctamente', 'success');
        } catch (error) {
            console.error('Error generando enlace:', error);
            this.showToast('Error al generar enlace: ' + error.message, 'error');
        }
    }

    /**
     * Copia el enlace compartido
     */
    copyShareLink() {
        const shareUrl = document.getElementById('shareUrl');
        shareUrl.select();
        shareUrl.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            this.showToast('Enlace copiado al portapapeles', 'success');
        } catch (error) {
            this.showToast('No se pudo copiar el enlace', 'error');
        }
    }

    /**
     * Comparte una carpeta específica
     * @param {string} folderId - ID de la carpeta
     */
    shareFolder(folderId) {
        const originalFolder = this.currentFolder;
        this.currentFolder = folderId;
        this.showShareFolderModal();
        this.currentFolder = originalFolder;
    }
}

// Crear instancia global para acceso desde eventos inline
let gallery;

// Variables globales para gestores
let searchManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    gallery = new GalleryApp();
});
