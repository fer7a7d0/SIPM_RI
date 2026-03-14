'use strict';

/**
 * SheetsService — única capa que conoce la URL del backend.
 *
 * Si el Apps Script ya está devolviendo JSON con CORS habilitado,
 * `enviar` retorna { ok: true/false, ... } basado en respuesta real.
 *
 * Si el endpoint no permite leer respuesta (caso legacy), se usa
 * fallback no-cors y se retorna { ok: true, unverified: true }.
 */
const SheetsService = (() => {
    const SHEETS_URL =
        'https://script.google.com/macros/s/AKfycbzoXk8vpo6OKXZz6WM8z22-pi4ZcJA2Bmfz7TcyjeljiKl3zvdLK7Uh9wEGZdmOuqaa/exec';
    const QUEUE_KEY = 'ri_v05_pending_queue';

    // Clave temporal configurada para validar requests en Apps Script.
    const API_KEY = 'SIPM_RI_2026_H7mQ2xL9vNp4TzK8cFw6DsA1bR';

    // Número máximo de reintentos por item antes de descartarlo.
    const MAX_ATTEMPTS = 5;

    function _readQueue() {
        try {
            const raw = localStorage.getItem(QUEUE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    function _writeQueue(queue) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }

    function _enqueue(payload, error) {
        const queue = _readQueue();
        queue.push({ payload, error: error || 'Error no especificado', ts: Date.now(), attempts: 1 });
        _writeQueue(queue);
        return queue.length;
    }

    function getPendingCount() {
        return _readQueue().length;
    }

    async function _sendWithCors(payload) {
        const res = await fetch(SHEETS_URL, {
            method:  'POST',
            mode:    'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body:    JSON.stringify(payload),
        });

        let parsed = null;
        try {
            parsed = await res.json();
        } catch (_) {
            // Mantener null si no respondió JSON.
        }

        if (!res.ok) {
            return {
                ok: false,
                error: (parsed && parsed.error) || `HTTP ${res.status}`,
                data: parsed || undefined,
            };
        }

        if (parsed && parsed.ok === false) {
            return {
                ok: false,
                error: parsed.error || 'Error de validación en backend.',
                data: parsed,
            };
        }

        return { ok: true, data: parsed || undefined };
    }

    async function _sendNoCors(payload) {
        await fetch(SHEETS_URL, {
            method:  'POST',
            mode:    'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body:    JSON.stringify(payload),
        });
    }

    /**
     * Envía un registro al backend.
     * @param {Object} registro - Debe incluir action ('create'|'update'|'delete').
     * @returns {Promise<{ok:boolean, error?:string, unverified?:boolean, data?:Object}>}
     */
    async function enviar(registro) {
        const payload = API_KEY ? { ...registro, apiKey: API_KEY } : registro;

        // Intento principal: CORS + respuesta JSON verificable
        try {
            const verified = await _sendWithCors(payload);
            if (verified.ok) return verified;

            const pending = _enqueue(payload, verified.error);
            return {
                ok: false,
                queued: true,
                pending,
                error: verified.error || 'Falló backend. Registro en cola local.',
                data: verified.data,
            };
        } catch (err) {
            // Fallback legacy: envía sin poder verificar respuesta (no-cors)
            try {
                await _sendNoCors(payload);
                // Fire-and-forget: también encolamos para verificar en el próximo reintento
                const pending = _enqueue(payload, 'Enviado sin confirmación (no-cors)');
                return {
                    ok: true,
                    unverified: true,
                    queued: true,
                    pending,
                    data: { warning: 'Envío sin confirmación de respuesta (no-cors). En cola para verificar.' },
                };
            } catch (fallbackErr) {
                const pending = _enqueue(payload, fallbackErr.message || 'Error de red');
                console.error('[SheetsService] Error al enviar:', fallbackErr);
                return {
                    ok: false,
                    queued: true,
                    pending,
                    error: 'No se pudo enviar al backend. Registro agregado a cola local.',
                };
            }
        }
    }

    /**
     * Reintenta envíos pendientes utilizando modo verificable (CORS).
     * Mantiene en cola solo los fallidos. Descarta items que superan MAX_ATTEMPTS.
     * @param {number} [maxAttempts=20]
     * @returns {Promise<{sent:number, remaining:number, discarded:number}>}
     */
    async function reintentarPendientes(maxAttempts) {
        const limit = Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 20;
        const queue = _readQueue();
        if (!queue.length) return { sent: 0, remaining: 0, discarded: 0 };

        const rest = [];
        let sent = 0;
        let discarded = 0;

        for (let i = 0; i < queue.length; i += 1) {
            const item = queue[i];
            if (i < limit) {
                try {
                    const result = await _sendWithCors(item.payload);
                    if (result.ok) {
                        sent += 1;
                        continue; // Confirmado: se elimina de la cola
                    }
                    // Backend rechazó: incrementar contador de intentos
                    const attempts = (item.attempts || 1) + 1;
                    if (attempts > MAX_ATTEMPTS) {
                        discarded += 1;
                        console.warn('[SheetsService] Item descartado tras', MAX_ATTEMPTS, 'intentos fallidos:', item.payload, '— Último error:', result.error);
                        continue; // Se descarta: no se agrega a rest
                    }
                    rest.push({ payload: item.payload, error: result.error || 'Error backend', ts: Date.now(), attempts });
                } catch (err) {
                    // Error de red: incrementar contador de intentos
                    const attempts = (item.attempts || 1) + 1;
                    if (attempts > MAX_ATTEMPTS) {
                        discarded += 1;
                        console.warn('[SheetsService] Item descartado tras', MAX_ATTEMPTS, 'intentos fallidos (red):', item.payload, '— Último error:', err.message);
                        continue; // Se descarta: no se agrega a rest
                    }
                    rest.push({ payload: item.payload, error: err.message || 'Error de red', ts: Date.now(), attempts });
                }
            } else {
                rest.push(item); // Fuera del límite del lote: se mantiene para el próximo ciclo
            }
        }

        _writeQueue(rest);
        return { sent, remaining: rest.length, discarded };
    }

    return { enviar, reintentarPendientes, getPendingCount };
})();
