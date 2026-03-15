'use strict';

/**
 * FormController — todo lo relacionado con el formulario de registro.
 *
 * Responsabilidades:
 *   - Llenar/limpiar campos
 *   - Autocompletado por código
 *   - Un único listener de submit (no duplicado)
 *   - Modo edición / modo creación
 *   - Feedback de estado al usuario
 *   - Delegación al store y al servicio
 *
 * Dependencias (deben estar cargadas antes):
 *   catalogoCodigos, materiasPrimas, InventoryStore,
 *   Validators, CsvUtils, SheetsService, TableRenderer, generarUID
 */
const FormController = (() => {

    /* --- Referencias privadas ---------------------------------- */
    let _form;
    let _downloadBtn;
    let _statusEl;
    let _submitBtn;
    let _isSubmitting = false;

    const F = {   // campos del formulario indexados por nombre
        name:      null,
        area:      null,
        code:      null,
        tt:        null,
        product:   null,
        cylinders: null,
    };

    /* --- Datalist ---------------------------------------------- */
    function _initDatalist() {
        const datalist = document.getElementById('code-suggestions');
        if (!datalist) return;
        datalist.innerHTML = '';
        Object.keys(catalogoCodigos).forEach(code => {
            const opt   = document.createElement('option');
            opt.value   = code;
            opt.label   = `${code} – ${catalogoCodigos[code].producto}`;
            datalist.appendChild(opt);
        });
    }

    /* --- Autocompletado de producto / TT ----------------------- */
    function _fillProductFields(codeNum) {
        const entry = catalogoCodigos[codeNum];
        if (!entry) {
            F.product.value = '';
            F.tt.value      = '';
            return;
        }
        const ttDesc    = materiasPrimas[entry.tt] || 'Descripción no encontrada';
        F.product.value = entry.producto;
        F.tt.value      = `${entry.tt} – ${ttDesc}`;

        F.product.classList.add('highlight');
        F.tt.classList.add('highlight');
        setTimeout(() => {
            F.product.classList.remove('highlight');
            F.tt.classList.remove('highlight');
        }, 1000);

        F.cylinders.focus();
    }

    /* --- Lectura del formulario -------------------------------- */
    function _readFormData() {
        return {
            name:      F.name.value,
            area:      F.area.value,
            code:      F.code.value.trim(),
            product:   F.product.value,
            tt:        F.tt.value.split(' – ')[0].trim(),
            cylinders: F.cylinders.value.trim(),
        };
    }

    /* --- Limpiar solo los campos de código -------------------- */
    function _clearCodeFields() {
        F.code.value      = '';
        F.product.value   = '';
        F.tt.value        = '';
        F.cylinders.value = '';
    }

    /* --- Feedback de estado ----------------------------------- */
    function _setStatus(msg, isError) {
        if (!_statusEl) return;
        _statusEl.textContent = msg;
        _statusEl.className   = isError
            ? 'form-status form-status--error'
            : 'form-status form-status--success';
        setTimeout(() => {
            _statusEl.textContent = '';
            _statusEl.className   = 'form-status';
        }, 3500);
    }

    /* --- Sincronizar visibilidad del botón de descarga -------- */
    function _syncDownloadBtn() {
        _downloadBtn.style.display =
            InventoryStore.getRecords().length > 0 ? 'block' : 'none';
    }

    function _setSubmittingState(isSubmitting) {
        _isSubmitting = isSubmitting;
        if (!_submitBtn) return;
        _submitBtn.disabled = isSubmitting;
        _submitBtn.textContent = isSubmitting
            ? 'Enviando...'
            : (InventoryStore.getEditState().isEditing ? 'Actualizar' : 'Enviar');
    }

    /* --- Modo edición ----------------------------------------- */
    function _enterEditMode(record) {
        const card = _form.closest('.form-container');
        card.classList.add('editing-mode');

        F.name.value      = record.name;
        F.area.value      = record.area;
        F.code.value      = record.code;
        F.product.value   = record.product;
        const ttDesc      = materiasPrimas[record.tt] || 'Descripción no encontrada';
        F.tt.value        = `${record.tt} – ${ttDesc}`;
        F.cylinders.value = record.cylinders;

        _form.querySelector('button[type="submit"]').textContent = 'Actualizar';
        InventoryStore.setEditState(true, record.id);

        // Llevar formulario a la vista en móvil
        _form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        F.code.focus();
    }

    function _exitEditMode() {
        const card = _form.closest('.form-container');
        card.classList.remove('editing-mode');
        _form.querySelector('button[type="submit"]').textContent = 'Enviar';
        InventoryStore.setEditState(false, null);
    }

    /* --- Submit único ----------------------------------------- */
    async function _handleSubmit(e) {
        e.preventDefault();

        if (_isSubmitting) return;
        _setSubmittingState(true);

        try {

            const data  = _readFormData();
            const error = Validators.validateFormData(data);
            if (error) {
                _setStatus(error, true);
                return;
            }

            const { isEditing, editingRecordId } = InventoryStore.getEditState();
            let highlightId = null;

            if (isEditing && editingRecordId !== null) {
                /* ---- UPDATE ---- */
                const updated = InventoryStore.updateRecord(editingRecordId, data);
                if (updated) {
                    const result = await SheetsService.enviar({ ...updated, action: 'update' });
                    highlightId = updated.id;
                    if (result.ok && result.unverified) {
                        _setStatus('Actualizado localmente. Envío remoto sin confirmación.');
                    } else if (result.ok) {
                        _setStatus('Registro actualizado y confirmado en backend.');
                    } else if (result.queued) {
                        _setStatus(`Actualizado local. Sin red; en cola (${result.pending} pendientes).`, true);
                    } else {
                        _setStatus(`Actualizado localmente, pero falló backend: ${result.error}`, true);
                    }
                }
                _exitEditMode();

            } else {
                /* ---- CREATE ---- */
                const newRecord = {
                    id:   InventoryStore.getNextId(),
                    uid:  generarUID(),
                    date: new Date().toLocaleDateString('en-CA'),
                    ...data,
                };
                InventoryStore.addRecord(newRecord);
                const result = await SheetsService.enviar({ ...newRecord, action: 'create' });
                if (result.ok && result.unverified) {
                    _setStatus('Guardado local. Envío remoto sin confirmación.');
                } else if (result.ok) {
                    _setStatus('Registro guardado y confirmado en backend.');
                } else if (result.queued) {
                    _setStatus(`Guardado local. Sin red; en cola (${result.pending} pendientes).`, true);
                } else {
                    _setStatus(`Guardado local, pero falló backend: ${result.error}`, true);
                }
            }

            TableRenderer.render(InventoryStore.getRecords());

            if (highlightId !== null) {
                TableRenderer.scrollToRow(highlightId);
            }

            _syncDownloadBtn();
            _clearCodeFields();

            if (!isEditing) {
                F.code.focus();
            }
        } finally {
            _setSubmittingState(false);
        }
    }

    /* --- Descarga CSV ----------------------------------------- */
    function _handleDownload() {
        const records = InventoryStore.getRecords();
        const csv = CsvUtils.generarCSV(records);
        if (!csv) return;

        const { name, area } = _readFormData();
        CsvUtils.descargar(csv, CsvUtils.generarNombreArchivo(area, name));

        if (window.confirm('¿Deseas limpiar los registros de esta sesión?')) {
            InventoryStore.reset();
            TableRenderer.render([]);
            _form.reset();
            _syncDownloadBtn();
        }
    }

    /* --- API pública ------------------------------------------ */

    /**
     * Inicializa el controlador del formulario.
     *
     * @param {HTMLFormElement} formEl
     * @param {{ downloadButton: HTMLElement, statusElement: HTMLElement }} opts
     * @returns {{ enterEditMode: Function }}  Expuesto para que main.js lo pase a TableRenderer.
     */
    function init(formEl, { downloadButton, statusElement } = {}) {
        _form        = formEl;
        _downloadBtn = downloadButton;
        _statusEl    = statusElement;
        _submitBtn   = _form.querySelector('button[type="submit"]');

        F.name      = document.getElementById('name');
        F.area      = document.getElementById('area');
        F.code      = document.getElementById('code');
        F.tt        = document.getElementById('tt');
        F.product   = document.getElementById('product');
        F.cylinders = document.getElementById('cylinders');

        _initDatalist();

        F.code.addEventListener('input', () => {
            const num = parseInt(F.code.value, 10);
            _fillProductFields(num);
        });

        // Un único listener de submit
        _form.addEventListener('submit', _handleSubmit);

        _downloadBtn.addEventListener('click', _handleDownload);

        return { enterEditMode: _enterEditMode };
    }

    return { init };
})();
