'use strict';

/**
 * DomUtils — construcción segura de nodos DOM.
 *
 * Regla: NUNCA usar innerHTML con datos provenientes del usuario.
 * Todos los valores se asignan via textContent para prevenir XSS.
 */
const DomUtils = (() => {

    /**
     * Crea un <td> con texto seguro.
     * @param {*}      value     - Valor a mostrar.
     * @param {string} [className] - Clase CSS opcional.
     */
    function createCell(value, className) {
        const td = document.createElement('td');
        if (className) td.className = className;
        td.textContent = (value !== null && value !== undefined) ? String(value) : '';
        return td;
    }

    /**
     * Crea un botón de acción para la tabla.
     * Usa data-attributes en lugar de onclick inline para evitar
     * exponer funciones globales y facilitar el event delegation.
     *
     * @param {'edit'|'delete'} action
     * @param {number}          id        - ID del registro.
     * @param {string}          ariaLabel - Texto accesible.
     */
    function createActionButton(action, id, ariaLabel) {
        const btn = document.createElement('button');
        btn.type            = 'button';
        btn.className       = `btn-action btn-action--${action}`;
        btn.dataset.action  = action;
        btn.dataset.id      = String(id);
        btn.setAttribute('aria-label', ariaLabel);
        btn.textContent     = action === 'edit' ? '✏️' : '🗑️';
        return btn;
    }

    return { createCell, createActionButton };
})();
