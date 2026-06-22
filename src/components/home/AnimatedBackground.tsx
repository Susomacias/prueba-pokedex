import type { CSSProperties } from "react";

/**
 * Plan 03.1 — Fondo animado en mosaico diagonal.
 *
 * Dibuja `public/pagina_inicio/tileFondo.png` como mosaico repetido
 * que se desplaza lentamente en diagonal (45° hacia arriba-izquierda)
 * sin saltos visibles. Cubre toda la pantalla y se mantiene `fixed`,
 * por lo que no genera scroll ni se desplaza con el contenido.
 *
 * Estrategia:
 *  - Dos capas (`<div>`) que contienen el mismo `background-image`
 *    repetido.
 *  - Cada capa se anima con `@keyframes` aplicando `transform:
 *    translate(...)` para aprovechar la GPU (evitamos
 *    `background-position` animado que provoca repintado).
 *  - Las dos capas se solapan con un offset del tamaño del tile para
 *    que el bucle sea continuo y no aparezcan bordes al reiniciar.
 *  - Si el usuario prefiere reducir movimiento, la animación se
 *    desactiva vía `animation: none` desde un hook cliente.
 */
export function AnimatedBackground() {
  const reduceMotion = usePrefersReducedMotion();

  const layerStyle: CSSProperties = {
    backgroundImage: "url(/pagina_inicio/tileFondo.png)",
    backgroundRepeat: "repeat",
    backgroundSize: "128px 128px",
    willChange: "transform",
    animation: reduceMotion
      ? "none"
      : "home-tile-drift 18s linear infinite",
  };

  return (
    <div
      aria-hidden="true"
      data-testid="animated-background"
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      <div
        data-testid="animated-background-tile"
        className="absolute -inset-[200%]"
        style={layerStyle}
      />
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}