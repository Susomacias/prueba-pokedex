"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useHomeNavigation } from "@/src/components/home/HomeNavigationContext";

/**
 * Plan 03.5 — Controlador global de teclado y click de la pantalla
 * de inicio.
 *
 * Registra (en `window`) listeners de `keydown` y `click` que
 * disparan `navigate()` desde el `HomeNavigationContext`. La
 * navegación se delega a ese contexto (que es quien coordina el
 * estado de "isNavigating" para evitar duplicados y el "isLoading"
 * para mostrar el overlay del pikachu).
 *
 * Teclas que disparan navegación:
 *   - `Enter` y `Space` (activación primaria).
 *   - Cualquier letra A–Z (mayúscula o minúscula).
 *
 * Teclas que NO disparan navegación (requisito del plan):
 *   - `Shift`, `Control`, `Alt`, `Meta`, `Tab`, `Escape`, `F1…`
 *     y, en general, cualquier tecla cuyo `event.key` no esté en
 *     `[A–Z, Enter, Space]`.
 *   - Combinaciones con Ctrl/Alt/Meta (atajos del sistema).
 *
 * Click:
 *   - Solo dispara si el target NO está dentro de un `<a>` o
 *     `<button>` (así dejamos que `next/link` y `SoundToggle`
 *     hagan su propio trabajo sin que acabemos navegando dos
 *     veces al pulsar PRESS START).
 *
 * Accesibilidad:
 *   - El listener de `keydown` está en `window`, no en un
 *     contenedor concreto, para que el usuario no necesite mover
 *     el foco al `<main>` para que la tecla funcione. Esto coincide
 *     con el comportamiento arcade del borrador.
 *
 * Cleanup:
 *   - Ambos listeners se eliminan al desmontar para no dejar
 *     handlers zombi cuando el usuario navega a `/pokedex`.
 */

const LETTER_KEYS = /^[a-zA-Z]$/;

function shouldHandleKey(key: string): boolean {
  if (!key) return false;
  if (key === "Enter" || key === " " || key === "Spacebar") return true;
  return LETTER_KEYS.test(key);
}

/**
 * Determina si el evento ocurrió sobre (o dentro de) un `<a>` o
 * `<button>`. Recorre el `composedPath()` en lugar de usar
 * `event.target.closest("a,button")` porque algunos elementos
 * (notablemente SVGs renderizados dentro del Shadow DOM del
 * dev overlay de Next.js o de iconos) cortan la cadena de
 * ancestros: `closest()` no cruza Shadow DOM y devuelve `null`
 * aunque haya un `<button>` real varios niveles arriba en el
 * Light DOM, lo que hacía que el listener global de clicks
 * navegase al pulsar el botón de sonido.
 *
 * Devuelve `true` tan pronto encuentra un `<a>` o `<button>`
 * Light DOM en el camino del evento.
 */
function isInteractiveEvent(event: Event): boolean {
  const path = event.composedPath();
  for (const node of path) {
    if (
      node instanceof Element &&
      (node.tagName === "A" || node.tagName === "BUTTON")
    ) {
      return true;
    }
  }
  return false;
}

export interface HomeNavControllerProps {
  children: ReactNode;
}

export function HomeNavController({ children }: HomeNavControllerProps) {
  const { isNavigating, navigate } = useHomeNavigation();

  // Ref que refleja el último valor de `isNavigating`. Permite que
  // los listeners (registrados una sola vez) lean el estado actual
  // sin tener que re-bindear en cada cambio.
  const navigatingRef = useRef(isNavigating);
  useEffect(() => {
    navigatingRef.current = isNavigating;
  }, [isNavigating]);

  // Ref al sentinel DOM que usamos para indicar a los tests E2E
  // que los listeners globales ya están activos (Plan 04.2).
  // Mutamos el atributo directamente desde el `useEffect` para
  // evitar `setState` dentro de un effect (anti-patrón React 19).
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // La función `navigate` es estable vía `useCallback` en el
  // provider, así que el effect solo se monta una vez por montaje
  // del controlador.
  //
  // Los listeners se registran en el `document` en **fase de
  // captura** (`capture: true`) para que se ejecuten ANTES que el
  // evento llegue al elemento enfocado. Esto es esencial para
  // Enter/Space cuando el foco está en el botón PRESS START (un
  // `<a>`): sin capture, el `<a>` recibe primero la tecla, ejecuta
  // su acción por defecto (que es navegar al href) y compite con
  // nuestro listener global. Con capture, nosotros llegamos
  // primero, llamamos a `stopPropagation()` + `preventDefault()` y
  // somos el único punto que navega.
  //
  // Usamos `document` en lugar de `window` porque Playwright
  // (`page.keyboard.press`) puede dispatchar el evento sin
  // burbujear hasta `window` cuando el foco está en un elemento
  // interactivo interno. El `document` en captura SIEMPRE recibe el
  // evento en su camino descendente al target.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!shouldHandleKey(event.key)) return;
      if (navigatingRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      navigate();
    };

    const handleClick = (event: MouseEvent) => {
      // Si el click ocurrió sobre (o dentro de) un <a>/<button>
      // dejamos que ese elemento haga su trabajo: el <a> PRESS
      // START navega por sí solo al href y el <button> de sonido
      // ejecuta su toggle sin que nosotros naveguemos. Usamos
      // `composedPath()` (no `event.target.closest(...)`) porque
      // algunos elementos dentro de Shadow DOM cortan la cadena
      // de ancestros y harían que detectásemos "click neutro"
      // cuando en realidad fue sobre un <button>.
      if (isInteractiveEvent(event)) return;
      if (navigatingRef.current) return;
      navigate();
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    // Click en capture phase también: garantiza que interceptamos
    // el click en cualquier elemento antes de que un handler
    // parental pueda cancelarlo, y nos permite inspeccionar
    // `composedPath()` con la información completa del target.
    document.addEventListener("click", handleClick, { capture: true });
    // Marcamos el sentinel DOM como "ready" para que los tests E2E
    // puedan esperar a este punto con
    // `waitForFunction('[data-home-nav-ready="true"]')`.
    const sentinel = sentinelRef.current;
    if (sentinel) {
      sentinel.setAttribute("data-home-nav-ready", "true");
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("click", handleClick, { capture: true });
      if (sentinel) {
        sentinel.setAttribute("data-home-nav-ready", "false");
      }
    };
  }, [navigate]);

  return (
    <>
      {/* Sentinel DOM que indica a los tests E2E que los listeners
          globales ya están registrados (Plan 04.2). El atributo
          `data-home-nav-ready` lo muta el `useEffect` directamente
          (no usamos `useState` para evitar el anti-patrón de
          `setState` dentro de effect). */}
      <div
        ref={sentinelRef}
        data-home-nav-ready="false"
        hidden
        aria-hidden="true"
      />
      {children}
      {/* El `<HomeLoadingOverlay>` ya NO se monta aquí: el borrador
          (líneas 317–319 del `Borrador_Pokedex.md`) prohíbe el
          loading overlay porque todos los assets deben estar ya
          precargados al iniciar la home, listos para transicionar
          a la Pokédex sin pantalla intermedia. Los assets críticos
          se cargan en el `assetPreloader` antes del primer paint y
          la transición de salida de la home no espera a nada. */}
    </>
  );
}
