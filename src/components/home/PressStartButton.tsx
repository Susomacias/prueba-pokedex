"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  TRANSITION_PATHS,
  useHasTransitionOrchestrator,
  useOptionalTransitionOrchestrator,
} from "@/src/components/transitions/TransitionOrchestratorContext";

/**
 * Plan 03.4 + 03.5 + 04.1 — Botón "PRESS START" de la pantalla de inicio.
 *
 * En 03.5 se renderiza como un `<Link>` de Next.js (en lugar de un
 * `<button>`) para beneficiarse del prefetch automático y de la
 * transición nativa de Next. El Plan 04.1 sustituye la navegación
 * nativa por una llamada al orquestador:
 *
 *   - El botón sigue siendo un `<Link>` real (mantenemos prefetch,
 *     href semántico para el navegador, accesibilidad).
 *   - Si está dentro del provider del orquestador, su `onClick`
 *     llama a `transitionTo('pokedex')` y cancela la navegación
 *     nativa (`preventDefault`).
 *   - Si NO está dentro del provider, deja que el `<Link>` navegue
 *     de forma nativa (degradación elegante).
 *
 * Estilo arcade: bisel + glow pulsante (`animate-press-start-pulse`),
 * desactivado automáticamente cuando el usuario tiene
 * `prefers-reduced-motion: reduce`.
 */

function usePrefersReducedMotion(): boolean {
  // En SSR no hay `window`: devolvemos `false` (animación activa) y
  // nos sincronizamos en el cliente con un effect.
  const [reduced, setReduced] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

const BASE_CLASSES =
  "font-pixel relative inline-flex select-none items-center justify-center " +
  "border-4 border-[#0c1c3e] bg-[#FFE590] px-6 py-4 " +
  "text-[#0c1c3e] text-[11px] sm:text-xs lg:text-sm " +
  "uppercase tracking-wider no-underline " +
  "shadow-[6px_6px_0_#0c1c3e] " +
  "transition-transform duration-150 ease-out " +
  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#0c1c3e] " +
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[4px_4px_0_#0c1c3e] " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF9203] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1c3e]";

export function PressStartButton() {
  const reduceMotion = usePrefersReducedMotion();
  const hasOrchestrator = useHasTransitionOrchestrator();
  const { transitionTo } = useOptionalTransitionOrchestrator();

  // Si NO hay orquestador, no pasamos `onClick` → el `<Link>` hace
  // la navegación nativa. Si hay orquestador, interceptamos el click
  // y delegamos en él (que se encarga del preload + push al final).
  const handleClick = hasOrchestrator
    ? (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        void transitionTo("pokedex");
      }
    : undefined;

  const pulseStyle: CSSProperties = reduceMotion ? { animation: "none" } : {};
  const classes = useMemo(
    () => BASE_CLASSES + (reduceMotion ? "" : " animate-press-start-pulse"),
    [reduceMotion],
  );

  return (
    <Link
      href={TRANSITION_PATHS.pokedex}
      prefetch
      onClick={handleClick}
      aria-label="PRESS START — entrar a la Pokédex"
      data-testid="home-press-start"
      className={classes}
      style={pulseStyle}
    >
      <span className="relative z-10 drop-shadow-[1px_1px_0_rgba(255,255,255,0.6)]">
        PRESS START
      </span>
    </Link>
  );
}