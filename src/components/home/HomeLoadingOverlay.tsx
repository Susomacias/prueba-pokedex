import Image from "next/image";

/**
 * Plan 03.5 — Overlay de "CARGANDO…" con pikachu.
 *
 * Mientras la navegación cliente a `/pokedex` no haya completado,
 * mostramos el gif de `public/loading-pikachu.gif` con el texto
 * "CARGANDO…" en `Press Start 2P`. Esto cubre el caso de assets
 * grandes en planes futuros (5, 6, 8) que puedan tardar > 200ms.
 *
 * Accesibilidad:
 *   - `role="status"` + `aria-live="polite"` para que los lectores
 *     de pantalla anuncien el cambio cuando aparece el overlay.
 *   - `aria-busy="true"` para señalar que la zona está esperando.
 *   - `aria-hidden="true"` en la imagen decorativa (el texto ya
 *     aporta la información accesible).
 *
 * Cuando `isLoading` es `false`, no renderizamos nada (`null`) para
 * no contaminar el árbol DOM ni afectar a los tests que cuentan
 * nodos.
 */

export interface HomeLoadingOverlayProps {
  isLoading: boolean;
}

export function HomeLoadingOverlay({ isLoading }: HomeLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Cargando Pokédex"
      data-testid="home-loading-overlay"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0c1c3e]/85 backdrop-blur-sm"
    >
      <Image
        src="/loading-pikachu.gif"
        alt=""
        aria-hidden="true"
        width={160}
        height={160}
        unoptimized
        priority
        className="h-32 w-32 sm:h-40 sm:w-40"
      />
      <p
        className="font-pixel text-[10px] sm:text-xs tracking-[0.4em] text-[#FFE590]"
      >
        CARGANDO&hellip;
      </p>
    </div>
  );
}
