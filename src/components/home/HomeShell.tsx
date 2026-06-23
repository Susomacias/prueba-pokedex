"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useView } from "@/src/components/app/ViewContext";
import { AppShell } from "@/src/components/app/AppShell";

/**
 * Shell cliente de la pantalla de inicio.
 *
 * Envuelve la home en el `AppShell` (providers + view state) y registra
 * los listeners globales de teclado/click que cambian la vista a
 * "pokedex":
 *
 *   - Tecla: Enter, Space, o cualquier letra A–Z.
 *   - Click: en cualquier punto que NO esté dentro de un `<a>` o
 *     `<button>` (deja que el PRESS START y el botón de sonido
 *     operen sin que naveguemos dos veces).
 *
 * Mientras la vista activa NO sea "home" los listeners se desactivan
 * para evitar que las pulsaciones del usuario en la Pokédex (que
 * tienen sus propios atajos) filtren a la home.
 */
export interface HomeShellProps {
  children: ReactNode;
}

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

export function HomeShell({ children }: HomeShellProps) {
  return (
    <AppShell>
      <HomeShellInner>{children}</HomeShellInner>
    </AppShell>
  );
}

function HomeShellInner({ children }: { children: ReactNode }) {
  const { view, goToPokedex } = useView();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Refleja la vista activa en una ref para que los listeners (que se
  // registran una sola vez) lean el valor actualizado sin re-bindear.
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!shouldHandleKey(event.key)) return;
      if (viewRef.current !== "home") return;
      event.preventDefault();
      event.stopPropagation();
      goToPokedex();
    };

    const handleClick = (event: MouseEvent) => {
      if (isInteractiveEvent(event)) return;
      if (viewRef.current !== "home") return;
      goToPokedex();
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("click", handleClick, { capture: true });

    const sentinel = sentinelRef.current;
    if (sentinel) sentinel.setAttribute("data-home-nav-ready", "true");

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("click", handleClick, { capture: true });
      if (sentinel) sentinel.setAttribute("data-home-nav-ready", "false");
    };
  }, [goToPokedex]);

  return (
    <>
      <div
        ref={sentinelRef}
        data-home-nav-ready="false"
        hidden
        aria-hidden="true"
      />
      {children}
    </>
  );
}
