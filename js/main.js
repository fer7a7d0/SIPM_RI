'use strict';

/**
 * main.js — punto de entrada de la aplicación.
 *
 * Orden de responsabilidades:
 *   1. Esperar DOMContentLoaded
 *   2. Obtener referencias a los elementos del DOM raíz
 *   3. Inicializar FormController (devuelve enterEditMode)
 *   4. Inicializar TableRenderer con los callbacks de edición/eliminación
 *   5. Inicializar ScrollController
 *
 * Este archivo NO contiene lógica de negocio. Sólo conecta módulos.
 *
 * Dependencias (cargadas antes en index.html en este orden):
 *   catalogoCodigos · materiasPrimas · SheetsService · InventoryStore ·
 *   generarUID · DomUtils · Validators · CsvUtils ·
 *   TableRenderer · FormController · ScrollController
 */
document.addEventListener('DOMContentLoaded', () => {

    const form        = document.getElementById('inventory-form');
    const tableEl     = document.getElementById('table-container');
    const downloadBtn = document.getElementById('download-btn');
    const statusEl    = document.getElementById('form-status');
    const syncEl      = document.getElementById('sync-indicator');
    const recoveryBox = document.getElementById('session-recovery');
    const recoveryTxt = document.getElementById('session-recovery-text');
    const resumeBtn   = document.getElementById('resume-session-btn');
    const newBtn      = document.getElementById('new-session-btn');

    let isDrainingPendingQueue = false;
    const STATUS_IDLE_TEXT = 'Listo para capturar';

    function syncDownloadButton() {
        downloadBtn.style.display =
            InventoryStore.getRecords().length > 0 ? 'block' : 'none';
    }

    function hideRecoveryBanner() {
        if (!recoveryBox) return;
        recoveryBox.classList.add('hidden');
    }

    function clearSessionKeepingName() {
        const nameField = document.getElementById('name');
        const currentName = nameField ? nameField.value : '';

        InventoryStore.reset();
        TableRenderer.render([]);
        form.reset();
        if (nameField && currentName) {
            nameField.value = currentName;
        }
        syncDownloadButton();
        updateSyncIndicator();
        hideRecoveryBanner();
        showStatus('CSV descargado y sesión reiniciada. Nombre conservado; continúa desde Área.');

        const areaField = document.getElementById('area');
        if (areaField) areaField.focus();
    }

    function newSessionFlow() {
        const count = InventoryStore.getRecords().length;
        const confirmNew = window.confirm(
            `Se limpiarán ${count} registro(s) y todos los datos del formulario. ¿Deseas empezar de cero?`
        );
        if (!confirmNew) return;

        InventoryStore.reset();
        TableRenderer.render([]);
        form.reset();
        syncDownloadButton();
        updateSyncIndicator();
        hideRecoveryBanner();
        showStatus('Sesión nueva iniciada.');

        const nameField = document.getElementById('name');
        if (nameField) nameField.focus();
    }

    function showRecoveryBannerIfNeeded() {
        if (!recoveryBox || !recoveryTxt) return;
        const count = InventoryStore.getRecords().length;
        if (!count) {
            hideRecoveryBanner();
            return;
        }

        recoveryTxt.textContent = `Se recuperaron ${count} registro(s) de la sesión anterior.`;
        recoveryBox.classList.remove('hidden');
    }

    function showStatus(message, isError = false, timeoutMs = 3500) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = isError
            ? 'form-status form-status--error'
            : 'form-status form-status--success';

        setTimeout(() => {
            statusEl.textContent = STATUS_IDLE_TEXT;
            statusEl.className = 'form-status form-status--ok';
        }, timeoutMs);
    }

    function updateSyncIndicator() {
        if (!syncEl) return;

        const pending = SheetsService.getPendingCount();
        const online = navigator.onLine;

        let text = 'Sincronizado';
        let variantClass = 'sync-indicator--ok';

        if (!online && pending > 0) {
            text = `Sin conexión · ${pending} pendiente(s)`;
            variantClass = 'sync-indicator--offline';
        } else if (!online) {
            text = 'Sin conexión';
            variantClass = 'sync-indicator--offline';
        } else if (pending > 0) {
            text = `${pending} pendiente(s) por sincronizar`;
            variantClass = 'sync-indicator--warning';
        }

        syncEl.textContent = text;
        syncEl.className = `sync-indicator ${variantClass}`;
    }

    async function drainPendingQueue() {
        if (isDrainingPendingQueue) return;

        const pendingBefore = SheetsService.getPendingCount();
        if (!pendingBefore) return;

        isDrainingPendingQueue = true;
        try {
            const result = await SheetsService.reintentarPendientes(25);
            if (result.sent > 0 && statusEl) {
                showStatus(`Sincronizados ${result.sent} registros pendientes.`);
            }
            updateSyncIndicator();
        } catch (err) {
            console.error('[main] Error al reintentar pendientes:', err);
        } finally {
            isDrainingPendingQueue = false;
        }
    }

    // 1 — FormController se inicializa primero y expone enterEditMode
    const { enterEditMode } = FormController.init(form, {
        downloadButton: downloadBtn,
        statusElement:  statusEl,
        onSyncStateChange: updateSyncIndicator,
        onDownloadCompleted: () => {
            const keepResetting = window.confirm(
                'CSV descargado. ¿Deseas reiniciar la sesión ahora? Se conservará el Nombre actual.'
            );
            if (!keepResetting) return;
            clearSessionKeepingName();
        },
    });

    // 2 — TableRenderer recibe los callbacks; edit invoca enterEditMode
    TableRenderer.init(tableEl, {

        onEdit: id => {
            const record = InventoryStore.getRecords().find(r => r.id === id);
            if (record) enterEditMode(record);
        },

        onDelete: async id => {
            const record = InventoryStore.getRecords().find(r => r.id === id);
            if (!record) return;

            const confirmDelete = window.confirm(
                `¿Seguro que deseas eliminar el registro #${record.id} (Código ${record.code})?`
            );
            if (!confirmDelete) return;

            const removed = InventoryStore.deleteRecord(id);
            if (!removed) return;

            TableRenderer.render(InventoryStore.getRecords());
            syncDownloadButton();

            const result = await SheetsService.enviar({ action: 'delete', uid: removed.uid });
            if (result.ok) {
                showStatus('Registro eliminado y sincronizado.');
            } else if (result.queued) {
                showStatus(`Eliminado local. En cola (${result.pending} pendientes).`, true);
            } else {
                showStatus(`Eliminado local. Falló backend: ${result.error}`, true);
            }

            updateSyncIndicator();
        },
    });

    TableRenderer.render(InventoryStore.getRecords());
    syncDownloadButton();
    showRecoveryBannerIfNeeded();
    if (statusEl) {
        statusEl.textContent = STATUS_IDLE_TEXT;
        statusEl.className = 'form-status form-status--ok';
    }

    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            const records = InventoryStore.getRecords();
            const nameField = document.getElementById('name');
            const areaField = document.getElementById('area');
            const codeField = document.getElementById('code');

            if (records.length > 0) {
                const last = records[records.length - 1];
                if (nameField && last.name) nameField.value = last.name;
                if (areaField && last.area)  areaField.value = last.area;
            }

            hideRecoveryBanner();
            showStatus('Sesión recuperada. Continuando desde donde lo dejaste.');
            if (codeField) codeField.focus();
        });
    }

    if (newBtn) {
        newBtn.addEventListener('click', () => {
            newSessionFlow();
        });
    }

    // 3 — Botón flotante de scroll
    ScrollController.init();

    // 4 — Reintentos automáticos de cola local
    updateSyncIndicator();
    drainPendingQueue();
    window.addEventListener('online', drainPendingQueue);
    window.addEventListener('online', updateSyncIndicator);
    window.addEventListener('offline', updateSyncIndicator);
    setInterval(drainPendingQueue, 60000);
});
