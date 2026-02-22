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
const form = document.getElementById('inventory-form');
const areaInput = document.getElementById('area'); // Asumiendo que el campo Área está definido

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

    // Validate required fields
    if (!codeInput.value || !cylindersInput.value) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    // Show success message
    alert('Formulario enviado con éxito.');

    // Clear specific fields
    areaInput.value = ""; // Assuming areaInput is defined for the Área field
    codeInput.value = "";
    productInput.value = "";
    ttInput.value = "";
    cylindersInput.value = "";

    // Add smooth animations during clearing
    areaInput.classList.add('highlight');
    codeInput.classList.add('highlight');
    productInput.classList.add('highlight');
    ttInput.classList.add('highlight');
    cylindersInput.classList.add('highlight');

    setTimeout(() => {
        areaInput.classList.remove('highlight');
        codeInput.classList.remove('highlight');
        productInput.classList.remove('highlight');
        ttInput.classList.remove('highlight');
        cylindersInput.classList.remove('highlight');
    }, 1000);

    // Return focus to the Área field
    areaInput.focus();
});