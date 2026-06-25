/**
 * Capa pública cacheada de la PokeAPI (Plan 01.6).
 *
 * Esta capa envuelve las funciones crudas de `fetchList.ts`,
 * `fetchDetail.ts` y `fetchFilterOptions.ts` con:
 *
 *  1. **Dedupe en un mismo render**: `React.cache` memoiza la
 *     promesa devuelta por cada función, de modo que dos llamadas
 *     idénticas dentro de un mismo render solo hacen UN fetch real.
 *  2. **Caché de servidor**: las funciones crudas (`fetchPokemonList`,
 *     `fetchPokemonDetail`, `fetchFilterOptions`, etc.) ya pasan la
 *     `next` option adecuada (`revalidate` + `tags`) al `request`
 *     subyacente, aprovechando el Data Cache de Next.js 16. Esta
 *     capa se apoya en esa estrategia, definida en
 *     `cacheStrategy.ts`.
 *
 * Además expone `preloadPokemonDetails(names, max)` para iniciar la
 * carga en background de los primeros N detalles (cota: 3 según el
 * plan).
 *
 * @see ./cacheStrategy.ts
 * @see ../graphql/client.ts
 */

import { cache } from "react";
import {
  fetchAbilityOptions as rawFetchAbilityOptions,
  fetchColorOptions as rawFetchColorOptions,
  fetchFilterOptions as rawFetchFilterOptions,
  fetchGenerationOptions as rawFetchGenerationOptions,
  fetchHabitatOptions as rawFetchHabitatOptions,
  fetchHeightBuckets as rawFetchHeightBuckets,
  fetchTypeOptions as rawFetchTypeOptions,
  fetchWeightBuckets as rawFetchWeightBuckets,
} from "@/src/lib/pokemon/fetchFilterOptions";
import {
  fetchAllPokemonFilterFields as rawFetchAllPokemonFilterFields,
} from "@/src/lib/pokemon/fetchFilterAvailability";
import {
  fetchPokemonDetail as rawFetchPokemonDetail,
} from "@/src/lib/pokemon/fetchDetail";
import {
  createPokemonListPager,
  fetchNextPage as rawFetchNextPage,
  fetchPokemonList as rawFetchPokemonList,
  type FetchPokemonListArgs,
  type PokemonListPage,
  type PokemonListPager,
} from "@/src/lib/pokemon/fetchList";
import {
  applyFiltersToList as rawApplyFiltersToList,
  type FilteredPokemonListPage,
  type SearchOptions,
} from "@/src/lib/pokemon/fetchListFiltered";
import type {
  FilterOption,
  FilterOptionMap,
  PokemonDetail,
  PokemonFilters,
} from "@/src/lib/types/pokemon";
import { MAX_CONCURRENT_PREFETCHES } from "@/src/lib/pokemon/cacheStrategy";

/* -------------------------------------------------------------------------- *
 * Lista sin filtros
 * -------------------------------------------------------------------------- */

const cachedFetchPokemonList = cache(
  async (args: FetchPokemonListArgs): Promise<PokemonListPage> =>
    rawFetchPokemonList(args),
);

/** Lista paginada con dedupe intra-render (caché de servidor ya en `rawFetchPokemonList`). */
export function fetchPokemonList(
  args: FetchPokemonListArgs,
): Promise<PokemonListPage> {
  return cachedFetchPokemonList(args);
}

/** Preload de la siguiente página. Fire-and-forget. */
export function preloadPokemonList(args: FetchPokemonListArgs): void {
  void cachedFetchPokemonList(args);
}

/* -------------------------------------------------------------------------- *
 * Lista filtrable
 * -------------------------------------------------------------------------- */

const cachedApplyFiltersToList = cache(
  async (
    filters: PokemonFilters,
    offset: number,
    options?: SearchOptions,
  ): Promise<FilteredPokemonListPage> =>
    rawApplyFiltersToList(filters, offset, options),
);

/** Lista filtrable con dedupe intra-render. */
export function applyFiltersToList(
  filters: PokemonFilters,
  offset: number,
  options?: SearchOptions,
): Promise<FilteredPokemonListPage> {
  return cachedApplyFiltersToList(filters, offset, options);
}

/** Preload de una página filtrable. */
export function preloadFilteredList(
  filters: PokemonFilters,
  offset: number,
  options?: SearchOptions,
): void {
  void cachedApplyFiltersToList(filters, offset, options);
}

/* -------------------------------------------------------------------------- *
 * Detalle
 * -------------------------------------------------------------------------- */

