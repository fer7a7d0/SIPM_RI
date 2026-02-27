/* ============================================================
   🔹 1. BASE DE DATOS INTERNA
============================================================ */
const baseDatos = {
    121: { producto: "OXIGENO LIQUIDO EN DEWARS", tt: "211" },
    122: { producto: "ARGON LIQUIDO EN DEWARS", tt: "211" },
    123: { producto: "M3. OXIGENO LIQUIDO DEWARE", tt: "211" },
    124: { producto: "M3. NITROGENO LIQUIDO DEWARE", tt: "212" },
    125: { producto: "NITROGENO LIQUIDO DEWAR 22 PSI", tt: "212" },
    126: { producto: "M3. ARGON LIQUIDO DEWARE", tt: "213" },
    127: { producto: "M3. HELIO LIQUIDO DEWARE", tt: "213" },
    128: { producto: "M3. OXIGENO LIQUIDO DEWARE", tt: "214" },
    129: { producto: "M3. NITROGENO LIQUIDO DEWARE", tt: "214" },
    130: { producto: "M3. HELIO LIQUIDO DEWARE", tt: "214" }
};


/* ============================================================
   🔹 2. REFERENCIAS DEL DOM
============================================================ */
const codeInput = document.getElementById('code');
const productInput = document.getElementById('product');
const ttInput = document.getElementById('tt');
const cylindersInput = document.getElementById('cylinders');
const areaInput = document.getElementById('area');
const form = document.getElementById('inventory-form');
const tableContainer = document.getElementById('table-container');


/* ============================================================
   🔹 3. VARIABLES GLOBALES
============================================================ */
let records = [];
let recordId = 1;
let isEditing = false;
let editingRecordId = null;


/* ============================================================
   🔹 4. CONFIGURACIÓN GOOGLE SHEETS
============================================================ */
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbykGMxvUj0VP9uddbC3Bb3GjxR4oV4Xn4o66kQcSklI-qlHcUWEZrdByOvIeKc7X5vA/exec";


/* ============================================================
   🔹 5. GENERADOR DE UID GLOBAL
============================================================ */
function generarUID() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    const extra = crypto.randomUUID ? crypto.randomUUID().split('-')[0] : '';
    return `UID-${timestamp}-${randomPart}-${extra}`;
}


/* ============================================================
   🔹 6. ENVÍO A GOOGLE SHEETS
============================================================ */
function enviarASheets(registro) {
    fetch(SHEETS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registro)
    })
    .then(() => console.log("Envío realizado"))
    .catch(error => console.error("Error:", error));
}


/* ============================================================
   🔹 7. AUTOCOMPLETADO POR CÓDIGO
============================================================ */
codeInput.addEventListener('input', () => {
    const code = parseInt(codeInput.value, 10);

    if (baseDatos[code]) {
        const { producto, tt } = baseDatos[code];

        productInput.value = producto;
        ttInput.value = tt;

        productInput.classList.add('highlight');
        ttInput.classList.add('highlight');
        cylindersInput.focus();

        setTimeout(() => {
            productInput.classList.remove('highlight');
            ttInput.classList.remove('highlight');
        }, 1000);
    } else {
        productInput.value = '';
        ttInput.value = '';
    }
});


/* ============================================================
   🔹 8. SUBMIT DEL FORMULARIO (CREATE / UPDATE)
============================================================ */
form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const area = areaInput.value;
    const code = codeInput.value;
    const product = productInput.value;
    const tt = ttInput.value;
    const cylinders = cylindersInput.value;
    const currentDate = new Date().toLocaleDateString('en-CA'); // Formato ISO (YYYY-MM-DD)

    const submitButton = form.querySelector('button[type="submit"]');

    /* =========================
       🔹 UPDATE
    ========================= */
    if (isEditing && editingRecordId !== null) {

        const record = records.find(r => r.id === editingRecordId);

        if (record) {
            record.name = name;
            record.area = area;
            record.code = code;
            record.product = product;
            record.tt = tt;
            record.cylinders = cylinders;

            record.action = "update";
            enviarASheets(record);
        }

        isEditing = false;
        editingRecordId = null;
        submitButton.textContent = 'Enviar';
    }

    /* =========================
       🔹 CREATE
    ========================= */
    else {

        const newRecord = {
            id: recordId++,
            uid: generarUID(),
            date: currentDate,
            name,
            area,
            code,
            product,
            tt,
            cylinders
        };

        newRecord.action = "create";
        records.push(newRecord);
        enviarASheets(newRecord);
    }

    updateTable();

    codeInput.value = '';
    productInput.value = '';
    ttInput.value = '';
    cylindersInput.value = '';
    codeInput.focus();
});


