/**
 * Plan 03.2 — Hueco del botón PRESS START (placeholder).
 *
 * La fase 03.4 añadirá la animación pulsante y el efecto arcade
 * (bisel, glow). Aquí dejamos un botón accesible con el texto
 * esperado y `aria-label` para reservar el centro inferior.
 */
export function PressStartButton() {
  return (
    <button
      type="button"
      aria-label="PRESS START — entrar a la Pokédex"
      data-testid="home-press-start"
      className="font-pixel inline-flex items-center justify-center border-4 border-[#0c1c3e] bg-[#FFE590] px-4 py-3 text-[10px] sm:text-xs text-[#0c1c3e] shadow-[6px_6px_0_#0c1c3e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF9203]"
    >
      PRESS START
    </button>
  );
}