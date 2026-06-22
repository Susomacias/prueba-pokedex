import type { Metadata } from "next";
import { PokedexPageProvider } from "@/src/components/pokedex/PokedexPageProvider";
import { PokedexShell } from "@/src/components/pokedex/PokedexShell";
import { PokedexShellClient } from "@/src/components/pokedex/PokedexShellClient";

/**
 * Plan 05.3 + 05.4 + 04.3 — Página `/pokedex`.
 *
 * Esta página es un Server Component que monta el `PokedexPageProvider`,
 * el `PokedexShell` y (Plan 04.3) el `PokedexShellClient` que
 * envuelve todo con el `PokedexTransitionOut` y añade el botón
 * "Volver al inicio".
 *
 * El provider es el único punto que conoce el estado real de la
 * Pokédex (pokemon seleccionado, modo 3D, filtros activos, etc.)
 * y lo expone al shell vía Context. De este modo, el Server
 * Component NO cruza la frontera con callbacks/funciones (limitación
 * de Next 16 / RSC).
 *
 * El shell garantiza:
 *   - Render sin scroll (`100dvh × 100vw`, `overflow-hidden`).
 *   - Selección responsive vertical/horizontal según viewport
 *     (`useViewportLayout`).
 *   - Cada `<g data-slot>` queda listo para inyectar el contenido
 *     correspondiente (stubs en esta fase).
 */
export const metadata: Metadata = {
  title: "Pokédex",
  description:
    "Explora la Pokédex completa: busca por nombre, tipo, generación, hábitat, habilidad, color, altura o peso.",
  alternates: { canonical: "/pokedex" },
};

export default function PokedexPage() {
  return (
    <main
      className="pokedex-page"
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        maxWidth: "100vw",
        maxHeight: "100dvh",
        overflow: "hidden",
      }}
    >
      <h1 className="sr-only">Pokédex</h1>
      <PokedexPageProvider>
        <PokedexShellClient>
          <PokedexShell />
        </PokedexShellClient>
      </PokedexPageProvider>
    </main>
  );
}
