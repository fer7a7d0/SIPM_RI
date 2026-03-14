'use strict';

/**
 * Catálogo de productos.
 * Clave: código numérico del producto.
 * Valor: { producto: string, tt: string }
 *
 * Para agregar más códigos: añade una nueva entrada al objeto.
 * Fuente única de verdad — no duplicar en otro archivo.
 */
const catalogoCodigos = {
    108: { producto: 'AIRE COMPRIMIDO',                       tt: '0'   },
    122: { producto: 'ARGON LIQUIDO EN DEWARS',               tt: '214' },
    130: { producto: 'M3. OXIGENO LIQUIDO DEWARE',            tt: '211' },
    131: { producto: 'M3. NITROGENO LIQUIDO DEWARE',          tt: '212' },
    133: { producto: 'NITROGENO LIQUIDO DEWAR 22 PSI',        tt: '212' },
    138: { producto: 'M3 NITROGENO DEWAR ABIERTO',            tt: '212' },
    141: { producto: 'INFRA COLD NUGGET',                     tt: '0'   },
    204: { producto: 'OXIDO NITROSO',                         tt: '0'   },
    206: { producto: 'M3. OXIGENO MEDICIN.LIQUID.THERMO DW',  tt: '211' },
    222: { producto: 'ACETILENO KG. MCA INFRA VALVULA CGA',   tt: '102' },
};
