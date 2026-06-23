import { request } from "@/src/lib/graphql/client";
import { POKEMON_LIST_QUERY } from "@/src/lib/graphql/queries/pokemonList.gql";
import {
  POKEMON_LIST_PAGE_SIZE,
  type PokemonListItem,
} from "@/src/lib/types/pokemon";
import { mapRawListPokemon } from "@/src/lib/pokemon/mapRawList";
import { LIST_CACHE } from "@/src/lib/pokemon/cacheStrategy";

export interface RawPokemonListResponse {
  pokemon_v2_pokemon: Parameters<typeof mapRawListPokemon>[0][];
}

/** Argumentos de `fetchPokemonList`. */
export interface FetchPokemonListArgs {
  readonly offset: number;
  readonly limit?: number;
}

/** Resultado de una página. */
export interface PokemonListPage {
  readonly items: ReadonlyArray<PokemonListItem>;
  readonly nextOffset: number | null;
  /** Total aproximado; `null` mientras no se pida agregación. */
  readonly total: number | null;
}

/**
 * Recupera una página de la lista de pokemons.
 *
 * Por defecto pide 30 items ordenados por `id asc` filtrando por
 * `is_default = true`. Devuelve los items normalizados y el offset de
 * la siguiente página, o `null` cuando ya no quedan más.
 */
export async function fetchPokemonList(
  args: FetchPokemonListArgs,
): Promise<PokemonListPage> {
  const limit = args.limit ?? POKEMON_LIST_PAGE_SIZE;
  const offset = args.offset;

  const data = await request<RawPokemonListResponse>(
    POKEMON_LIST_QUERY,
    { limit, offset, where: undefined, orderBy: { id: "asc" } },
    "PokemonList",
    { next: LIST_CACHE },
  );

  const items = data.pokemon_v2_pokemon.map(mapRawListPokemon);
  const nextOffset = items.length === limit ? offset + limit : null;

  return { items, nextOffset, total: null };
}

/** Pager con estado mutable para acumular páginas. */
export interface PokemonListPager {
  readonly pageSize: number;
  items: PokemonListItem[];
  offset: number;
  hasMore: boolean;
}

/**
 * Crea un pager con estado propio que mantiene `offset` y `hasMore`.
 * Se actualiza con `await fetchNextPage(pager)`.
 */
export function createPokemonListPager(opts: {
  readonly pageSize?: number;
} = {}): PokemonListPager {
  return {
    pageSize: opts.pageSize ?? POKEMON_LIST_PAGE_SIZE,
    items: [],
    offset: 0,
    hasMore: true,
  };
}

/**
 * Carga la siguiente página en el pager. Acumula items y avanza el
 * offset. Devuelve la página recién cargada para inspección.
 *
 * Cuando `pager.hasMore` es `false`, la función no hace fetch y
 * devuelve `{ items: [], nextOffset: null }`.
 */
export async function fetchNextPage(
  pager: PokemonListPager,
): Promise<PokemonListPage> {
  if (!pager.hasMore) {
    return { items: [], nextOffset: null, total: null };
  }
  const page = await fetchPokemonList({
    offset: pager.offset,
    limit: pager.pageSize,
  });
  pager.items.push(...page.items);
  pager.offset = page.nextOffset ?? pager.offset;
  pager.hasMore = page.nextOffset !== null;
  return page;
}
