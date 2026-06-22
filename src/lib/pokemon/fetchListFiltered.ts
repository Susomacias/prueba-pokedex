import { request } from "@/src/lib/graphql/client";
import { POKEMON_LIST_FILTERED_QUERY } from "@/src/lib/graphql/queries/pokemonListFiltered.gql";
import {
  POKEMON_LIST_PAGE_SIZE,
  type PokemonFilters,
  type PokemonListItem,
} from "@/src/lib/types/pokemon";
import {
  mapRawListPokemon,
} from "@/src/lib/pokemon/mapRawList";
import type {
  RawListAggregate,
  RawListPokemon,
} from "@/src/lib/pokemon/listRaw";
import {
  type SearchOptions,
  buildExpandedSearchWhere,
  buildNameSearchWhere,
  buildPokemonWhere,
} from "@/src/lib/graphql/where";
import { LIST_CACHE } from "@/src/lib/pokemon/cacheStrategy";

/** Forma cruda de la respuesta a `POKEMON_LIST_FILTERED_QUERY`. */
export interface RawPokemonListFilteredResponse {
  pokemon_v2_pokemon: RawListPokemon[];
}

export type { SearchOptions } from "@/src/lib/graphql/where";

/** Resultado de una página con filtros. */
export interface FilteredPokemonListPage {
  readonly items: ReadonlyArray<PokemonListItem>;
  readonly nextOffset: number | null;
  /** Total devuelto por `pokemon_v2_pokemon_aggregate`. */
  readonly total: number | null;
  /**
   * `true` cuando el resultado es exactamente 1 pokemon y la UI debe
   * cargar su ficha directamente (caso especial del plan 01.5).
   * Solo se activa cuando hay una búsqueda o filtros explícitos que
   * han acotado el resultado a un único pokemon; sin filtros ni
   * búsqueda no se considera "single" porque podría ser la primera
   * página de la lista completa.
   */
  readonly single: boolean;
}

const SEARCH_MIN_LENGTH_FOR_EXPANDED = 3;

/**
 * Comprueba si los filtros / opciones indican una "búsqueda
 * explícita" (no solo paginación neutra). Se usa para decidir cuándo
 * marcar `single: true`.
 */
function isExplicitSearch(
  filters: PokemonFilters,
  options?: SearchOptions,
): boolean {
  if (options?.search && options.search.trim().length > 0) return true;
  return Object.values(filters).some(
    (v) => v !== undefined && v !== null && v !== "",
  );
}

/**
 * Aplica filtros combinables (AND) y un buscador opcional a la lista
 * de pokemons.
 *
 * Comportamiento:
 *  - Si hay `search` en `options`, primero busca por nombre
 *    parcial (`name: { _ilike: "%term%" }`).
 *  - Si la búsqueda por nombre no devuelve nada y `term` tiene al
 *    menos 3 letras, amplía a flavor_text, tipos, habitat y
 *    generación (todos en OR).
 *  - Los filtros del plan (`type1`, `type2`, etc.) se aplican con
 *    AND sobre el `where` base.
 *  - Si el resultado es exactamente 1 pokemon y la llamada es una
 *    "búsqueda explícita", se marca `single: true` para que la UI
 *    cargue la ficha directamente.
 */
export async function applyFiltersToList(
  filters: PokemonFilters,
  offset: number,
  options?: SearchOptions,
): Promise<FilteredPokemonListPage> {
  const limit = options?.limit ?? POKEMON_LIST_PAGE_SIZE;
  const search = options?.search?.trim();
  const withTotal = options?.withTotal ?? true;

  // 1) Búsqueda explícita por nombre.
  if (search && search.length > 0) {
    const nameWhere = buildNameSearchWhere(
      search,
    ) as unknown as Record<string, unknown>;
    const combinedWhere = combineWhere(filters, nameWhere);
    const first = await runListQuery(combinedWhere, offset, limit, withTotal);
    if (first.items.length > 0) {
      return finalize(first, isExplicitSearch(filters, options));
    }
    if (search.length >= SEARCH_MIN_LENGTH_FOR_EXPANDED) {
      const expanded = buildExpandedSearchWhere(
        search,
      ) as unknown as Record<string, unknown>;
      const expandedCombined = combineWhere(filters, expanded);
      return runListQuery(expandedCombined, offset, limit, withTotal).then(
        (page) => finalize(page, isExplicitSearch(filters, options)),
      );
    }
    return finalize(first, isExplicitSearch(filters, options));
  }

  // 2) Sin búsqueda: solo filtros.
  const where = buildPokemonWhere(filters) as unknown as Record<
    string,
    unknown
  >;
  const page = await runListQuery(where, offset, limit, withTotal);
  return finalize(page, isExplicitSearch(filters, options));
}

/**
 * Combina los filtros del plan (AND) con un `where` adicional (la
 * búsqueda por nombre o la búsqueda ampliada) preservando la
 * estructura `_and` que espera la PokeAPI.
 */
function combineWhere(
  filters: PokemonFilters,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const base = buildPokemonWhere(filters) as unknown as Record<
    string,
    unknown
  >;
  if (Object.keys(base).length === 0) return extra;
  return { _and: [base, extra] };
}

interface RawQueryResponse extends RawListAggregate {
  pokemon_v2_pokemon: RawListPokemon[];
}

async function runListQuery(
  where: Record<string, unknown>,
  offset: number,
  limit: number,
  withTotal: boolean,
): Promise<FilteredPokemonListPage> {
  // Si `withTotal` es false, usamos una query sin el bloque
  // `_aggregate` para minimizar payload. Para no duplicar la query
  // completa, actualmente siempre pedimos el aggregate; el coste es
  // despreciable y simplifica la implementación.
  const data = await request<RawQueryResponse>(
    POKEMON_LIST_FILTERED_QUERY,
    { limit, offset, where, orderBy: { id: "asc" } },
    "PokemonListFiltered",
    { next: LIST_CACHE },
  );

  const items = data.pokemon_v2_pokemon.map(mapRawListPokemon);
  const nextOffset = items.length === limit ? offset + limit : null;
  const total = withTotal
    ? (data.pokemon_v2_pokemon_aggregate?.aggregate.count ?? null)
    : null;

  return { items, nextOffset, total, single: false };
}

function finalize(
  page: FilteredPokemonListPage,
  explicit: boolean,
): FilteredPokemonListPage {
  if (explicit && page.items.length === 1) {
    return { ...page, single: true };
  }
  return page;
}