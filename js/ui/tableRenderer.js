'use strict';

/**
 * TableRenderer — renderizado seguro de la tabla de registros.
 *
 * - Sin innerHTML con datos de usuario (usa DomUtils.createCell).
 * - Event delegation para edit/delete (sin onclick inline).
 * - Expone scrollToRow para que otros módulos puedan resaltar filas.
 */
const TableRenderer = (() => {

    let _container;
    let _onEditCallback   = () => {};
    let _onDeleteCallback = () => {};

    const COLUMNAS = [
        { key: 'id',        label: 'ID',        hidden: false },
        { key: 'uid',       label: 'UID',        hidden: true  },
        { key: 'date',      label: 'Fecha',      hidden: true  },
        { key: 'name',      label: 'Nombre',     hidden: true  },
        { key: 'area',      label: 'Área',       hidden: true  },
        { key: 'code',      label: 'Código',     hidden: false },
        { key: 'product',   label: 'Producto',   hidden: false },
        { key: 'tt',        label: 'TT',         hidden: true  },
        { key: 'cylinders', label: 'Cilindros',  hidden: false },
        { key: 'actions',   label: 'Acciones',   hidden: false },
    ];

    /* --- Construcción del esqueleto de tabla ------------------- */
    function _buildTableSkeleton() {
        const table    = document.createElement('table');
        const thead    = document.createElement('thead');
        const headerRow = document.createElement('tr');

        COLUMNAS.forEach(({ label, hidden }) => {
            const th = document.createElement('th');
            th.textContent = label;
            if (hidden) th.className = 'hidden';
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);
        table.appendChild(document.createElement('tbody'));
        return table;
    }

    /* --- Construcción de una fila ----------------------------- */
    function _buildRow(record) {
        const row = document.createElement('tr');

        row.appendChild(DomUtils.createCell(record.id));
        row.appendChild(DomUtils.createCell(record.uid,       'hidden'));
        row.appendChild(DomUtils.createCell(record.date,      'hidden'));
        row.appendChild(DomUtils.createCell(record.name,      'hidden'));
        row.appendChild(DomUtils.createCell(record.area,      'hidden'));
        row.appendChild(DomUtils.createCell(record.code));
        row.appendChild(DomUtils.createCell(record.product));
        row.appendChild(DomUtils.createCell(record.tt,        'hidden'));
        row.appendChild(DomUtils.createCell(record.cylinders));

        const actionCell = document.createElement('td');
        actionCell.appendChild(DomUtils.createActionButton('edit',   record.id, 'Editar registro'));
        actionCell.appendChild(DomUtils.createActionButton('delete', record.id, 'Eliminar registro'));
        row.appendChild(actionCell);

        return row;
    }

    /* --- API pública ------------------------------------------- */

    /**
     * Inicializa el renderer.
     * @param {HTMLElement} containerEl  - Elemento donde se montará la tabla.
     * @param {{ onEdit: Function, onDelete: Function }} callbacks
     */
    function init(containerEl, { onEdit, onDelete } = {}) {
        _container = containerEl;
        if (onEdit)   _onEditCallback   = onEdit;
        if (onDelete) _onDeleteCallback = onDelete;

        // Event delegation: un solo listener para TODA la tabla
        _container.addEventListener('click', e => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const id = Number(btn.dataset.id);
            if (btn.dataset.action === 'edit')   _onEditCallback(id);
            if (btn.dataset.action === 'delete') _onDeleteCallback(id);
        });
    }

    /**
     * Re-renderiza la tabla completa con el array de registros actual.
     * Si no hay registros, limpia el contenedor.
     * @param {Array} records
     */
    function render(records) {
        if (!records.length) {
            _container.innerHTML = '';
            return;
        }

        let table = _container.querySelector('table');
        if (!table) {
            table = _buildTableSkeleton();
            _container.appendChild(table);
        }

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = ''; // solo se borra tbody, no toda la tabla

        records.slice().reverse().forEach(record => {
            tbody.appendChild(_buildRow(record));
        });
    }

    /**
     * Desplaza la vista y resalta la fila con el id indicado.
     * @param {number} recordId
     */
    function scrollToRow(recordId) {
        const rows = _container.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.firstElementChild && Number(row.firstElementChild.textContent) === recordId) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.classList.add('highlight');
                setTimeout(() => row.classList.remove('highlight'), 2000);
            }
        });
    }

    return { init, render, scrollToRow };
})();
