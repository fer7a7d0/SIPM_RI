'use strict';

/**
 * Validators — validación del lado cliente antes de procesar el formulario.
 *
 * Retorna null si los datos son válidos, o un string con el mensaje
 * de error si hay algún problema. Depende del catálogo catalogoCodigos
 * que debe estar cargado antes que este módulo.
 */
const Validators = (() => {

    /**
     * @param {{ name: string, area: string, code: string, cylinders: string }} data
     * @returns {string|null}
     */
    function validateFormData({ name, area, code, cylinders }) {
        if (!name || name.trim() === '') {
            return 'Selecciona un nombre.';
        }

        if (!area || area.trim() === '') {
            return 'Selecciona un área.';
        }

        const codeNum = parseInt(code, 10);
        if (isNaN(codeNum) || codeNum <= 0) {
            return 'Ingresa un código numérico válido.';
        }
        if (!catalogoCodigos[codeNum]) {
            return `El código ${codeNum} no se encuentra en el catálogo.`;
        }

        const cyls = parseInt(cylinders, 10);
        if (isNaN(cyls) || cyls < 0) {
            return 'Cilindros debe ser un número igual o mayor a 0.';
        }

        return null; // válido
    }

    return { validateFormData };
})();
