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

    let isDrainingPendingQueue = false;

    function syncDownloadButton() {
        downloadBtn.style.display =
            InventoryStore.getRecords().length > 0 ? 'block' : 'none';
    }

    function showStatus(message, isError = false, timeoutMs = 3500) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = isError
            ? 'form-status form-status--error'
            : 'form-status form-status--success';

        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'form-status';
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
