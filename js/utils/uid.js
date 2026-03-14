'use strict';

/**
 * Genera un identificador único de sesión para cada registro.
 * Combina timestamp base-36, entropía pseudoaleatoria y (cuando
 * está disponible) una fracción de crypto.randomUUID para mayor robustez.
 * @returns {string}
 */
function generarUID() {
    const timestamp = Date.now().toString(36);
    const random    = Math.random().toString(36).substring(2, 10);
    const extra     = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID().split('-')[0]
        : '';
    return `UID-${timestamp}-${random}-${extra}`;
}
