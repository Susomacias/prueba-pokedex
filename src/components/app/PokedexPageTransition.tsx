"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  AppShellProvider,
  useAppShell,
} from "@/src/components/app/ViewContext";
import { PokedexOverlay } from "@/src/components/app/PokedexOverlay";
import { HomeViewNavListeners } from "@/src/components/home/HomeViewNavListeners";
import { AnimatedBackground } from "@/src/components/home/AnimatedBackground";

/**
 * Shell "inverso" para `/pokedex` y `/pokemon/[name]`.
 *
 * Se monta cuando el usuario aterriza **directamente** en una
 * ruta de Pokédex (link compartido, refresh, marcador, navegación
 * hacia atrás desde una ficha). El árbol que ve es idéntico al
 * de `/` (mismos providers, misma Pokédex pre-renderizada,
 * mismos listeners) pero con un matiz clave:
 *
 *   - El primer paint del cliente tiene `view="home"`, aunque la
 *     URL sea `/pokedex` o `/pokemon/<name>`. Esto fuerza al CSS
 *     a pintar primero la pantalla de inicio (logo, Ash, slider,
 *     pokédex cerrada) y mantener la Pokédex oculta bajo la
 *     línea de flotación.
 *   - Inmediatamente después del mount, `AppShellProvider` ejecuta
 *     el `useEffect` que sincroniza `view` con el pathname real
 *     (`deriveView("/pokedex") = "pokedex"`). El cambio de
 *     `data-view` dispara las transiciones CSS de `globals.css`:
 *     la Pokédex sube desde abajo, los elementos de la home
 *     salen por sus costados, la música hace fade out.
 *
 * El resultado: el usuario ve la transición de entrada de la
 * Pokédex idéntica a la que vería si hubiera llegado a `/` y
 * pulsado PRESS START. Esto cumple el requisito del Plan 04 de
 * que el flujo visual sea coherente independientemente de la URL
 * de entrada.
 *
 * IMPORTANTE: este componente es el equivalente "inverso" del
 * `AppShell` que monta la home en `/`. NO lo anida (no envolvemos
 * un `AppShell` dentro de este shell) porque eso duplicaría los
 * providers (`SoundMusicProvider`, `AppShellProvider`) y la
 * Pokédex pre-renderizada, lo que provocaría dos `PokedexOverlay`,
 * dos fetches a PokeAPI en paralelo y glitches visuales al cambiar
 * `data-view`.
 */
export interface PokedexPageTransitionProps {
  children: ReactNode;
  initialPathname?: string;
  initialSearch?: string;
}

export function PokedexPageTransition({
  children,
  initialPathname,
  initialSearch,
}: PokedexPageTransitionProps) {
  return (
    <AppShellProvider
      initialView="home"
      initialPathname={initialPathname}
      initialSearch={initialSearch}
    >
      <PokedexPageTransitionInner>{children}</PokedexPageTransitionInner>
    </AppShellProvider>
  );
}

function PokedexPageTransitionInner({
  children,
}: {
  children: ReactNode;
}) {
  const { view, selectedName, pathname } = useAppShell();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Mantener `data-pokedex-route-name` y `data-pathname`
  // sincronizados con el `[name]` actual por si lo necesitamos
  // desde CSS/JS (p.ej. tests E2E o componentes que lean el
  // nombre sin pasar por `useAppShell`).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.setAttribute("data-view", view);
    root.setAttribute("data-pathname", pathname);
    if (selectedName) {
      root.setAttribute("data-pokedex-route-name", selectedName);
    } else {
      root.removeAttribute("data-pokedex-route-name");
    }
  }, [view, pathname, selectedName]);

  return (
    <div
      ref={rootRef}
      data-view={view}
      data-testid="pokedex-route-shell"
      className="relative h-dvh w-screen overflow-hidden"
    >
      {/* Fondo animado (mosaico diagonal de tiles) presente SIEMPRE,
          igual que en `AppShell`. Ver comentario allí. */}
      <AnimatedBackground />

      {/* Listeners de la home: en este contexto la URL ya ES
          /pokedex o /pokemon/<name>, así que el guard
          `view !== "home"` los convierte en no-op. Se mantienen
          por simetría con la home real. */}
      <HomeViewNavListeners />

      {/* Home: pre-renderizada para permitir la transición de
          entrada desde la Pokédex. Cuando la transición termina
          (`view="pokedex"`), `aria-hidden=true` y los selectores
          CSS la desplazan fuera de pantalla. */}
      <div
        data-view-target="home"
        aria-hidden={view === "pokedex" ? "true" : undefined}
        className="home-view absolute inset-0 z-10"
      >
        {children}
      </div>

      {/* Pokédex: pre-renderizada SIEMPRE. Cuando view=home está
          translateY(100%) (offscreen); cuando view=pokedex sube
          al centro. */}
      <div
        data-view-target="pokedex"
        aria-hidden={view === "home" ? "true" : undefined}
        className="pokedex-view absolute inset-0 z-20"
      >
        <PokedexOverlay />
      </div>
    </div>
  );
}