const cachedFetchPokemonDetail = cache(
  async (name: string): Promise<PokemonDetail> => rawFetchPokemonDetail(name),
);

/** Detalle de un pokemon con dedupe intra-render. */
export function fetchPokemonDetail(name: string): Promise<PokemonDetail> {
  return cachedFetchPokemonDetail(name);
}

/* -------------------------------------------------------------------------- *
 * Opciones de filtros
 * -------------------------------------------------------------------------- */

const cachedFetchFilterOptions = cache(
  async (): Promise<FilterOptionMap> => rawFetchFilterOptions(),
);

const cachedFetchTypeOptions = cache(
  async (): Promise<ReadonlyArray<FilterOption>> => rawFetchTypeOptions(),
);

const cachedFetchGenerationOptions = cache(
  async (): Promise<ReadonlyArray<FilterOption>> => rawFetchGenerationOptions(),
);

const cachedFetchColorOptions = cache(
  async (): Promise<ReadonlyArray<FilterOption>> => rawFetchColorOptions(),
);

const cachedFetchHabitatOptions = cache(
  async (): Promise<ReadonlyArray<FilterOption>> => rawFetchHabitatOptions(),
);

const cachedFetchAbilityOptions = cache(
  async (): Promise<ReadonlyArray<FilterOption>> => rawFetchAbilityOptions(),
);

export function fetchFilterOptions(): Promise<FilterOptionMap> {
  return cachedFetchFilterOptions();
}

export function fetchTypeOptions(): Promise<ReadonlyArray<FilterOption>> {
  return cachedFetchTypeOptions();
}

export function fetchGenerationOptions(): Promise<ReadonlyArray<FilterOption>> {
  return cachedFetchGenerationOptions();
}

export function fetchColorOptions(): Promise<ReadonlyArray<FilterOption>> {
  return cachedFetchColorOptions();
}

export function fetchHabitatOptions(): Promise<ReadonlyArray<FilterOption>> {
  return cachedFetchHabitatOptions();
}

export function fetchAbilityOptions(): Promise<ReadonlyArray<FilterOption>> {
  return cachedFetchAbilityOptions();
}

export const fetchHeightBuckets = rawFetchHeightBuckets;
export const fetchWeightBuckets = rawFetchWeightBuckets;

/* -------------------------------------------------------------------------- *
 * Disponibilidad de filtros (Plan cross-filter)
 * -------------------------------------------------------------------------- */

const cachedFetchAllPokemonFilterFields = cache(
  async (): Promise<
    ReadonlyArray<
      import("@/src/lib/pokemon/fetchFilterAvailability").PokemonFilterFields
    >
  > => rawFetchAllPokemonFilterFields(),
);

export function fetchAllPokemonFilterFields(): Promise<
  ReadonlyArray<
    import("@/src/lib/pokemon/fetchFilterAvailability").PokemonFilterFields
  >
> {
  return cachedFetchAllPokemonFilterFields();
}

/* -------------------------------------------------------------------------- *
 * Precarga de detalles (Plan 01.6)
 * -------------------------------------------------------------------------- */

/**
 * Precarga los detalles de los primeros N pokemons en paralelo.
 * Limita la concurrencia a `MAX_CONCURRENT_PREFETCHES` (3) para no
 * saturar la PokeAPI. Devuelve una promesa que resuelve cuando
 * todas las precargas han terminado (útil para tests y para
 * `await` desde Server Components).
 */
export function preloadPokemonDetails(
  names: ReadonlyArray<string>,
  max: number = MAX_CONCURRENT_PREFETCHES,
): Promise<ReadonlyArray<PokemonDetail>> {
  const slice = names.slice(0, max);
  return Promise.all(slice.map((name) => cachedFetchPokemonDetail(name)));
}

/**
 * Variante fire-and-forget para iniciar la precarga sin esperar. La
 * `Promise` queda flotando; ideal para llamar en el cuerpo de un
 * Server Component antes de awaitar el fetch principal.
 */
export function preloadPokemonDetailsFireAndForget(
  names: ReadonlyArray<string>,
  max: number = MAX_CONCURRENT_PREFETCHES,
): void {
  const slice = names.slice(0, max);
  for (const name of slice) {
    void cachedFetchPokemonDetail(name);
  }
}

/* -------------------------------------------------------------------------- *
 * Re-exports de utilidades del módulo base
 * -------------------------------------------------------------------------- */

export { createPokemonListPager, rawFetchNextPage as fetchNextPage };
export type { PokemonListPager };