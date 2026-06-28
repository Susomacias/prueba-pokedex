import {
  GENERATIONS,
  POKEMON_TYPES,
  type Generation,
  type PokemonListItem,
  type PokemonSpritesJson,
  type PokemonType,
  type PokemonTypeRef,
} from "@/src/lib/types/pokemon";
import { HABITAT_ALIAS, asHabitat } from "@/src/lib/constants/habitats";
import type { RawListPokemon } from "@/src/lib/pokemon/listRaw";

export { HABITAT_ALIAS, asHabitat };

export function asGeneration(
  name: string | null | undefined,
): Generation | null {
  if (!name) return null;
  return (GENERATIONS as ReadonlyArray<string>).includes(name)
    ? (name as Generation)
    : null;
}

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
 *
 * Endpoint v1beta: naming CON prefijo `pokemon_v2_`.
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
    raw.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonhabitat?.name,
  );
  const generation = asGeneration(
    raw.pokemon_v2_pokemonspecy?.pokemon_v2_generation?.name,
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