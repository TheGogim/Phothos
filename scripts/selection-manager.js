
/**
 * Gestor de selección de archivos y carpetas
 * Maneja la selección múltiple y acciones en lote
 */

class SelectionManager {
    constructor(gallery) {
        this.gallery = gallery;
        this.selectedItems = new Set();
        this.setupEventListeners();
    }

    /**
     * Configura los event listeners para selección
     */
    setupEventListeners() {
        // Seleccionar todo
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
        
        // Descargar seleccionados
        document.getElementById('downloadSelectedBtn').addEventListener('click', () => this.downloadSelected());
    }

    /**
     * Alterna la selección de un elemento
     * @param {string} id - ID del elemento
     * @param {string} type - Tipo (file o folder)
     */
    toggleSelection(id, type) {
        const key = `${type}:${id}`;
        const element = document.querySelector(`[data-${type}-id="${id}"]`);
        const checkbox = element?.querySelector('input[type="checkbox"]');
        
        if (this.selectedItems.has(key)) {
            this.selectedItems.delete(key);
            if (element) element.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        } else {
            this.selectedItems.add(key);
            if (element) element.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        }
        
        this.updateSelectionActions();
    }

    /**
     * Selecciona o deselecciona todos los elementos
     */
    selectAll() {
        const checkboxes = document.querySelectorAll('.gallery-item-select input[type="checkbox"], .folder-item-select input[type="checkbox"]');
        const allSelected = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            const element = cb.closest('[data-file-id], [data-folder-id]');
            if (element) {
                const fileId = element.dataset.fileId;
                const folderId = element.dataset.folderId;
                const type = fileId ? 'file' : 'folder';
                const id = fileId || folderId;
                const key = `${type}:${id}`;
                
                if (allSelected) {
                    // Deseleccionar todo
                    this.selectedItems.delete(key);
                    element.classList.remove('selected');
                    cb.checked = false;
                } else {
                    // Seleccionar todo
                    this.selectedItems.add(key);
                    element.classList.add('selected');
                    cb.checked = true;
                }
            }
        });
        
        this.updateSelectionActions();
    }

    /**
     * Actualiza las acciones de selección
     */
    updateSelectionActions() {
        const selectedCount = this.selectedItems.size;
        const downloadBtn = document.getElementById('downloadSelectedBtn');
        
        downloadBtn.disabled = selectedCount === 0;
        downloadBtn.textContent = selectedCount > 0 ? 
            `Descargar seleccionados (${selectedCount})` : 
            'Descargar seleccionados';
    }

    /**
     * Descarga los elementos seleccionados
     */
    downloadSelected() {
        if (this.selectedItems.size === 0) return;
        
        this.gallery.downloadManager.downloadSelected(this.selectedItems);
    }

    /**
     * Limpia la selección
     */
    clearSelection() {
        this.selectedItems.clear();
        const elements = document.querySelectorAll('.gallery-item.selected, .folder-item.selected');
        elements.forEach(el => {
            el.classList.remove('selected');
            const checkbox = el.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = false;
        });
        this.updateSelectionActions();
    }
}

// Exportar para uso global
window.SelectionManager = SelectionManager;
