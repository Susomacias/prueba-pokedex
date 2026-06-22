/**
 * Tipos TypeScript base alineados con la PokeAPI.
 *
 * Las listas canónicas (`as const`) son la única fuente de verdad para los
 * identificadores usados en toda la app; los mapas de constantes se tipan a
 * partir de ellas.
 */

/** Conjunto de tres colores (background, borde, texto) para una entidad. */
export interface ColorSet {
  bg: string;
  border: string;
  text: string;
}

/**
 * Los 18 tipos de Pokémon canónicos de la PokeAPI
 * (excluye `stellar`, `shadow` y `unknown`).
 * @see doc/pokeapi/data/v2/csv/types.csv
 */
export const POKEMON_TYPES = [
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
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

/**
 * Identificadores de generación usados por la PokeAPI (generation-i … ix).
 * @see doc/pokeapi/data/v2/csv/generations.csv
 */
export const GENERATIONS = [
  "generation-i",
  "generation-ii",
  "generation-iii",
  "generation-iv",
  "generation-v",
  "generation-vi",
  "generation-vii",
  "generation-viii",
  "generation-ix",
] as const;

export type Generation = (typeof GENERATIONS)[number];

/**
 * Hábitats soportados por la Pokédex (claves internas en español).
 * Cada uno mapea a una imagen `.webp` en `/public/habitats`.
 */
export const HABITATS = [
  "caverna",
  "bosque",
  "pradera",
  "campo",
  "montana",
  "agua_dulce",
  "agua_salada",
  "ciudad",
  "raro",
  "generico",
] as const;

export type Habitat = (typeof HABITATS)[number];

/** Tamaño de página por defecto para la lista de pokemons. */
export const POKEMON_LIST_PAGE_SIZE = 30;

/**
 * Forma normalizada de un item de la lista devuelto por
 * `fetchPokemonList` (Plan 01.2).
 */
export interface PokemonListItem {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  spriteFront: string | null;
  types: ReadonlyArray<PokemonTypeRef>;
  habitat: Habitat | null;
  generation: Generation | null;
}

/** Par `slot` + tipo en la lista. */
export interface PokemonTypeRef {
  slot: number;
  name: PokemonType;
}

/** Forma cruda de `sprites` devuelta por la PokeAPI. */
export interface PokemonSpritesJson {
  front_default?: string | null;
  front_shiny?: string | null;
  front_female?: string | null;
  front_shiny_female?: string | null;
  back_default?: string | null;
  back_shiny?: string | null;
  back_female?: string | null;
  back_shiny_female?: string | null;
  other?: unknown;
  versions?: unknown;
  [key: string]: unknown;
}

/** Stat base con su nombre canónico. */
export interface PokemonStat {
  name: string;
  baseStat: number;
}

/** Habilidad del pokemon (slot + flag oculto). */
export interface PokemonAbility {
  name: string;
  isHidden: boolean;
  slot: number;
}

/** Sprite de la PokeAPI (subset de `PokemonSpritesJson`). */
export interface PokemonSprites {
  frontDefault: string | null;
  frontShiny: string | null;
  backDefault: string | null;
  backShiny: string | null;
  /** `other.official-artwork.front_default` (artwork oficial grande). */
  officialArtwork: string | null;
  /** `other.home.front_default` (sprite Home 3D). */
  homeFront: string | null;
  /** `other.home.front_shiny`. */
  homeShiny: string | null;
  /** `other.official-artwork.front_shiny`. */
  officialArtworkShiny: string | null;
}

/** Nodo dentro de la cadena evolutiva. */
export interface EvolutionNode {
  id: number;
  name: string;
  evolvesFromSpeciesId: number | null;
}

/** Forma normalizada del detalle de un pokemon. */
export interface PokemonDetail {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  baseExperience: number | null;
  isLegendary: boolean;
  isMythical: boolean;
  captureRate: number | null;
  baseHappiness: number | null;
  generation: Generation | null;
  habitat: Habitat | null;
  types: ReadonlyArray<PokemonTypeRef>;
  stats: ReadonlyArray<PokemonStat>;
  abilities: ReadonlyArray<PokemonAbility>;
  sprites: PokemonSprites;
  /** URL del último `cry` (sonido). `null` si no hay. */
  cryLatestUrl: string | null;
  flavorText: string | null;
  flavorTextVersion: string | null;
  /** Cadena evolutiva como árbol plano ordenado por nivel. */
  evolutionChain: ReadonlyArray<EvolutionNode>;
}

/* ----------------------------------------------------------------------------
 * Filtros — Plan 01.4 / 01.5
 * --------------------------------------------------------------------------*/

/** Opción simple para selects/chips de filtro. */
export interface FilterOption {
  /** Identificador estable (clave canónica, ej. `fire`, `caverna`). */
  readonly value: string;
  /** Etiqueta legible para mostrar en la UI (en español cuando aplica). */
  readonly label: string;
  /** Imagen opcional (`.webp` en `/public/habitats` para hábitats). */
  readonly image?: string;
}

/** Bucket de un rango numérico (altura/peso). */
export interface FilterBucket {
  readonly value: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
}

/**
 * Conjunto de los 7 filtros que el plan 01 expone en el panel de
 * filtros (Tipo 1/Tipo 2 comparten la lista de tipos; Altura y Peso
 * son buckets numéricos).
 */
export interface FilterOptionMap {
  readonly type1: ReadonlyArray<FilterOption>;
  readonly type2: ReadonlyArray<FilterOption>;
  readonly generation: ReadonlyArray<FilterOption>;
  readonly color: ReadonlyArray<FilterOption>;
  readonly habitat: ReadonlyArray<FilterOption>;
  readonly ability: ReadonlyArray<FilterOption>;
  readonly height: ReadonlyArray<FilterBucket>;
  readonly weight: ReadonlyArray<FilterBucket>;
}

/**
 * Filtros activos que puede aplicar la UI sobre la lista de pokemons.
 * Cada campo es opcional; los filtros se combinan con AND.
 */
export interface PokemonFilters {
  readonly type1?: PokemonType;
  readonly type2?: PokemonType;
  readonly generation?: Generation;
  readonly color?: string;
  readonly habitat?: Habitat;
  readonly ability?: string;
  readonly height?: FilterBucket;
  readonly weight?: FilterBucket;
}
