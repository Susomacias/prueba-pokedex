"use client";

import { Suspense } from "react";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { PokedexPageProvider } from "@/src/components/pokedex/PokedexPageProvider";
import { PokedexShell } from "@/src/components/pokedex/PokedexShell";
import { PokedexHomeButton } from "@/src/components/pokedex/PokedexHomeButton";

/**
 * Vista "Pokédex abierta" siempre pre-renderizada en el árbol.
 *
 * El padre (`AppShell`) la sitúa offscreen (`translateY(100%)`) cuando
 * la vista activa es "home" y la trae al centro cuando es "pokedex".
 *
 * Este subtree es IDÉNTICO al que montaba `src/app/pokedex/page.tsx`:
 * misma jerarquía de providers y mismos slots. La única diferencia es
 * que aquí NO se desmonta al volver a la home: la Pokédex se queda en
 * el DOM, con su estado (filtros, pokemon seleccionado, etc.)
 * preservado. Eso evita recargas y reflows al volver.
 *
 * El botón "Volver al inicio" se renderiza también dentro de este
 * subtree. Al estar en posición fija arriba-izquierda es siempre
 * visible cuando la Pokédex está activa.
 */
export function PokedexOverlay() {
  return (
    <Suspense fallback={null}>
      <FiltersProvider>
        <PokedexPageProvider>
          <PokedexHomeButton />
          <PokedexShell />
        </PokedexPageProvider>
      </FiltersProvider>
    </Suspense>
  );
}
