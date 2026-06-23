"use client";

import {
  useMemo,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useView } from "@/src/components/app/ViewContext";

/**
 * Botón "PRESS START" de la pantalla de inicio.
 *
 * Cambia la vista a "pokedex" vía `useView()`. No navega: la Pokédex
 * ya está pre-renderizada offscreen en el árbol, así que pulsar
 * PRESS START sólo dispara la transición CSS que sube la Pokédex al
 * centro y mueve la home fuera de pantalla.
 *
 * Estilo arcade: bisel + glow pulsante (`animate-press-start-pulse`),
 * desactivado automáticamente cuando el usuario tiene
 * `prefers-reduced-motion: reduce`.
 */

function usePrefersReducedMotion(): boolean {
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
  const { goToPokedex, view } = useView();
  const pulseStyle: CSSProperties = reduceMotion ? { animation: "none" } : {};
  const classes = useMemo(
    () => BASE_CLASSES + (reduceMotion ? "" : " animate-press-start-pulse"),
    [reduceMotion],
  );

  const disabled = view !== "home";

  return (
    <button
      type="button"
      onClick={goToPokedex}
      disabled={disabled}
      aria-label="PRESS START — entrar a la Pokédex"
      data-testid="home-press-start"
      className={classes}
      style={pulseStyle}
    >
      <span className="relative z-10 drop-shadow-[1px_1px_0_rgba(255,255,255,0.6)]">
        PRESS START
      </span>
    </button>
  );
}
