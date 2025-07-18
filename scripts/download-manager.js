
/**
 * Gestor de descargas
 * Maneja la descarga individual de archivos y compresión de carpetas
 */

class DownloadManager {
    constructor(storage, gallery) {
        this.storage = storage;
        this.gallery = gallery;
    }

    /**
     * Descarga un archivo individual
     * @param {string} fileId - ID del archivo
     */
    async downloadFile(fileId) {
        try {
            const file = await this.storage.getFile(fileId);
            if (!file) {
                this.gallery.showToast('Archivo no encontrado', 'error');
                return;
            }

            const link = document.createElement('a');
            link.href = file.path;
            link.download = file.name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.gallery.showToast('Descarga iniciada', 'success');
        } catch (error) {
            console.error('Error descargando archivo:', error);
            this.gallery.showToast('Error al descargar archivo', 'error');
        }
    }

    /**
     * Descarga una carpeta como ZIP
     * @param {string} folderId - ID de la carpeta
     */
    async downloadFolder(folderId) {
        try {
            const folder = this.gallery.userData.folders[folderId];
            if (!folder) {
                this.gallery.showToast('Carpeta no encontrada', 'error');
                return;
            }

            // Mostrar indicador de progreso
            this.gallery.showToast('Preparando descarga...', 'info');

            // Obtener todos los archivos de la carpeta
            const files = [];
            if (folder.files && folder.files.length > 0) {
                for (const fileId of folder.files) {
                    try {
                        const file = await this.storage.getFile(fileId);
                        if (file) {
                            // Convertir archivo a blob para JSZip
                            const response = await fetch(file.path);
                            const blob = await response.blob();
                            files.push({
                                name: file.name,
                                blob: blob
                            });
                        }
                    } catch (error) {
                        console.error('Error procesando archivo:', fileId, error);
                    }
                }
            }

            if (files.length === 0) {
                this.gallery.showToast('La carpeta está vacía', 'error');
                return;
            }

            // Crear ZIP usando JSZip
            await this.createAndDownloadZip(files, folder.name);

        } catch (error) {
            console.error('Error descargando carpeta:', error);
            this.gallery.showToast('Error al descargar carpeta', 'error');
        }
    }

    /**
     * Crea y descarga un archivo ZIP
     * @param {Array} files - Lista de archivos con nombre y blob
     * @param {string} folderName - Nombre de la carpeta
     */
    async createAndDownloadZip(files, folderName) {
        try {
            // Verificar si JSZip está disponible
            if (typeof JSZip === 'undefined') {
                // Fallback: descargar archivos individualmente
                this.gallery.showToast('Descargando archivos individualmente...', 'info');
                
                for (const file of files) {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(file.blob);
                    link.download = file.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Pequeña pausa entre descargas
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                this.gallery.showToast(`${files.length} archivos descargados`, 'success');
                return;
            }

            // Crear ZIP con JSZip
            const zip = new JSZip();
            
            // Agregar archivos al ZIP
            files.forEach(file => {
                zip.file(file.name, file.blob);
            });

            // Generar ZIP
            this.gallery.showToast('Generando archivo ZIP...', 'info');
            
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 6
                }
            });

            // Descargar ZIP
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `${folderName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Limpiar URL del blob
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
            }, 1000);

            this.gallery.showToast('Carpeta descargada como ZIP', 'success');

        } catch (error) {
            console.error('Error creando ZIP:', error);
            this.gallery.showToast('Error al crear archivo ZIP', 'error');
        }
    }

    /**
     * Descarga archivos seleccionados
     * @param {Set} selectedFiles - Set de archivos seleccionados
     */
    async downloadSelected(selectedFiles) {
        const fileIds = Array.from(selectedFiles)
            .filter(key => key.startsWith('file:'))
            .map(key => key.replace('file:', ''));

        if (fileIds.length === 0) {
            this.gallery.showToast('No hay archivos seleccionados', 'error');
            return;
        }

        try {
            if (fileIds.length === 1) {
                // Descarga individual
                await this.downloadFile(fileIds[0]);
            } else {
                // Descarga múltiple como ZIP
                this.gallery.showToast('Preparando descarga múltiple...', 'info');

                const files = [];
                for (const fileId of fileIds) {
                    try {
                        const file = await this.storage.getFile(fileId);
                        if (file) {
                            const response = await fetch(file.path);
                            const blob = await response.blob();
                            files.push({
                                name: file.name,
                                blob: blob
                            });
                        }
                    } catch (error) {
                        console.error('Error procesando archivo seleccionado:', fileId, error);
                    }
                }

                await this.createAndDownloadZip(files, 'archivos_seleccionados');
            }
        } catch (error) {
            console.error('Error descargando archivos seleccionados:', error);
            this.gallery.showToast('Error en la descarga', 'error');
        }
    }
}

// Exportar para uso global
window.DownloadManager = DownloadManager;
