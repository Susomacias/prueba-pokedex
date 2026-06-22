import { request } from "@/src/lib/graphql/client";
import { POKEMON_LIST_QUERY } from "@/src/lib/graphql/queries/pokemonList.gql";
import {
  POKEMON_LIST_PAGE_SIZE,
  type Generation,
  type Habitat,
  type PokemonListItem,
  type PokemonSpritesJson,
  type PokemonType,
  type PokemonTypeRef,
} from "@/src/lib/types/pokemon";

/**
 * Mapea un identificador de hábitat en inglés de la PokeAPI a la clave
 * interna en español usada por la UI.
 *
 * Los identificadores vienen de `pokemon_v2_pokemonhabitat.name` (en
 * inglés) y los centralizamos aquí para no filtrar cadenas en inglés
 * a la UI.
 *
 * @see doc/pokeapi/data/v2/csv/pokemon_habitats.csv
 */
const HABITAT_ALIAS: Record<string, Habitat> = {
  cave: "caverna",
  forest: "bosque",
  grassland: "pradera",
  mountain: "montana",
  "rough-terrain": "montana",
  field: "campo",
  freshwater: "agua_dulce",
  "waters-edge": "agua_dulce",
  sea: "agua_salada",
  urban: "ciudad",
  rare: "raro",
};

function asHabitat(name: string | null | undefined): Habitat | null {
  if (!name) return null;
  return HABITAT_ALIAS[name] ?? "generico";
}

function asGeneration(name: string | null | undefined): Generation | null {
  if (!name) return null;
  const valid: ReadonlyArray<Generation> = [
    "generation-i",
    "generation-ii",
    "generation-iii",
    "generation-iv",
    "generation-v",
    "generation-vi",
    "generation-vii",
    "generation-viii",
    "generation-ix",
  ];
  return (valid as ReadonlyArray<string>).includes(name)
    ? (name as Generation)
    : null;
}

function asType(name: string): PokemonType | null {
  const valid: ReadonlyArray<PokemonType> = [
    "normal",
    "fighting",
    "flying",
    "poison",
    "ground",
    "rock",
    "bug",
    "ghost",
    "steel",
    "fire",
    "water",
    "grass",
    "electric",
    "psychic",
    "ice",
    "dragon",
    "dark",
    "fairy",
  ];
  return (valid as ReadonlyArray<string>).includes(name)
    ? (name as PokemonType)
    : null;
}

function extractFrontDefault(sprites: unknown): string | null {
  if (!sprites || typeof sprites !== "object") return null;
  const obj = sprites as PokemonSpritesJson;
  return typeof obj.front_default === "string" ? obj.front_default : null;
}

export interface RawPokemonListResponse {
  pokemon_v2_pokemon: Array<{
    id: number;
    name: string;
    height: number | null;
    weight: number | null;
    pokemon_v2_pokemonsprites: Array<{ sprites: unknown }>;
    pokemon_v2_pokemontypes: Array<{
      slot: number;
      pokemon_v2_type: { name: string };
    }>;
    pokemon_v2_pokemonspecies: {
      pokemon_v2_pokemonhabitat: { name: string } | null;
      pokemon_v2_generation: { name: string } | null;
    } | null;
  }>;
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

function mapRawPokemon(raw: RawPokemonListResponse["pokemon_v2_pokemon"][number]): PokemonListItem {
  const spriteRecord = raw.pokemon_v2_pokemonsprites[0];
  const types: PokemonTypeRef[] = [];
  for (const t of raw.pokemon_v2_pokemontypes) {
    const name = asType(t.pokemon_v2_type.name);
    if (name) types.push({ slot: t.slot, name });
  }
  types.sort((a, b) => a.slot - b.slot);

  const habitat = asHabitat(
    raw.pokemon_v2_pokemonspecies?.pokemon_v2_pokemonhabitat?.name,
  );
  const generation = asGeneration(
    raw.pokemon_v2_pokemonspecies?.pokemon_v2_generation?.name,
  );

  return {
    id: raw.id,
    name: raw.name,
    height: raw.height,
    weight: raw.weight,
    spriteFront: extractFrontDefault(spriteRecord?.sprites),
    types,
    habitat,
    generation,
  };
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
  );

  const items = data.pokemon_v2_pokemon.map(mapRawPokemon);
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
