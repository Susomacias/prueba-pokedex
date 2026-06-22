import {
  type Generation,
  type Habitat,
  type PokemonListItem,
  type PokemonSpritesJson,
  type PokemonType,
  type PokemonTypeRef,
} from "@/src/lib/types/pokemon";
import type { RawListPokemon } from "@/src/lib/pokemon/listRaw";

/**
 * Mapeo de habitats inglés → clave interna en español. Se centraliza
 * aquí (y se reexporta desde `where.ts`) para que toda la capa de
 * datos comparta el mismo diccionario.
 *
 * @see doc/pokeapi/data/v2/csv/pokemon_habitats.csv
 */
export const HABITAT_ALIAS: Record<string, Habitat> = {
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

export function asHabitat(name: string | null | undefined): Habitat | null {
  if (!name) return null;
  return HABITAT_ALIAS[name] ?? "generico";
}

const GENERATIONS: ReadonlyArray<Generation> = [
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

export function asGeneration(
  name: string | null | undefined,
): Generation | null {
  if (!name) return null;
  return (GENERATIONS as ReadonlyArray<string>).includes(name)
    ? (name as Generation)
    : null;
}

const POKEMON_TYPES: ReadonlyArray<PokemonType> = [
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

export function asType(name: string): PokemonType | null {
  return (POKEMON_TYPES as ReadonlyArray<string>).includes(name)
    ? (name as PokemonType)
    : null;
}

function extractFrontDefault(sprites: unknown): string | null {
  if (!sprites || typeof sprites !== "object") return null;
  const obj = sprites as PokemonSpritesJson;
  return typeof obj.front_default === "string" ? obj.front_default : null;
}

/**
 * Normaliza un item crudo de la query de lista a la forma
 * `PokemonListItem` que consume la UI. Tolerante a campos opcionales
 * (color, flavor_text, abilities) que solo trae la variante
 * filtrable.
 */
export function mapRawListPokemon(raw: RawListPokemon): PokemonListItem {
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