"use client";

import { useEffect } from "react";
import { useAppShell } from "@/src/components/app/ViewContext";

/**
 * Listeners globales de teclado/click de la home, sin markup ni
 * providers. Se monta dentro del árbol en `HomeShell` (ruta `/`) y
 * también en `PokedexPageTransition` (rutas `/pokedex` y
 * `/pokemon/[name]`, donde la URL ya es destino y los listeners
 * son un no-op defensivo).
 *
 * Comportamiento:
 *   - Tecla: Enter, Space, o cualquier letra A–Z navega a
 *     `/pokedex`.
 *   - Click: en cualquier punto que NO esté dentro de un `<a>` o
 *     `<button>` también navega (deja que el PRESS START y el
 *     botón de sonido operen sin doble navegación).
 *
 * Si la vista activa NO es "home" los listeners son no-op (evita
 * que las pulsaciones del usuario en la Pokédex filtren a la home
 * y provoquen navegaciones duplicadas).
 *
 * Este componente existe separado del `HomeShell` para poder
 * reutilizarlo desde `PokedexPageTransition` sin volver a montar
 * el `AppShell` (y por tanto sin duplicar providers ni la Pokédex
 * pre-renderizada).
 */
const LETTER_KEYS = /^[a-zA-Z]$/;

function shouldHandleKey(key: string): boolean {
  if (!key) return false;
  if (key === "Enter" || key === " " || key === "Spacebar") return true;
  return LETTER_KEYS.test(key);
}

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

export function HomeViewNavListeners() {
  const { view, goToPokedex } = useAppShell();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!shouldHandleKey(event.key)) return;
      if (view !== "home") return;
      event.preventDefault();
      event.stopPropagation();
      goToPokedex();
    };

    const handleClick = (event: MouseEvent) => {
      if (isInteractiveEvent(event)) return;
      if (view !== "home") return;
      goToPokedex();
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [view, goToPokedex]);

  return null;
}