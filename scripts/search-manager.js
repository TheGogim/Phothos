
/**
 * Gestor de búsqueda y filtrado
 * Maneja la búsqueda por nombre, tags, fechas y ordenamiento
 */

class SearchManager {
    constructor(gallery) {
        this.gallery = gallery;
        this.currentQuery = '';
        this.currentFilters = {
            type: 'all', // all, image, video
            dateFrom: '',
            dateTo: '',
            tags: []
        };
        this.currentSort = 'name'; // name, date, size, created
        this.currentOrder = 'asc'; // asc, desc
        
        this.setupEventListeners();
    }

    /**
     * Configura los event listeners para búsqueda y filtros
     */
    setupEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const clearSearchBtn = document.getElementById('clearSearch');

        searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        searchBtn.addEventListener('click', () => this.performSearch());
        clearSearchBtn.addEventListener('click', () => this.clearSearch());

        // Filtros
        document.getElementById('filterType').addEventListener('change', (e) => this.updateFilter('type', e.target.value));
        document.getElementById('filterDateFrom').addEventListener('change', (e) => this.updateFilter('dateFrom', e.target.value));
        document.getElementById('filterDateTo').addEventListener('change', (e) => this.updateFilter('dateTo', e.target.value));

        // Ordenamiento
        document.getElementById('sortBy').addEventListener('change', (e) => this.updateSort(e.target.value));
        document.getElementById('sortOrder').addEventListener('change', (e) => this.updateOrder(e.target.value));

