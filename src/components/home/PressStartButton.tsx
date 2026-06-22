"use client";

import {
  useMemo,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { TRANSITION_PATHS } from "@/src/components/transitions/TransitionOrchestratorContext";

/**
 * Plan 03.4 + 03.5 + 04.1 + 04.2 — Botón "PRESS START" de la pantalla
 * de inicio.
 *
 * En 03.5 se renderiza como un `<Link>` de Next.js para beneficiarse
 * del prefetch automático. Plan 04.1 añadió una interceptación del
 * click para llamar al orquestador de transiciones. Plan 04.2 ha
 * refactorizado la interceptación: ahora la navegación (con o sin
 * animación) la coordina `HomeNavigationContext.navigate()`, que
 * dispara `homeTransitionBus.playExit()` antes del push.
 *
 * Resultado: este botón ya NO necesita interceptar el click. El
 * `<Link>` navega de forma nativa y, gracias al listener global de
 * clicks del `HomeNavController` (que NO intercepta clicks sobre
 * `<a>`/`<button>`), el `HomeNavigationContext` recibe la
 * navegación. Si está montado un `HomeTransitionOut`, se ejecuta la
 * animación; si no, la navegación es directa.
 *
 * Estilo arcade: bisel + glow pulsante (`animate-press-start-pulse`),
 * desactivado automáticamente cuando el usuario tiene
 * `prefers-reduced-motion: reduce`.
 */

function usePrefersReducedMotion(): boolean {
  // Usamos `useSyncExternalStore` (canónico React 19) para leer la
  // media query de forma segura frente a hidratación y evitar
  // `setState` dentro de `useEffect` (anti-patrón React 19).
  const subscribe = (cb: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return () => undefined;
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
  const getSnapshot = () => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };
  const getServerSnapshot = () => false;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
  const pulseStyle: CSSProperties = reduceMotion ? { animation: "none" } : {};
  const classes = useMemo(
    () => BASE_CLASSES + (reduceMotion ? "" : " animate-press-start-pulse"),
    [reduceMotion],
  );

  return (
    <Link
      href={TRANSITION_PATHS.pokedex}
      prefetch
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