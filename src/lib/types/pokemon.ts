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
