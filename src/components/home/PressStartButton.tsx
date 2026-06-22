import type { CSSProperties } from "react";
import Link from "next/link";
import {
  HOME_POKEDEX_PATH,
} from "@/src/components/home/HomeNavigationContext";

/**
 * Plan 03.4 + 03.5 — Botón "PRESS START" de la pantalla de inicio.
 *
 * En 03.5 se renderiza como un `<Link>` de Next.js (en lugar de un
 * `<button>`) para beneficiarse del prefetch automático y de la
 * transición nativa de Next. Plan 04 sustituirá el handler de
 * navegación por una coreografía animada sin tocar este componente.
 *
 * Estilo arcade: bisel + glow pulsante (`animate-press-start-pulse`),
 * desactivado automáticamente cuando el usuario tiene
 * `prefers-reduced-motion: reduce`.
 *
 * Accesibilidad:
 *   - `<a>` nativo → foco y activación por teclado sin ARIA extra.
 *   - `aria-label` descriptivo, texto visible claro ("PRESS START").
 *   - `focus-visible` con anillo de alto contraste sobre el fondo.
 *   - `prefetch` habilitado para que la ruta `/pokedex` esté lista
 *     cuando el usuario pulse.
 */

function usePrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PressStartButton() {
  const reduceMotion = usePrefersReducedMotion();

  // Estilos en línea para el glow pulsante (no se puede expresar
  // completamente con utilidades de Tailwind v4 sin un custom plugin).
  const pulseStyle: CSSProperties = reduceMotion
    ? { animation: "none" }
    : {};

  return (
    <Link
      href={HOME_POKEDEX_PATH}
      prefetch
      aria-label="PRESS START — entrar a la Pokédex"
      data-testid="home-press-start"
      className={
        "font-pixel relative inline-flex select-none items-center justify-center " +
        "border-4 border-[#0c1c3e] bg-[#FFE590] px-6 py-4 " +
        "text-[#0c1c3e] text-[11px] sm:text-xs lg:text-sm " +
        "uppercase tracking-wider no-underline " +
        "shadow-[6px_6px_0_#0c1c3e] " +
        "transition-transform duration-150 ease-out " +
        "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#0c1c3e] " +
        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[4px_4px_0_#0c1c3e] " +
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF9203] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1c3e] " +
        (reduceMotion ? "" : "animate-press-start-pulse")
      }
      style={pulseStyle}
    >
      <span className="relative z-10 drop-shadow-[1px_1px_0_rgba(255,255,255,0.6)]">
        PRESS START
      </span>
    </Link>
  );
}
