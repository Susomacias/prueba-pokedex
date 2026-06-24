"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AppShell } from "@/src/components/app/AppShell";
import { HomeViewNavListeners } from "@/src/components/home/HomeViewNavListeners";

/**
 * Shell cliente de la pantalla de inicio (ruta `/`).
 *
 * Envuelve la home en el `AppShell` (providers + estado de vista
 * derivado de la URL). Los listeners de teclado/click que
 * navegan a `/pokedex` los monta `HomeViewNavListeners`, que se
 * importa desde `PokedexPageTransition` para reutilizar la misma
 * lógica sin duplicar el `AppShell`.
 *
 * Cuando el usuario aterriza directo en `/pokedex` (link
 * compartido o refresh), el pathname ya es `/pokedex` y los
 * listeners se desactivan (`view !== "home"`) para evitar que
 * las pulsaciones en la Pokédex filtren a la home y provoquen
 * dobles navegaciones.
 */
export interface HomeShellProps {
  children: ReactNode;
  initialPathname?: string;
  initialSearch?: string;
}

export function HomeShell({
  children,
  initialPathname,
  initialSearch,
}: HomeShellProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Sentinel para tests E2E: marca `data-home-nav-ready="true"`
  // cuando los listeners de teclado/click están registrados.
  // Mientras no se monte, los tests saben que la home todavía no
  // es interactiva (útil para evitar flakiness al pulsar antes
  // del primer effect).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (sentinel) sentinel.setAttribute("data-home-nav-ready", "true");
    return () => {
      if (sentinel) sentinel.setAttribute("data-home-nav-ready", "false");
    };
  }, []);

  return (
    <AppShell initialPathname={initialPathname} initialSearch={initialSearch}>
      <HomeViewNavListeners />
      <div
        ref={sentinelRef}
        data-home-nav-ready="false"
        hidden
        aria-hidden="true"
      />
      {children}
    </AppShell>
  );
}