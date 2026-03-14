'use strict';

/**
 * SheetsService — única capa que conoce la URL del backend.
 *
 * IMPORTANTE: fetch usa mode:"no-cors" porque Google Apps Script no
 * permite CORS desde clientes sin autenticación OAuth. Esto significa
 * que la respuesta es opaca y no se puede verificar el estado HTTP.
 * Para mayor robustez futura, migrar a un backend con CORS habilitado.
 */
const SheetsService = (() => {
    const SHEETS_URL =
        'https://script.google.com/macros/s/AKfycbykGMxvUj0VP9uddbC3Bb3GjxR4oV4Xn4o66kQcSklI-qlHcUWEZrdByOvIeKc7X5vA/exec';

    /**
     * Envía un registro al backend.
     * @param {Object} registro - Debe incluir la propiedad `action` ('create'|'update'|'delete').
     * @returns {Promise<void>}
     */
    function enviar(registro) {
        return fetch(SHEETS_URL, {
            method:  'POST',
            mode:    'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(registro),
        }).catch(err => {
            console.error('[SheetsService] Error al enviar:', err);
        });
    }

    return { enviar };
})();
