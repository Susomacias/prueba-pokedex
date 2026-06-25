import type {
  FilterBucket,
  PokemonFilters,
} from "@/src/lib/types/pokemon";
import { request } from "@/src/lib/graphql/client";
import { ALL_POKEMON_FILTER_FIELDS_QUERY } from "@/src/lib/graphql/queries/filterOptions.gql";
import { FILTER_CACHE } from "@/src/lib/pokemon/cacheStrategy";
import { HABITAT_REVERSE_ALIAS } from "@/src/lib/graphql/where";

export interface PokemonFilterFields {
  height: number | null;
  weight: number | null;
  types: Array<{ name: string; slot: number }>;
  generation: string | null;
  color: string | null;
  habitat: string | null;
  abilities: string[];
}

interface RawPokemon {
  height: number | null;
  weight: number | null;
  pokemon_v2_pokemontypes: Array<{
    pokemon_v2_type: { name: string };
    slot: number;
  }>;
  pokemon_v2_pokemonspecy: {
    pokemon_v2_generation: { name: string } | null;
    pokemon_v2_pokemoncolor: { name: string } | null;
    pokemon_v2_pokemonhabitat: { name: string } | null;
  } | null;
  pokemon_v2_pokemonabilities: Array<{
    pokemon_v2_ability: { name: string };
  }>;
}

interface RawResponse {
  pokemon_v2_pokemon: RawPokemon[];
}

function mapRawPokemon(raw: RawPokemon): PokemonFilterFields {
  return {
    height: raw.height,
    weight: raw.weight,
    types: raw.pokemon_v2_pokemontypes.map((t) => ({
      name: t.pokemon_v2_type.name,
      slot: t.slot,
    })),
    generation: raw.pokemon_v2_pokemonspecy?.pokemon_v2_generation?.name ?? null,
    color: raw.pokemon_v2_pokemonspecy?.pokemon_v2_pokemoncolor?.name ?? null,
    habitat: raw.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonhabitat?.name ?? null,
    abilities: raw.pokemon_v2_pokemonabilities.map(
      (a) => a.pokemon_v2_ability.name,
    ),
  };
}

/** Fetches all pokemon filter-relevant fields. Cached for 7 days. */
export async function fetchAllPokemonFilterFields(): Promise<
  ReadonlyArray<PokemonFilterFields>
> {
  const data = await request<RawResponse>(
    ALL_POKEMON_FILTER_FIELDS_QUERY,
    undefined,
    "AllPokemonFilterFields",
    { next: FILTER_CACHE },
  );
  return data.pokemon_v2_pokemon.map(mapRawPokemon);
}

/* -------------------------------------------------------------------------- *
 * Cliente: cálculo de valores disponibles dado un conjunto de filtros
 * -------------------------------------------------------------------------- */

export interface AvailableFilterValues {
  type1: Set<string>;
  type2: Set<string>;
  generation: Set<string>;
  color: Set<string>;
  habitat: Set<string>;
  ability: Set<string>;
  heightRange: [number, number];
  weightRange: [number, number];
}

function emptyAvailability(): AvailableFilterValues {
  return {
    type1: new Set(),
    type2: new Set(),
    generation: new Set(),
    color: new Set(),
    habitat: new Set(),
    ability: new Set(),
    heightRange: [Infinity, -Infinity],
    weightRange: [Infinity, -Infinity],
  };
}

function matchesFilters(
  p: PokemonFilterFields,
  filters: PokemonFilters,
): boolean {
  if (filters.type1) {
    const has = p.types.some((t) => t.name === filters.type1);
    if (!has) return false;
  }
  if (filters.type2) {
    const has = p.types.some(
      (t) => t.name === filters.type2 && t.slot === 2,
    );
    if (!has) return false;
  }
  if (filters.generation && p.generation !== filters.generation) {
    return false;
  }
  if (filters.color && p.color !== filters.color) {
    return false;
  }
  if (filters.habitat) {
    const eng = HABITAT_REVERSE_ALIAS[filters.habitat];
    if (!eng || p.habitat !== eng) return false;
  }
  if (filters.ability && !p.abilities.includes(filters.ability)) {
    return false;
  }
  if (filters.height) {
    const h = p.height;
    if (h === null) return false;
    if (filters.height.min > -Infinity && h < filters.height.min) return false;
    if (filters.height.max < Infinity && h > filters.height.max) return false;
  }
  if (filters.weight) {
    const w = p.weight;
    if (w === null) return false;
    if (filters.weight.min > -Infinity && w < filters.weight.min) return false;
    if (filters.weight.max < Infinity && w > filters.weight.max) return false;
  }
  return true;
}

export function computeAvailableFilterValues(
  allPokemons: ReadonlyArray<PokemonFilterFields>,
  currentFilters: PokemonFilters,
): AvailableFilterValues {
  const result = emptyAvailability();

  for (const p of allPokemons) {
    // type1: exclude type1 from filters
    const fWithoutType1 = { ...currentFilters };
    delete fWithoutType1.type1;
    if (matchesFilters(p, fWithoutType1)) {
      for (const t of p.types) {
        result.type1.add(t.name);
      }
    }

    // type2: exclude type2 from filters
    const fWithoutType2 = { ...currentFilters };
    delete fWithoutType2.type2;
    if (matchesFilters(p, fWithoutType2)) {
      for (const t of p.types) {
        if (t.slot === 2) result.type2.add(t.name);
      }
    }

    // generation: exclude generation from filters
    const fWithoutGen = { ...currentFilters };
    delete fWithoutGen.generation;
    if (matchesFilters(p, fWithoutGen) && p.generation) {
      result.generation.add(p.generation);
    }

    // color: exclude color from filters
    const fWithoutColor = { ...currentFilters };
    delete fWithoutColor.color;
    if (matchesFilters(p, fWithoutColor) && p.color) {
      result.color.add(p.color);
    }

    // habitat: exclude habitat from filters
    const fWithoutHabitat = { ...currentFilters };
    delete fWithoutHabitat.habitat;
    if (matchesFilters(p, fWithoutHabitat) && p.habitat) {
      result.habitat.add(p.habitat);
    }

    // ability: exclude ability from filters
    const fWithoutAbility = { ...currentFilters };
    delete fWithoutAbility.ability;
    if (matchesFilters(p, fWithoutAbility)) {
      for (const a of p.abilities) {
        result.ability.add(a);
      }
    }

    // height: exclude height from filters
    const fWithoutHeight = { ...currentFilters };
    delete fWithoutHeight.height;
    if (matchesFilters(p, fWithoutHeight) && p.height !== null) {
      result.heightRange[0] = Math.min(result.heightRange[0], p.height);
      result.heightRange[1] = Math.max(result.heightRange[1], p.height);
    }

    // weight: exclude weight from filters
    const fWithoutWeight = { ...currentFilters };
    delete fWithoutWeight.weight;
    if (matchesFilters(p, fWithoutWeight) && p.weight !== null) {
      result.weightRange[0] = Math.min(result.weightRange[0], p.weight);
      result.weightRange[1] = Math.max(result.weightRange[1], p.weight);
    }
  }

  return result;
}

/* -------------------------------------------------------------------------- *
 * Helpers para height/weight buckets
 * -------------------------------------------------------------------------- */

export function isBucketAvailable(
  bucket: FilterBucket,
  range: [number, number],
): boolean {
  if (range[0] > range[1]) return false;
  return bucket.min < range[1] && bucket.max > range[0];
}
