'use strict';

/**
 * InventoryStore — estado centralizado de la sesión.
 *
 * Expone métodos explícitos en lugar de variables globales mutables.
 * Ningún otro módulo debe leer ni escribir `_records` directamente.
 */
const InventoryStore = (() => {
    const STORAGE_KEY = 'ri_v05_records';

    let _records          = [];
    let _recordId         = 1;
    let _isEditing        = false;
    let _editingRecordId  = null;

    function _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_records));
        } catch (err) {
            console.warn('[InventoryStore] No se pudo persistir el estado:', err);
        }
    }

    function _loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return;

            _records = parsed.filter(r => r && typeof r === 'object');
            const maxId = _records.reduce((acc, r) => {
                const currentId = Number.isInteger(r.id) ? r.id : 0;
                return currentId > acc ? currentId : acc;
            }, 0);
            _recordId = maxId + 1;
        } catch (err) {
            console.warn('[InventoryStore] No se pudo restaurar el estado:', err);
            _records = [];
            _recordId = 1;
        }
    }

    _loadState();

    return {
        /* --- Lectura ------------------------------------------- */
        getRecords()   { return _records; },
        getNextId()    { return _recordId++; },
        getEditState() { return { isEditing: _isEditing, editingRecordId: _editingRecordId }; },

        /* --- Escritura ------------------------------------------ */
        setEditState(editing, id) {
            _isEditing       = editing;
            _editingRecordId = id;
        },

        addRecord(record) {
            _records.push(record);
            _saveState();
        },

        /**
         * Actualiza los campos de un registro existente.
         * NO sobreescribe id, uid ni date.
         * @returns {Object|null} Registro actualizado o null si no existe.
         */
        updateRecord(id, data) {
            const record = _records.find(r => r.id === id);
            if (!record) return null;
            const { id: _i, uid: _u, date: _d, ...safe } = data; // excluir campos inmutables si vienen en data
            Object.assign(record, safe);
            _saveState();
            return record;
        },

        /**
         * Elimina un registro por id.
         * @returns {Object|null} Registro eliminado o null si no existe.
         */
        deleteRecord(id) {
            const index = _records.findIndex(r => r.id === id);
            if (index === -1) return null;
            const [removed] = _records.splice(index, 1);
            _saveState();
            return removed;
        },

        /** Reinicia completamente el estado de la sesión. */
        reset() {
            _records         = [];
            _recordId        = 1;
            _isEditing       = false;
            _editingRecordId = null;
            _saveState();
        },
    };
})();
