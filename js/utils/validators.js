'use strict';

/**
 * Validators — validación del lado cliente antes de procesar el formulario.
 *
 * Retorna null si los datos son válidos, o un string con el mensaje
 * de error si hay algún problema. Depende del catálogo catalogoCodigos
 * que debe estar cargado antes que este módulo.
 */
const Validators = (() => {

    function _validateName(name) {
        if (!name || name.trim() === '') {
            return 'Selecciona un nombre.';
        }
        return null;
    }

    function _validateArea(area) {
        if (!area || area.trim() === '') {
            return 'Selecciona un área.';
        }
        return null;
    }

    function _validateCode(code) {
        const codeNum = parseInt(code, 10);
        if (isNaN(codeNum) || codeNum <= 0) {
            return 'Ingresa un código numérico válido.';
        }
        if (!catalogoCodigos[codeNum]) {
            return `El código ${codeNum} no se encuentra en el catálogo.`;
        }
        return null;
    }

    function _validateCylinders(cylinders) {
        const cyls = parseInt(cylinders, 10);
        if (isNaN(cyls) || cyls < 0) {
            return 'Cilindros debe ser un número igual o mayor a 0.';
        }
        return null;
    }

    function validateField(field, data) {
        switch (field) {
        case 'name':
            return _validateName(data.name);
        case 'area':
            return _validateArea(data.area);
        case 'code':
            return _validateCode(data.code);
        case 'cylinders':
            return _validateCylinders(data.cylinders);
        default:
            return null;
        }
    }

    function validateFormDataDetailed(data) {
        const fieldOrder = ['name', 'area', 'code', 'cylinders'];
        for (let i = 0; i < fieldOrder.length; i += 1) {
            const field = fieldOrder[i];
            const msg = validateField(field, data);
            if (msg) {
                return { field, message: msg };
            }
        }
        return null;
    }

    /**
     * @param {{ name: string, area: string, code: string, cylinders: string }} data
     * @returns {string|null}
     */
    function validateFormData({ name, area, code, cylinders }) {
        const detailed = validateFormDataDetailed({ name, area, code, cylinders });
        return detailed ? detailed.message : null;
    }

    return { validateFormData, validateFormDataDetailed, validateField };
})();
