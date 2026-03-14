'use strict';

/**
 * ScrollController — botón flotante de navegación scroll.
 *
 * Mejoras respecto al script inline original:
 *   - Listener con { passive: true } para mejor rendimiento.
 *   - aria-label actualizado dinámicamente según posición.
 *   - No bloquea el hilo principal.
 */
const ScrollController = (() => {

    function init() {
        const btn = document.getElementById('scrollToggleBtn');
        if (!btn) return;

        function actualizar() {
            const scrollable = document.documentElement.scrollHeight > window.innerHeight;
            if (!scrollable) {
                btn.style.display = 'none';
                return;
            }
            const alFondo = (window.innerHeight + window.scrollY) >=
                            document.documentElement.scrollHeight - 10;
            btn.style.display = 'block';
            btn.textContent   = alFondo ? '↑' : '↓';
            btn.setAttribute('aria-label', alFondo ? 'Ir al inicio de la página' : 'Ir al final de la página');
        }

        window.addEventListener('scroll', actualizar, { passive: true });

        btn.addEventListener('click', () => {
            const alFondo = (window.innerHeight + window.scrollY) >=
                            document.documentElement.scrollHeight - 10;
            window.scrollTo({
                top:      alFondo ? 0 : document.documentElement.scrollHeight,
                behavior: 'smooth',
            });
        });
    }

    return { init };
})();
