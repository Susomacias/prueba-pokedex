import type { Metadata } from "next";
import { PokedexPageTransition } from "@/src/components/app/PokedexPageTransition";
import { HomeViewContent } from "@/src/components/home/HomeViewContent";
import { buildSearchString } from "@/src/lib/utils/search-params";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Página `/pokedex` (Plan 02.1).
 *
 * Es la Pokédex sin pokemon seleccionado: lista + filtros +
 * buscador + consola. Su URL canónica es `/pokedex`.
 *
 * Comportamiento de entrada (Plan 04.2 aplicado al routing):
 *
 *   1. El Server Component renderiza la home (logo, Ash, slider,
 *      pokédex cerrada, botón PRESS START) DENTRO del shell.
 *   2. `PokedexPageTransition` fija `view="home"` en el primer
 *      paint, aunque la URL sea `/pokedex`.
 *   3. Inmediatamente después del mount se llama a `goToPokedex()`.
 *      Como el pathname ya es `/pokedex`, `AppShellProvider`
 *      recalcula `view="pokedex"` y la Pokédex sube desde abajo con
 *      la misma animación que si el usuario hubiera partido de `/`.
 *
 * Esto significa que `/pokedex` y `/` comparten exactamente el
 * mismo árbol visual: la diferencia entre ambas URLs es sólo qué
 * vista está activa al terminar la transición. Los filtros aplicados
 * se mantienen como `searchParams` y se sincronizan vía `useFilters`.
 */
export const metadata: Metadata = {
  title: "Pokédex",
  description:
    "Explora la Pokédex: lista de Pokémon con filtros por tipo, generación, hábitat y más.",
  alternates: { canonical: "/pokedex" },
};

export default async function PokedexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const initialSearch = await buildSearchString(searchParams);
  return (
    <PokedexPageTransition initialPathname="/pokedex" initialSearch={initialSearch}>
      <HomeViewContent />
    </PokedexPageTransition>
  );
}