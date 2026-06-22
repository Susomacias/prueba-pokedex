"use client";

import type { CSSProperties } from "react";
import { useCallback, useState } from "react";

/**
 * Plan 03.4 — Botón "PRESS START" de la pantalla de inicio.
 *
 * Renderiza un botón grande estilo arcade (bisel + glow pulsante) que
 * dispara la navegación a la Pokédex. La navegación real la gestiona
 * el listener global de teclado/click del Plan 03.5; aquí solo
 * notificamos al padre mediante `onActivate` (que también se invoca al
 * hacer click / Enter / Space).
 *
 * Animación pulsante: un `scale(1 → 1.04)` con un glow que pasa de
 * sutil a intenso, en bucle. Se desactiva automáticamente cuando el
 * usuario tiene `prefers-reduced-motion: reduce`.
 *
 * Accesibilidad:
 *   - Botón nativo (`<button>`) → foco y activacion por teclado sin
 *     ARIA extra.
 *   - `aria-label` descriptivo, texto visible claro.
 *   - `focus-visible` con anillo de alto contraste sobre el color del
 *     fondo.
 */

export interface PressStartButtonProps {
  onActivate?: () => void;
}

function usePrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PressStartButton({ onActivate }: PressStartButtonProps = {}) {
  const reduceMotion = usePrefersReducedMotion();
  // Pulsa la animación una vez al montar (no en cada render).
  const [mounted] = useState(true);

  const handleClick = useCallback(() => {
    onActivate?.();
  }, [onActivate]);

  // Estilos en línea para el glow pulsante (no se puede expresar
  // completamente con utilidades de Tailwind v4 sin un custom plugin).
  const pulseStyle: CSSProperties = reduceMotion
    ? { animation: "none" }
    : {};

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="PRESS START — entrar a la Pokédex"
      data-testid="home-press-start"
      data-mounted={mounted ? "true" : "false"}
      className={
        "font-pixel relative inline-flex select-none items-center justify-center " +
        "border-4 border-[#0c1c3e] bg-[#FFE590] px-6 py-4 " +
        "text-[#0c1c3e] text-[11px] sm:text-xs lg:text-sm " +
        "uppercase tracking-wider " +
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
    </button>
  );
}
