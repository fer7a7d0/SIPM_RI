// Referencias a elementos clave para el cambio de tema.
const toggle = document.getElementById('themeToggle');
const body = document.body;

// Recupera el tema guardado y lo aplica al cargar la pagina.
const saved = localStorage.getItem('theme');
if (saved) body.classList.add(saved);

// Sincroniza el estado visual del switch con la clase actual del body.
toggle.checked = body.classList.contains('light');

// Cambia entre tema oscuro/claro y guarda la preferencia.
toggle.addEventListener('change', () => {
  if (toggle.checked) {
    body.classList.add('light');
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.remove('light');
    localStorage.setItem('theme', '');
  }
});

// Mantiene la vibracion tactil al pulsar las opciones del menu en dispositivos compatibles.
document.querySelectorAll('.item a').forEach(link => {
  link.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(10);
  });
});
