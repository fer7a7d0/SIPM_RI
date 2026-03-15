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
    const QUEUE_BACKUP_KEY = 'ri_v05_pending_queue_backup';
    const DEAD_LETTER_KEY = 'ri_v05_dead_letter_queue';
    const DEFAULT_MAX_ATTEMPTS = 8;
    const BASE_RETRY_DELAY_MS = 5000;
    const MAX_RETRY_DELAY_MS = 10 * 60 * 1000;

    let _drainInFlight = null;

    // Clave temporal configurada para validar requests en Apps Script.
    const API_KEY = 'SIPM_RI_2026_H7mQ2xL9vNp4TzK8cFw6DsA1bR';

    function _makeOperationId() {
        const rand = Math.random().toString(36).slice(2, 10);
        return `op_${Date.now().toString(36)}_${rand}`;
    }

    function _isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function _normalizeItem(item) {
        if (!_isObject(item) || !_isObject(item.payload)) return null;

        const now = Date.now();
        const ts = Number.isFinite(item.ts) ? item.ts : now;
        const attempts = Number.isInteger(item.attempts) && item.attempts >= 0
            ? item.attempts
            : 0;
        const maxAttempts = Number.isInteger(item.maxAttempts) && item.maxAttempts > 0
            ? item.maxAttempts
            : DEFAULT_MAX_ATTEMPTS;
        const nextRetryAt = Number.isFinite(item.nextRetryAt) ? item.nextRetryAt : ts;
        const operationId = typeof item.operationId === 'string' && item.operationId
            ? item.operationId
            : _makeOperationId();

        return {
            operationId,
            payload: item.payload,
            error: item.error || 'Error no especificado',
            ts,
            attempts,
            maxAttempts,
            nextRetryAt,
            retryable: item.retryable !== false,
        };
    }

    function _computeBackoffDelay(attempts) {
        const exp = Math.min(attempts, 10);
        const base = Math.min(BASE_RETRY_DELAY_MS * (2 ** exp), MAX_RETRY_DELAY_MS);
        const jitter = Math.floor(Math.random() * 1000);
        return base + jitter;
    }

    function _isRetryableStatus(status) {
        if (!Number.isInteger(status)) return true;
        return status >= 500 || status === 429 || status === 408;
    }

    function _isRetryableResult(result) {
        if (!result || result.ok) return false;
        if (typeof result.retryable === 'boolean') return result.retryable;
        return _isRetryableStatus(result.status);
    }

    function _operationKey(payload) {
        if (!_isObject(payload)) return '';
        const action = payload.action || 'unknown';
        const uid = payload.uid || '';
        return `${action}:${uid}`;
    }

    function _readDeadLetter() {
        try {
            const raw = localStorage.getItem(DEAD_LETTER_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    function _writeDeadLetter(items) {
        try {
            localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(items));
        } catch (err) {
            console.warn('[SheetsService] No se pudo persistir dead-letter queue:', err);
        }
    }

    function _readQueue() {
        try {
            const raw = localStorage.getItem(QUEUE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];

            const normalized = parsed
                .map(_normalizeItem)
                .filter(Boolean);

            if (normalized.length !== parsed.length) {
                _writeQueue(normalized);
            }
            return normalized;
        } catch (err) {
            try {
                const backupRaw = localStorage.getItem(QUEUE_BACKUP_KEY);
                const backup = backupRaw ? JSON.parse(backupRaw) : [];
                if (Array.isArray(backup)) {
                    const normalizedBackup = backup.map(_normalizeItem).filter(Boolean);
                    _writeQueue(normalizedBackup);
                    return normalizedBackup;
                }
            } catch (_) {
                // Si también falla el backup, degradar a cola vacía.
            }
            console.warn('[SheetsService] Cola local corrupta. Se reinició la cola.', err);
            return [];
        }
    }

    function _writeQueue(queue) {
        const safeQueue = Array.isArray(queue) ? queue.map(_normalizeItem).filter(Boolean) : [];
        const serialized = JSON.stringify(safeQueue);
        try {
            localStorage.setItem(QUEUE_KEY, serialized);
            localStorage.setItem(QUEUE_BACKUP_KEY, serialized);
        } catch (err) {
            console.error('[SheetsService] No se pudo escribir cola local:', err);
            throw err;
        }
    }

    function _enqueue(payload, error, opts) {
        const options = _isObject(opts) ? opts : {};
        const retryable = options.retryable !== false;
        const maxAttempts = Number.isInteger(options.maxAttempts) && options.maxAttempts > 0
            ? options.maxAttempts
            : DEFAULT_MAX_ATTEMPTS;
        const now = Date.now();
        const queue = _readQueue();

        const entry = {
            operationId: _makeOperationId(),
            payload,
            error: error || 'Error no especificado',
            ts: now,
            attempts: 0,
            maxAttempts,
            nextRetryAt: now,
            retryable,
        };

        // Deduplicacion basica: reemplaza operacion pendiente del mismo action+uid.
        const key = _operationKey(payload);
        const existingIndex = key
            ? queue.findIndex(item => _operationKey(item.payload) === key)
            : -1;

        if (existingIndex >= 0) {
            queue[existingIndex] = entry;
        } else {
            queue.push(entry);
        }

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
                status: res.status,
                retryable: _isRetryableStatus(res.status),
                data: parsed || undefined,
            };
        }

        if (parsed && parsed.ok === false) {
            return {
                ok: false,
                error: parsed.error || 'Error de validación en backend.',
                status: res.status,
                retryable: typeof parsed.retriable === 'boolean'
                    ? parsed.retriable
                    : _isRetryableStatus(res.status),
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

            const pending = _enqueue(payload, verified.error, {
                retryable: _isRetryableResult(verified),
            });
            return {
                ok: false,
                queued: true,
                pending,
                error: verified.error || 'Falló backend. Registro en cola local.',
                retryable: _isRetryableResult(verified),
                data: verified.data,
            };
        } catch (err) {
            // Fallback legacy: envía sin poder verificar respuesta (no-cors)
            try {
                await _sendNoCors(payload);
                return {
                    ok: true,
                    unverified: true,
                    data: { warning: 'Envío sin confirmación de respuesta (no-cors).' },
                };
            } catch (fallbackErr) {
                const pending = _enqueue(payload, fallbackErr.message || 'Error de red', {
                    retryable: true,
                });
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
     * Mantiene en cola solo los fallidos.
     * @param {number} [maxAttempts=20]
     * @returns {Promise<{sent:number, remaining:number}>}
     */
    async function reintentarPendientes(maxAttempts) {
        if (_drainInFlight) return _drainInFlight;

        _drainInFlight = (async () => {
            const limit = Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 20;
            const queue = _readQueue();
            if (!queue.length) return { sent: 0, remaining: 0 };

            const now = Date.now();
            const rest = [];
            let sent = 0;
            let attemptsUsed = 0;

            for (let i = 0; i < queue.length; i += 1) {
                const item = _normalizeItem(queue[i]);
                if (!item) continue;

                const exhausted = item.attempts >= item.maxAttempts;
                if (exhausted || item.retryable === false) {
                    const dead = _readDeadLetter();
                    dead.push({ ...item, deadAt: Date.now(), reason: item.error || 'No recuperable' });
                    _writeDeadLetter(dead);
                    continue;
                }

                const due = item.nextRetryAt <= now;
                if (!due || attemptsUsed >= limit) {
                    rest.push(item);
                    continue;
                }

                attemptsUsed += 1;

                try {
                    const result = await _sendWithCors(item.payload);
                    if (result.ok) {
                        sent += 1;
                        continue;
                    }

                    const nextAttempts = item.attempts + 1;
                    const delay = _computeBackoffDelay(nextAttempts);
                    rest.push({
                        ...item,
                        attempts: nextAttempts,
                        nextRetryAt: Date.now() + delay,
                        error: result.error || 'Error backend',
                        retryable: _isRetryableResult(result),
                    });
                } catch (err) {
                    const nextAttempts = item.attempts + 1;
                    const delay = _computeBackoffDelay(nextAttempts);
                    rest.push({
                        ...item,
                        attempts: nextAttempts,
                        nextRetryAt: Date.now() + delay,
                        error: err.message || 'Error de red',
                        retryable: true,
                    });
                }
            }

            _writeQueue(rest);
            return { sent, remaining: rest.length };
        })();

        try {
            return await _drainInFlight;
        } finally {
            _drainInFlight = null;
        }
    }

    return { enviar, reintentarPendientes, getPendingCount };
})();
