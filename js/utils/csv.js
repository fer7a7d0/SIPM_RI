'use strict';

/**
 * CsvUtils — generación y descarga de archivos CSV.
 *
 * Seguridad: se previene CSV Injection prefijando con comilla simple (')
 * aquellos valores que comiencen con caracteres que Excel/Sheets
 * interpretan como fórmulas: = + - @ \t \r
 */
const CsvUtils = (() => {

    /**
     * Escapa un valor individual para que sea seguro en CSV.
     * @param {*} value
     * @returns {string}
     */
    function escaparValor(value) {
        const str = String(value !== null && value !== undefined ? value : '');

        // Prevenir CSV injection
        if (str.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(str[0])) {
            return `"'${str.replace(/"/g, '""')}"`;
        }

        // Envolver en comillas si contiene separadores o saltos de línea
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }

        return str;
    }

    /**
     * Genera el contenido CSV a partir del array de registros.
     * No incluye el campo UID (dato interno).
     * @param {Array} records
     * @returns {string|null}
     */
    function generarCSV(records) {
        if (!records || records.length === 0) return null;

        const encabezados = ['ID', 'Fecha', 'Nombre', 'Área', 'Código', 'Producto', 'TT', 'Cilindros'];

        const filas = records.map(r => [
            r.id,
            r.date,
            r.name,
            r.area,
            r.code,
            r.product,
            r.tt,
            r.cylinders,
        ]);

        return [encabezados, ...filas]
            .map(fila => fila.map(escaparValor).join(','))
            .join('\n');
    }

    /**
     * Genera el nombre del archivo CSV con fecha, área e iniciales del operador.
     * @param {string} area
     * @param {string} nombre
     * @returns {string}
     */
    function generarNombreArchivo(area, nombre) {
        const fecha     = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
        const areaStr   = (area  && area.trim())   ? area.trim()   : 'AREA';
        const iniciales = (nombre && nombre.trim())
            ? nombre.trim().split(/\s+/).map(p => p.charAt(0).toUpperCase()).join('')
            : 'XX';
        return `Inventario_${fecha}_${areaStr}_${iniciales}.csv`;
    }

    /**
     * Activa la descarga del CSV en el navegador.
     * Incluye BOM (U+FEFF) para que Excel en Windows reconozca UTF-8.
     * @param {string} csv
     * @param {string} filename
     */
    function descargar(csv, filename) {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    return { generarCSV, generarNombreArchivo, descargar };
})();