/* ============================================================
   🔹 9. ACTUALIZAR TABLA
============================================================ */
function updateTable() {

    if (!records.length) {
        tableContainer.innerHTML = '';
        return;
    }

    if (!tableContainer.querySelector('table')) {
        const table = document.createElement('table');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th class="hidden">UID</th>
                    <th class="hidden">Fecha</th>
                    <th class="hidden">Nombre</th>
                    <th class="hidden">Área</th>
                    <th>Código</th>
                    <th>Producto</th>
                    <th class="hidden">TT</th>
                    <th>Cilindros</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        tableContainer.appendChild(table);
    }

    const tbody = tableContainer.querySelector('tbody');
    tbody.innerHTML = '';

    records.forEach(record => {

        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${record.id}</td>
            <td class="hidden">${record.uid}</td>
            <td class="hidden">${record.date}</td>
            <td class="hidden">${record.name}</td>
            <td class="hidden">${record.area}</td>
            <td>${record.code}</td>
            <td>${record.product}</td>
            <td class="hidden">${record.tt}</td>
            <td>${record.cylinders}</td>
            <td>
                <button onclick="editRecord(${record.id})">✏️</button>
                <button onclick="deleteRecord(${record.id})">🗑️</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}


/* ============================================================
   🔹 10. EDITAR REGISTRO
============================================================ */
function editRecord(id) {

    const record = records.find(r => r.id === id);

    if (!record) return;

    document.getElementById('name').value = record.name;
    areaInput.value = record.area;
    codeInput.value = record.code;
    productInput.value = record.product;
    ttInput.value = record.tt;
    cylindersInput.value = record.cylinders;

    isEditing = true;
    editingRecordId = id;

    form.querySelector('button[type="submit"]').textContent = 'Actualizar';
}


/* ============================================================
   🔹 11. ELIMINAR REGISTRO
============================================================ */
function deleteRecord(id) {

    const recordIndex = records.findIndex(r => r.id === id);
    if (recordIndex === -1) return;

    const recordToDelete = records[recordIndex];

    enviarASheets({
        action: "delete",
        uid: recordToDelete.uid
    });

    records.splice(recordIndex, 1);
    updateTable();
}

/* ============================================================
   🔹 12. BOTÓN DE DESCARGA CSV (NUEVA FUNCIONALIDAD)
   ⚠️ No modifica lógica existente
============================================================ */

// Crear botón dinámicamente (NO modifica HTML existente)
const downloadButton = document.getElementById("download-btn");
downloadButton.textContent = "Descargar CSV";
downloadButton.id = "download-btn";
downloadButton.style.display = "none"; // Inicialmente oculto

// Insertarlo debajo de la tabla
tableContainer.parentNode.insertBefore(downloadButton, tableContainer.nextSibling);


/* ============================================================
   🔹 CONTROL DINÁMICO DE VISIBILIDAD
============================================================ */
function actualizarVisibilidadBoton() {

    const tablaExiste = tableContainer.querySelector('table');
    const hayRegistros = records.length > 0;

    if (tablaExiste && hayRegistros) {
        downloadButton.style.display = "block";
    } else {
        downloadButton.style.display = "none";
    }
}


/* ============================================================
   🔹 OBSERVADOR DE CAMBIOS EN EL DOM
   (No altera updateTable existente)
============================================================ */
const observer = new MutationObserver(() => {
    actualizarVisibilidadBoton();
});

observer.observe(tableContainer, { childList: true, subtree: true });


/* ============================================================
   🔹 GENERAR CSV (SIN UID)
============================================================ */
function generarCSV() {

    if (!records.length) return;

    // Encabezados SIN UID
    const headers = ["ID", "Fecha", "Nombre", "Área", "Código", "Producto", "TT", "Cilindros"];

    const rows = records.map(record => [
        record.id,
        record.date,
        record.name,
        record.area,
        record.code,
        record.product,
        record.tt,
        record.cylinders
    ]);

    let csvContent = headers.join(",") + "\n";

    rows.forEach(row => {
        csvContent += row.join(",") + "\n";
    });

    return csvContent;
}


/* ============================================================
   🔹 GENERAR NOMBRE DINÁMICO DEL ARCHIVO
============================================================ */
function generarNombreArchivo() {

    const fecha = new Date().toISOString().split("T")[0];
    const area = areaInput.value || "AREA";
    const nombre = document.getElementById("name").value || "XX";

    // Obtener iniciales
    const iniciales = nombre
        .split(" ")
        .map(p => p.charAt(0).toUpperCase())
        .join("");

    return `Inventario_${fecha}_${area}_${iniciales}.csv`;
}


/* ============================================================
   🔹 EVENTO DESCARGA
============================================================ */
downloadButton.addEventListener("click", () => {

    const csv = generarCSV();
    if (!csv) return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = generarNombreArchivo();
    link.click();

    // 🔹 Reiniciar completamente después de descargar
    form.reset();
    records = [];
    recordId = 1;
    tableContainer.innerHTML = "";
    downloadButton.style.display = "none";
});


<!-- =========================
     SCRIPT SCROLL INFERIOR
========================= -->
<script>
const scrollBtn = document.getElementById("scrollDownBtn");

// Detectar scroll de la página
window.addEventListener("scroll", () => {

    const scrollPosition = window.innerHeight + window.scrollY;
    const bottomPosition = document.documentElement.scrollHeight - 10;

    if (scrollPosition >= bottomPosition) {
        scrollBtn.style.display = "none";
    } else {
        scrollBtn.style.display = "block";
    }
});

// Ir al final suavemente
scrollBtn.addEventListener("click", () => {
    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth"
    });
});
</script>