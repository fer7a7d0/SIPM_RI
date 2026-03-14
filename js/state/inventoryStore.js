'use strict';

/**
 * InventoryStore — estado centralizado de la sesión.
 *
 * Expone métodos explícitos en lugar de variables globales mutables.
 * Ningún otro módulo debe leer ni escribir `_records` directamente.
 */
const InventoryStore = (() => {
    let _records          = [];
    let _recordId         = 1;
    let _isEditing        = false;
    let _editingRecordId  = null;

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
            return removed;
        },

        /** Reinicia completamente el estado de la sesión. */
        reset() {
            _records         = [];
            _recordId        = 1;
            _isEditing       = false;
            _editingRecordId = null;
        },
    };
})();
