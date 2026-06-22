"use client";

import { useSyncExternalStore } from "react";

/**
 * Plan 05.4 — Hook que devuelve la orientación de la carcasa a usar.
 *
 *   - `'vertical'` cuando `window.innerWidth < VERTICAL_LAYOUT_MAX_WIDTH`.
 *   - `'horizontal'` en caso contrario.
 *
 * Implementación con `useSyncExternalStore` (canónico React 19) para
 * sincronizar con el tamaño de la ventana de forma segura frente a
 * hidratación y sin warnings de SSR. El `getServerSnapshot()` devuelve
 * siempre `'horizontal'` (el caso por defecto en SSR/desktop); durante
 * la hidratación se sustituye por el valor real de la ventana si el
 * cliente tiene un viewport más estrecho.
 *
 * Si el entorno no expone `window` (SSR puro o test sin jsdom), el
 * snapshot del servidor es estable y consistente con `matchMedia`, que
 * es seguro de leer también en el servidor.
 *
 * Suscripción:
 *   - Listener de `resize` en `window` (cross-browser, sin
 *     `matchMedia` quirks en jsdom).
 *   - Como alternativa podríamos usar `matchMedia('(max-width: 768px)')`
 *     pero requiere un polyfill en algunos tests y aporta poco frente
 *     al listener de resize para este caso.
 */

/** Breakpoint en píxeles por debajo del cual se usa la carcasa vertical. */
export const VERTICAL_LAYOUT_MAX_WIDTH = 768;

export type ViewportLayout = "vertical" | "horizontal";

/** Snapshot estable que se usa durante SSR. */
const SERVER_SNAPSHOT: ViewportLayout = "horizontal";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.innerWidth === "number";
}

function computeSnapshot(): ViewportLayout {
  if (!isBrowser()) return SERVER_SNAPSHOT;
  return window.innerWidth < VERTICAL_LAYOUT_MAX_WIDTH ? "vertical" : "horizontal";
}

function subscribe(listener: () => void): () => void {
  if (!isBrowser()) return () => undefined;
  window.addEventListener("resize", listener, { passive: true });
  return () => {
    window.removeEventListener("resize", listener);
  };
}

export function useViewportLayout(): ViewportLayout {
  return useSyncExternalStore(subscribe, computeSnapshot, () => SERVER_SNAPSHOT);
}
