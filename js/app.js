// Base de datos interna
const baseDatos = {
    122: { producto: "Dewar de Argón", tt: "Argón" },
    130: { producto: "Dewar de Oxígeno", tt: "Oxígeno" },
    131: { producto: "Dewar de Nitrógeno", tt: "Oxígeno" }
};

// Referencias a los elementos del formulario
const codeInput = document.getElementById('code');
const productInput = document.getElementById('product');
const ttInput = document.getElementById('tt');
const cylindersInput = document.getElementById('cylinders');
const areaInput = document.getElementById('area');
const form = document.getElementById('inventory-form');

// Internal array to store records
let records = [];
let recordId = 1;

// Reference to the table container
const tableContainer = document.getElementById('table-container');

// Track if the form is in edit mode
let isEditing = false;
let editingRecordId = null;

// Evento para manejar el cambio en el campo de código
codeInput.addEventListener('input', () => {
    const code = parseInt(codeInput.value, 10);

    if (baseDatos[code]) {
        const { producto, tt } = baseDatos[code];

        // Autocompletar campos
        productInput.value = producto;
        ttInput.value = tt;

        // Aplicar animación
        productInput.classList.add('highlight');
        ttInput.classList.add('highlight');

        // Mover el cursor al siguiente campo
        cylindersInput.focus();

        // Remover animación después de un tiempo
        setTimeout(() => {
            productInput.classList.remove('highlight');
            ttInput.classList.remove('highlight');
        }, 1000);
    } else {
        productInput.value = '';
        ttInput.value = '';
    }
});

// Validación básica antes de enviar
form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const area = areaInput.value;
    const code = codeInput.value;
    const product = productInput.value;
    const tt = ttInput.value;
    const cylinders = cylindersInput.value;

    const submitButton = form.querySelector('button[type="submit"]');

    if (isEditing && editingRecordId !== null) {
        // Update the existing record
        const record = records.find(r => r.id === editingRecordId);
        if (record) {
            record.name = name;
            record.area = area;
            record.code = code;
            record.product = product;
            record.tt = tt;
            record.cylinders = cylinders;
        }
        isEditing = false;
        editingRecordId = null;

        // Restore the default button text
        submitButton.textContent = 'Enviar';
    } else {
        // Create a new record
        const newRecord = {
            id: recordId++,
            name,
            area,
            code,
            product,
            tt,
            cylinders
        };
        records.push(newRecord);
    }

    updateTable();

    // Reset only specific fields
    codeInput.value = '';
    productInput.value = '';
    ttInput.value = '';
    cylindersInput.value = '';

    // Return focus to the 'Código' field
    codeInput.focus();
});

// Update the table dynamically
function updateTable() {
    if (!records.length) {
        const downloadButton = document.getElementById('download-button');
        if (downloadButton) {
            downloadButton.style.display = 'none';
        }
        return;
    }

    if (!tableContainer.querySelector('table')) {
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
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
            <td class="hidden">${record.name}</td>
            <td class="hidden">${record.area}</td>
            <td>${record.code}</td>
            <td>${record.product}</td>
            <td class="hidden">${record.tt}</td>
            <td>${record.cylinders}</td>
            <td>
                <button class="action-btn edit" onclick="editRecord(${record.id})">✏️</button>
                <button class="action-btn delete" onclick="deleteRecord(${record.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Ensure the download button is visible and positioned below the table
    let downloadButton = document.getElementById('download-button');
    if (!downloadButton) {
        downloadButton = document.createElement('button');
        downloadButton.id = 'download-button';
        downloadButton.textContent = 'Descargar Tabla';
        downloadButton.addEventListener('click', downloadTableAsCSV);
        tableContainer.appendChild(downloadButton);
    }
    downloadButton.style.display = 'block';

    // Ensure the button is always below the table
    tableContainer.appendChild(downloadButton);
}

// Edit a record
function editRecord(id) {
    const record = records.find(r => r.id === id);

    if (record) {
        document.getElementById('name').value = record.name;
        areaInput.value = record.area;
        codeInput.value = record.code;
        productInput.value = record.product;
        ttInput.value = record.tt;
        cylindersInput.value = record.cylinders;

        isEditing = true;
        editingRecordId = id;

        // Change the button text to 'Actualizar'
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.textContent = 'Actualizar';
    }
}

// Delete a record
function deleteRecord(id) {
    const recordIndex = records.findIndex(r => r.id === id);
    if (recordIndex !== -1) {
        records.splice(recordIndex, 1); // Remove the record from the array
    }

    // Clear the table and hide the download button if no records remain
    if (records.length === 0) {
        const table = tableContainer.querySelector('table');
        if (table) {
            tableContainer.removeChild(table);
        }
        const downloadButton = document.getElementById('download-button');
        if (downloadButton) {
            downloadButton.style.display = 'none';
        }
    } else {
        // Refresh the table if records still exist
        updateTable();
    }
}

// Download the table as a CSV file
function downloadTableAsCSV() {
    if (!records.length) {
        alert('No hay datos en la tabla para descargar.');
        return;
    }

    const confirmDownload = confirm('¿Deseas descargar la tabla como un archivo .csv?');
    if (!confirmDownload) return;

    const name = document.getElementById('name').value || 'Registro';
    const area = document.getElementById('area').value || 'General';
    const fileName = `${name}_${area}_tabla.csv`;

    const csvContent = [
        ['ID', 'Nombre', 'Área', 'Código', 'Producto', 'TT', 'Cilindros'],
        ...records.map(record => [
            record.id,
            record.name,
            record.area,
            record.code,
            record.product,
            record.tt,
            record.cylinders
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Reset the form and table
    records = [];
    recordId = 1;
    const table = tableContainer.querySelector('table');
    if (table) {
        tableContainer.removeChild(table);
    }
    const downloadButton = document.getElementById('download-button');
    if (downloadButton) {
        downloadButton.style.display = 'none';
    }
    resetForm();
}

function resetForm() {
    form.reset();
    document.getElementById('name').focus();
}