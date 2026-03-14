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

    async function drainPendingQueue() {
        const pendingBefore = SheetsService.getPendingCount();
        if (!pendingBefore) return;

        const result = await SheetsService.reintentarPendientes(25);
        if (result.sent > 0 && statusEl) {
            statusEl.textContent = `Sincronizados ${result.sent} registros pendientes.`;
            statusEl.className = 'form-status form-status--success';
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'form-status';
            }, 3000);
        }
    }

    // 1 — FormController se inicializa primero y expone enterEditMode
    const { enterEditMode } = FormController.init(form, {
        downloadButton: downloadBtn,
        statusElement:  statusEl,
    });

    // 2 — TableRenderer recibe los callbacks; edit invoca enterEditMode
    TableRenderer.init(tableEl, {

        onEdit: id => {
            const record = InventoryStore.getRecords().find(r => r.id === id);
            if (record) enterEditMode(record);
        },

        onDelete: async id => {
            const removed = InventoryStore.deleteRecord(id);
            if (!removed) return;

            const result = await SheetsService.enviar({ action: 'delete', uid: removed.uid });
            if (!result.ok) {
                alert(`Eliminado localmente, pero falló backend: ${result.error}`);
            }

            TableRenderer.render(InventoryStore.getRecords());
            downloadBtn.style.display =
                InventoryStore.getRecords().length > 0 ? 'block' : 'none';
        },
    });

    // 3 — Botón flotante de scroll
    ScrollController.init();

    // 4 — Reintentos automáticos de cola local
    drainPendingQueue();
    window.addEventListener('online', drainPendingQueue);
    setInterval(drainPendingQueue, 60000);
});