        // Toggle de filtros avanzados
        document.getElementById('toggleAdvancedFilters').addEventListener('click', () => this.toggleAdvancedFilters());
    }

    /**
     * Maneja la entrada de texto en el campo de búsqueda
     * @param {Event} e - Evento de input
     */
    handleSearchInput(e) {
        const query = e.target.value.trim();
        
        // Búsqueda en tiempo real con debounce
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            if (query !== this.currentQuery) {
                this.currentQuery = query;
                this.performSearch();
            }
        }, 300);
    }

    /**
     * Realiza la búsqueda
     */
    async performSearch() {
        try {
            const folder = this.gallery.userData.folders[this.gallery.currentFolder];
            if (!folder) return;

            // Obtener todos los archivos de la carpeta actual
            const files = [];
            if (folder.files && folder.files.length > 0) {
                for (const fileId of folder.files) {
                    try {
                        const file = await this.gallery.storage.getFile(fileId);
                        if (file) files.push(file);
                    } catch (error) {
                        console.error('Error cargando archivo para búsqueda:', fileId, error);
                    }
                }
            }

            // Aplicar filtros y búsqueda
            const filteredFiles = this.filterAndSearchFiles(files);
            
            // Aplicar ordenamiento
            const sortedFiles = this.sortFiles(filteredFiles);

            // Renderizar resultados
            this.renderSearchResults(folder, sortedFiles);
            
            // Actualizar UI de búsqueda
            this.updateSearchUI();

        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.gallery.showToast('Error al realizar búsqueda', 'error');
        }
    }

    /**
     * Filtra y busca en los archivos
     * @param {Array} files - Lista de archivos
     * @returns {Array} Archivos filtrados
     */
    filterAndSearchFiles(files) {
        return files.filter(file => {
            // Filtro por texto (nombre, descripción, tags, notas)
            if (this.currentQuery) {
                const query = this.currentQuery.toLowerCase();
                const searchableText = [
                    file.name || '',
                    file.description || '',
                    file.notes || '',
                    ...(file.tags || [])
                ].join(' ').toLowerCase();

                if (!searchableText.includes(query)) {
                    return false;
                }
            }

            // Filtro por tipo
            if (this.currentFilters.type !== 'all') {
                if (this.currentFilters.type === 'image' && !file.type.startsWith('image/')) {
                    return false;
                }
                if (this.currentFilters.type === 'video' && !file.type.startsWith('video/')) {
                    return false;
                }
                if (this.currentFilters.type === 'audio' && !file.type.startsWith('audio/')) {
                    return false;
                }
            }

            // Filtro por fecha
            if (this.currentFilters.dateFrom || this.currentFilters.dateTo) {
                const fileDate = file.captureDate || file.createdAt;
                if (fileDate) {
                    const date = new Date(fileDate);
                    const fromDate = this.currentFilters.dateFrom ? new Date(this.currentFilters.dateFrom) : null;
                    const toDate = this.currentFilters.dateTo ? new Date(this.currentFilters.dateTo) : null;

                    if (fromDate && date < fromDate) return false;
                    if (toDate && date > toDate) return false;
                }
            }

            return true;
        });
    }

    /**
     * Ordena los archivos según los criterios actuales
     * @param {Array} files - Lista de archivos
     * @returns {Array} Archivos ordenados
     */
    sortFiles(files) {
        return files.sort((a, b) => {
            let comparison = 0;

            switch (this.currentSort) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'date':
                    const dateA = new Date(a.captureDate || a.createdAt);
                    const dateB = new Date(b.captureDate || b.createdAt);
                    comparison = dateA - dateB;
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
                case 'created':
                    const createdA = new Date(a.createdAt);
                    const createdB = new Date(b.createdAt);
                    comparison = createdA - createdB;
                    break;
            }

            return this.currentOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Renderiza los resultados de búsqueda
     * @param {Object} folder - Datos de la carpeta
     * @param {Array} files - Archivos filtrados y ordenados
     */
    renderSearchResults(folder, files) {
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';

        // Si no hay búsqueda activa, mostrar subcarpetas también
        if (!this.currentQuery && Object.values(this.currentFilters).every(v => !v || v === 'all')) {
            if (folder.subfolders && folder.subfolders.length > 0) {
                folder.subfolders.forEach(subfolderId => {
                    const subfolder = this.gallery.userData.folders[subfolderId];
                    if (subfolder) {
                        grid.appendChild(this.gallery.createFolderElement(subfolder));
                    }
                });
            }
        }

        // Renderizar archivos
        files.forEach(file => {
            grid.appendChild(this.gallery.createFileElement(file));
        });

        // Mostrar estado apropiado
        if (grid.children.length > 0) {
            this.gallery.showGallery();
        } else {
            this.showNoResults();
        }
    }

    /**
     * Actualiza un filtro específico
     * @param {string} filterType - Tipo de filtro
     * @param {string} value - Valor del filtro
     */
    updateFilter(filterType, value) {
        this.currentFilters[filterType] = value;
        this.performSearch();
    }

    /**
     * Actualiza el criterio de ordenamiento
     * @param {string} sortBy - Criterio de ordenamiento
     */
    updateSort(sortBy) {
        this.currentSort = sortBy;
        this.performSearch();
    }

    /**
     * Actualiza el orden de clasificación
     * @param {string} order - Orden (asc/desc)
     */
    updateOrder(order) {
        this.currentOrder = order;
        this.performSearch();
    }

    /**
     * Limpia la búsqueda y filtros
     */
    clearSearch() {
        // Limpiar búsqueda
        document.getElementById('searchInput').value = '';
        this.currentQuery = '';

        // Limpiar filtros
        document.getElementById('filterType').value = 'all';
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        
        this.currentFilters = {
            type: 'all',
            dateFrom: '',
            dateTo: '',
            tags: []
        };

        // Recargar galería normal
        this.gallery.loadGallery();
        this.updateSearchUI();
    }

    /**
     * Actualiza la UI de búsqueda
     */
    updateSearchUI() {
        const hasActiveSearch = this.currentQuery || 
            Object.values(this.currentFilters).some(v => v && v !== 'all');

        const clearBtn = document.getElementById('clearSearch');
        const searchStatus = document.getElementById('searchStatus');

        if (hasActiveSearch) {
            clearBtn.classList.remove('hidden');
            searchStatus.classList.remove('hidden');
            
            let statusText = 'Búsqueda activa';
            if (this.currentQuery) {
                statusText += `: "${this.currentQuery}"`;
            }
            
            searchStatus.textContent = statusText;
        } else {
            clearBtn.classList.add('hidden');
            searchStatus.classList.add('hidden');
        }
    }

    /**
     * Muestra el estado de "sin resultados"
     */
    showNoResults() {
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">Sin resultados</h3>
                <p class="text-gray-500 mb-4">No se encontraron archivos que coincidan con tu búsqueda.</p>
                <button onclick="searchManager.clearSearch()" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Limpiar búsqueda
                </button>
            </div>
        `;
        
        this.gallery.showGallery();
    }

    /**
     * Alterna la visibilidad de filtros avanzados
     */
    toggleAdvancedFilters() {
        const filtersDiv = document.getElementById('advancedFilters');
        const toggleBtn = document.getElementById('toggleAdvancedFilters');
        
        filtersDiv.classList.toggle('hidden');
        
        const isVisible = !filtersDiv.classList.contains('hidden');
        toggleBtn.textContent = isVisible ? 'Ocultar filtros avanzados' : 'Mostrar filtros avanzados';
    }
}

// Exportar para uso global
window.SearchManager = SearchManager;
