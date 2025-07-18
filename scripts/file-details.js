
/**
 * Gestor de detalles y metadatos de archivos
 * Maneja la edición de metadatos, observaciones y visualización de detalles
 */

class FileDetailsManager {
    constructor(storage, gallery) {
        this.storage = storage;
        this.gallery = gallery;
        this.currentFile = null;
        this.setupEventListeners();
    }

    /**
     * Configura los event listeners para el modal de detalles
     */
    setupEventListeners() {
        // Modal de detalles
        document.getElementById('closeFileDetails').addEventListener('click', () => this.hideFileDetails());
        document.getElementById('fileDetailsModal').addEventListener('click', (e) => {
            if (e.target.id === 'fileDetailsModal') this.hideFileDetails();
        });

        // Formulario de edición
        document.getElementById('fileDetailsForm').addEventListener('submit', (e) => this.saveFileDetails(e));
        document.getElementById('cancelFileDetails').addEventListener('click', () => this.hideFileDetails());

        // Extractor de metadatos
        document.getElementById('extractMetadata').addEventListener('click', () => this.extractMetadata());

        // Escape para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideFileDetails();
        });
    }

    /**
     * Muestra los detalles de un archivo
     * @param {Object} file - Datos del archivo
     */
    async showFileDetails(file) {
        try {
            this.currentFile = file;
            
            // Cargar datos completos del archivo
            const fullFileData = await this.storage.getFile(file.id);
            if (!fullFileData) {
                this.gallery.showToast('Error cargando detalles del archivo', 'error');
                return;
            }

            // Rellenar formulario
            this.populateDetailsForm(fullFileData);
            
            // Mostrar modal
            document.getElementById('fileDetailsModal').classList.remove('hidden');
        } catch (error) {
            console.error('Error mostrando detalles:', error);
            this.gallery.showToast('Error al cargar detalles', 'error');
        }
    }

    /**
     * Rellena el formulario con los datos del archivo
     * @param {Object} file - Datos del archivo
     */
    populateDetailsForm(file) {
        document.getElementById('detailFileName').value = file.name || '';
        document.getElementById('detailDescription').value = file.description || '';
        document.getElementById('detailTags').value = (file.tags || []).join(', ');
        document.getElementById('detailCaptureDate').value = file.captureDate || '';
        document.getElementById('detailNotes').value = file.notes || '';

        // Información de archivo (solo lectura)
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size || 0);
        document.getElementById('fileType').textContent = file.type || 'Desconocido';
        document.getElementById('fileCreated').textContent = this.formatDate(file.createdAt);
        document.getElementById('fileModified').textContent = this.formatDate(file.modifiedAt);

        // Mostrar metadatos EXIF si existen
        this.displayExifData(file.exifData || {});
    }

    /**
     * Muestra los datos EXIF del archivo
     * @param {Object} exifData - Datos EXIF
     */
    displayExifData(exifData) {
        const container = document.getElementById('exifData');
        container.innerHTML = '';

        if (Object.keys(exifData).length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Sin metadatos EXIF disponibles</p>';
            return;
        }

        const exifList = document.createElement('div');
        exifList.className = 'space-y-1 text-sm';

        for (const [key, value] of Object.entries(exifData)) {
            if (value && value !== 'undefined') {
                const item = document.createElement('div');
                item.className = 'flex justify-between';
                item.innerHTML = `
                    <span class="font-medium text-gray-600">${this.formatExifKey(key)}:</span>
                    <span class="text-gray-800">${value}</span>
                `;
                exifList.appendChild(item);
            }
        }

        container.appendChild(exifList);
    }

    /**
     * Formatea las claves de EXIF para mostrarlas más amigables
     * @param {string} key - Clave EXIF
     * @returns {string} Clave formateada
     */
    formatExifKey(key) {
        const keyMap = {
            'DateTime': 'Fecha de captura',
            'DateTimeOriginal': 'Fecha original',
            'Camera': 'Cámara',
            'Make': 'Marca',
            'Model': 'Modelo',
            'ISO': 'ISO',
            'FNumber': 'Apertura',
            'ExposureTime': 'Velocidad',
            'FocalLength': 'Distancia focal',
            'Flash': 'Flash',
            'WhiteBalance': 'Balance de blancos',
            'Orientation': 'Orientación',
            'XResolution': 'Resolución X',
            'YResolution': 'Resolución Y'
        };

        return keyMap[key] || key;
    }

    /**
     * Extrae metadatos de la imagen
     */
    async extractMetadata() {
        if (!this.currentFile) return;

        try {
            // Mostrar indicador de carga
            document.getElementById('extractMetadata').disabled = true;
            document.getElementById('extractMetadata').textContent = 'Extrayendo...';

            if (this.currentFile.type.startsWith('image/')) {
                // Para imágenes, intentar extraer EXIF
                const img = new Image();
                img.onload = () => {
                    // Datos básicos de la imagen
                    const basicData = {
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        resolution: `${img.naturalWidth} x ${img.naturalHeight}`
                    };

                    // Intentar extraer fecha de nombre de archivo si sigue patrones comunes
                    const dateFromFilename = this.extractDateFromFilename(this.currentFile.name);
                    if (dateFromFilename) {
                        document.getElementById('detailCaptureDate').value = dateFromFilename;
                    }

                    this.displayExifData(basicData);
                    this.gallery.showToast('Metadatos básicos extraídos', 'success');
                };
                img.src = this.currentFile.path;
            } else if (this.currentFile.type.startsWith('video/')) {
                // Para videos, extraer información básica
                const video = document.createElement('video');
                video.onloadedmetadata = () => {
                    const videoData = {
                        duration: this.formatDuration(video.duration),
                        width: video.videoWidth,
                        height: video.videoHeight,
                        resolution: `${video.videoWidth} x ${video.videoHeight}`
                    };
                    
                    this.displayExifData(videoData);
                    this.gallery.showToast('Metadatos de video extraídos', 'success');
                };
                video.src = this.currentFile.path;
            } else if (this.currentFile.type.startsWith('audio/')) {
                // Para audio, extraer información básica
                const audio = document.createElement('audio');
                audio.onloadedmetadata = () => {
                    const audioData = {
                        duration: this.formatDuration(audio.duration),
                        format: this.currentFile.name.split('.').pop().toUpperCase()
                    };
                    
                    this.displayExifData(audioData);
                    this.gallery.showToast('Metadatos de audio extraídos', 'success');
                };
                audio.src = this.currentFile.path;
            }

        } catch (error) {
            console.error('Error extrayendo metadatos:', error);
            this.gallery.showToast('Error al extraer metadatos', 'error');
        } finally {
            document.getElementById('extractMetadata').disabled = false;
            document.getElementById('extractMetadata').textContent = 'Extraer Metadatos';
        }
    }

    /**
     * Formatea la duración en segundos a formato legible
     * @param {number} seconds - Duración en segundos
     * @returns {string} Duración formateada
     */
    formatDuration(seconds) {
        if (isNaN(seconds)) return 'Desconocida';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    /**
     * Intenta extraer fecha del nombre del archivo
     * @param {string} filename - Nombre del archivo
     * @returns {string|null} Fecha en formato YYYY-MM-DD
     */
    extractDateFromFilename(filename) {
        // Patrones comunes: IMG_20231215, 2023-12-15, 20231215, etc.
        const patterns = [
            /(\d{4})-(\d{2})-(\d{2})/,  // 2023-12-15
            /(\d{4})(\d{2})(\d{2})/,    // 20231215
            /IMG_(\d{4})(\d{2})(\d{2})/, // IMG_20231215
            /(\d{2})-(\d{2})-(\d{4})/   // 15-12-2023
        ];

        for (const pattern of patterns) {
            const match = filename.match(pattern);
            if (match) {
                if (pattern.source.includes('(\\d{2})-(\\d{2})-(\\d{4})')) {
                    // Formato DD-MM-YYYY
                    return `${match[3]}-${match[2]}-${match[1]}`;
                } else {
                    // Formato YYYY-MM-DD o variantes
                    return `${match[1]}-${match[2]}-${match[3]}`;
                }
            }
        }

        return null;
    }

    /**
     * Guarda los detalles del archivo
     * @param {Event} e - Evento del formulario
     */
    async saveFileDetails(e) {
        e.preventDefault();

        if (!this.currentFile) return;

        try {
            const formData = new FormData(e.target);
            const tags = formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag);

            const metadata = {
                name: formData.get('name'),
                description: formData.get('description'),
                tags: tags,
                captureDate: formData.get('captureDate'),
                notes: formData.get('notes'),
                modifiedAt: new Date().toISOString()
            };

            await this.storage.updateFileMetadata(this.currentFile.id, metadata);
            
            this.hideFileDetails();
            this.gallery.loadGallery(); // Recargar galería
            this.gallery.showToast('Detalles guardados correctamente', 'success');

        } catch (error) {
            console.error('Error guardando detalles:', error);
            this.gallery.showToast('Error al guardar detalles', 'error');
        }
    }

    /**
     * Oculta el modal de detalles
     */
    hideFileDetails() {
        document.getElementById('fileDetailsModal').classList.add('hidden');
        this.currentFile = null;
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
        if (!dateString) return 'No disponible';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Exportar para uso global
window.FileDetailsManager = FileDetailsManager;
