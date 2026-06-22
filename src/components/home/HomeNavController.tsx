"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { HomeLoadingOverlay } from "@/src/components/home/HomeLoadingOverlay";
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

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest("a,button") !== null;
}

export interface HomeNavControllerProps {
  children: ReactNode;
}

export function HomeNavController({ children }: HomeNavControllerProps) {
  const { isNavigating, isLoading, navigate } = useHomeNavigation();

  // Ref que refleja el último valor de `isNavigating`. Permite que
  // los listeners (registrados una sola vez) lean el estado actual
  // sin tener que re-bindear en cada cambio.
  const navigatingRef = useRef(isNavigating);
  useEffect(() => {
    navigatingRef.current = isNavigating;
  }, [isNavigating]);

  // La función `navigate` es estable vía `useCallback` en el
  // provider, así que el effect solo se monta una vez por montaje
  // del controlador.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!shouldHandleKey(event.key)) return;
      if (navigatingRef.current) return;
      event.preventDefault();
      navigate();
    };

    const handleClick = (event: MouseEvent) => {
      if (isInteractiveTarget(event.target)) return;
      if (navigatingRef.current) return;
      navigate();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
    };
  }, [navigate]);

  return (
    <>
      {children}
      <HomeLoadingOverlay isLoading={isLoading} />
    </>
  );
}
