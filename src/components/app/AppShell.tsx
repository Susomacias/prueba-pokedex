"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  AppShellProvider,
  useAppShell,
} from "@/src/components/app/ViewContext";
import { PokedexOverlay } from "@/src/components/app/PokedexOverlay";
import { AnimatedBackground } from "@/src/components/home/AnimatedBackground";

/**
 * Shell raíz de la SPA (montado en la ruta `/`).
 *
 * Responsabilidades:
 *   1. Montar el provider global de shell.
 *   2. Renderizar SIEMPRE la Pokédex pre-renderizada (offscreen
 *      cuando `view="home"`, al centro cuando `view="pokedex"`).
 *      El cambio de vista es una transición puramente CSS, sin
 *      remontaje del árbol.
 *   3. Aplicar `data-view="home" | "pokedex"` al contenedor raíz
 *      para que `globals.css` ejecute la coreografía correcta.
 *
 * La Pokédex la monta `AppShell` directamente (no la aporta el
 * caller) porque debe estar en el árbol desde el primer render
 * para que la precarga sea invisible y la animación no sufra
 * parpadeos.
 *
 * El subtree de la home lo aporta el caller (`children`). La
 * navegación entre `/` y `/pokedex` NO se hace con
 * `router.push` (eso remontaría el árbol): se hace vía
 * `history.pushState` desde el `AppShellProvider`, lo que
 * mantiene la Pokédex y la home siempre montadas y permite
 * que el CSS anime las transiciones sin parpadeos.
 */
export interface AppShellProps {
  children: ReactNode;
  initialPathname?: string;
  initialSearch?: string;
}

export function AppShell({
  children,
  initialPathname,
  initialSearch,
}: AppShellProps) {
  return (
    <AppShellProvider
      initialView="home"
      initialPathname={initialPathname}
      initialSearch={initialSearch}
    >
      <AppShellInner>{children}</AppShellInner>
    </AppShellProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { view } = useAppShell();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Atributos accesibles: cuando la Pokédex está activa marcamos el
  // contenedor de la home como aria-hidden para que los lectores de
  // pantalla no anuncien sus controles (y viceversa).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.setAttribute("data-view", view);
  }, [view]);

  return (
    <div
      ref={rootRef}
      data-view={view}
      data-testid="app-shell"
      className="relative h-dvh w-screen overflow-hidden"
    >
      {/* Fondo animado (mosaico diagonal de tiles) presente SIEMPRE:
          tanto en la home como en la Pokédex. Va en `z-0` para que la
          home y la Pokédex se pinten por encima. El degradado azul
          del `body` queda por debajo (Plan 10) y los tiles son
          semitransparentes, así que el efecto "degradado azul +
          mosaico en movimiento" se mantiene en ambas vistas. */}
      <AnimatedBackground />

      {/* Home: pre-renderizada SIEMPRE. Su visibilidad la controla el
          CSS según `data-view` del padre. Cuando view=pokedex, las
          animaciones de salida (logo arriba-izq, ash izda, slider
          drcha, pokedex_cerrada+botones abajo) la desplazan fuera de
          pantalla y la ocultan visualmente; pero el árbol sigue
          montado para que el botón "Volver al inicio" del shell (que
          ES la imagen del logo) esté listo y no haya remount. */}
      <div
        data-view-target="home"
        aria-hidden={view === "pokedex" ? "true" : undefined}
        className="home-view absolute inset-0 z-10"
      >
        {children}
      </div>

      {/* Pokédex: pre-renderizada SIEMPRE. Cuando view=home está
          translateY(100%) (offscreen); cuando view=pokedex sube al
          centro. Los datos de la Pokédex se piden mientras está
          oculta para que cuando se muestre estén listos. */}
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