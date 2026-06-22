/**
 * Plan 03.2 — Hueco del botón de sonido (placeholder).
 *
 * La fase 03.4 implementará el toggle con `lucide-react` y el audio
 * en loop. Aquí dejamos un botón accesible con `aria-label` para
 * reservar la esquina inferior izquierda.
 */
export function SoundToggle() {
  return (
    <button
      type="button"
      aria-label="Activar o desactivar sonido"
      data-testid="home-sound-toggle"
      className="inline-flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded border-4 border-[#0c1c3e] bg-[#126CA3] text-white shadow-[4px_4px_0_#0c1c3e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFE590]"
    >
      <span aria-hidden="true" className="text-xs sm:text-sm">
        ♪
      </span>
    </button>
  );
}