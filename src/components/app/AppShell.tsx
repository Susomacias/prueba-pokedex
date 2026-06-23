"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useView } from "@/src/components/app/ViewContext";
import { SoundMusicProvider } from "@/src/components/home/SoundMusicContext";
import { ViewProvider } from "@/src/components/app/ViewContext";
import { MusicViewBinder } from "@/src/components/app/musicViewBinder";
import { HomeShell } from "@/src/components/home/HomeShell";
import { PokedexOverlay } from "@/src/components/app/PokedexOverlay";

/**
 * Shell raíz de la SPA.
 *
 * Responsabilidades:
 *   1. Montar los providers globales (música, vista).
 *   2. Renderizar SIEMPRE la Home y SIEMPRE la Pokédex (esta última
 *      offscreen con `translateY(100%)` cuando la vista activa es
 *      "home", y al centro cuando es "pokedex"). El cambio de vista
 *      dispara una transición puramente CSS: no hay navegación entre
 *      rutas, no hay desmontaje de árboles.
 *   3. Aplicar `data-view="home" | "pokedex"` al contenedor raíz
 *      para que `globals.css` ejecute la coreografía correcta.
 *   4. Sincronizar el volumen de la música con la vista activa
 *      (`MusicViewBinder`).
 *
 * El árbol que devuelve el Server Component `app/page.tsx` es:
 *   <AppShell>
 *     <HomeShell>
 *       ...home content (logo, ash, slider, pokedex cerrada, botones)
 *     </HomeShell>
 *   </AppShell>
 *
 * La Pokédex la monta `AppShell` directamente (no la aporta el caller)
 * porque debe estar en el árbol desde el primer render para que la
 * precarga sea invisible y la animación no sufra parpadeos.
 */
export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SoundMusicProvider>
      <ViewProvider initial="home">
        <MusicViewBinder />
        <AppShellInner>{children}</AppShellInner>
      </ViewProvider>
    </SoundMusicProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { view } = useView();
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
        className="home-view absolute inset-0"
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
        className="pokedex-view absolute inset-0"
      >
        <PokedexOverlay />
      </div>
    </div>
  );
}

// Re-export del alias para que los tests puedan importar el wrapper
// sin tener que conocer la composición interna de providers.
export { HomeShell };
