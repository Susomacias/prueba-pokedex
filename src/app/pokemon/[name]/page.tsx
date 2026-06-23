import type { Metadata } from "next";
import { capitalize } from "@/src/lib/utils/capitalize";
import { PokedexPageTransition } from "@/src/components/app/PokedexPageTransition";
import { HomeViewContent } from "@/src/components/home/HomeViewContent";

type RouteParams = { name: string };

/**
 * Página de detalle de un pokemon (Plan 02.1 + Plan 08).
 *
 * URL: `/pokemon/[name]`.
 *
 * El segmento es `[name]` (no `[id]`) para que las URLs sean
 * amigables y compartibles: `/pokemon/pikachu` en lugar de
 * `/pokemon/25`. El render real del detalle (chips, evoluciones,
 * stats, etc.) lo gestiona la Pokédex pre-renderizada del shell
 * cuando lee `selectedName` desde el pathname.
 *
 * Esta Server Component:
 *
 *   - Genera metadata dinámica (título, descripción, canonical) con
 *     `generateMetadata`.
 *   - Declara `generateStaticParams` vacío porque la lista completa
 *     de pokemons es enorme (>1000). La página se renderiza bajo
 *     demanda. Esto se completará en planes futuros cuando la API
 *     cacheada (Plan 01) esté lista para devolver todos los nombres.
 *
 * Comportamiento de entrada: idéntico a `/pokedex`. El shell fija
 * `view="home"` en el primer paint y dispara la transición a la
 * Pokédex, que mostrará el detalle del pokemon `name`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { name } = await params;
  const friendly = capitalize(name);

  return {
    title: friendly,
    description: `Ficha de ${friendly}: tipos, estadísticas, evoluciones y más.`,
    alternates: { canonical: `/pokemon/${name}` },
  };
}

export function generateStaticParams(): Array<RouteParams> {
  return [];
}

export default async function PokemonDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  await params;

  return (
    <PokedexPageTransition>
      <HomeViewContent />
    </PokedexPageTransition>
  );
}