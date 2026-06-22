/**
 * Builder tipado del argumento `where` de las queries de la PokeAPI
 * (Plan 01.5).
 *
 * La PokeAPI expone un input `pokemon_bool_exp` con operadores
 * booleanos (`_and`, `_or`, `_not`) y por campo (`_eq`, `_neq`,
 * `_ilike`, `_in`, `_gte`, `_lte`, etc.). El builder se limita al
 * subconjunto que el plan necesita para los filtros del borrador.
 *
 * Endpoint v1beta2 (Plan 06.2): naming sin prefijo `pokemon_v2_`.
 */

import type {
  FilterBucket,
  Generation,
  Habitat,
  PokemonFilters,
  PokemonType,
} from "@/src/lib/types/pokemon";

/**
 * Mapeo explícito de claves internas en español → identificadores en
 * inglés que usa la PokeAPI. Construido manualmente para garantizar
 * que cada `Habitat` del catálogo tiene exactamente una entrada.
 */
export const HABITAT_REVERSE_ALIAS: Record<Habitat, string> = {
  caverna: "cave",
  bosque: "forest",
  pradera: "grassland",
  campo: "field",
  montana: "mountain",
  agua_dulce: "freshwater",
  agua_salada: "sea",
  ciudad: "urban",
  raro: "rare",
  generico: "rare",
};

/** Operador por campo para `where` de la PokeAPI. */
export type WhereOperator = string | number | boolean | null;

interface WhereEq {
  _eq?: WhereOperator;
  _neq?: WhereOperator;
  _ilike?: string;
  _like?: string;
  _in?: ReadonlyArray<WhereOperator>;
  _gte?: number;
  _lte?: number;
  _is_null?: boolean;
}

/** Forma simplificada de un nodo `where` para `pokemon`. */
export interface PokemonWhere {
  _and?: ReadonlyArray<PokemonWhere>;
  _or?: ReadonlyArray<PokemonWhere>;
  _not?: PokemonWhere;
  is_default?: WhereEq;
  id?: WhereEq;
  name?: WhereEq;
  height?: WhereEq;
  weight?: WhereEq;
  pokemontypes?: {
    type?: { name?: WhereEq };
    slot?: WhereEq;
  };
  pokemonabilities?: {
    ability?: { name?: WhereEq };
  };
  pokemonspecy?: {
    pokemonhabitat?: { name?: WhereEq };
    generation?: { name?: WhereEq };
    pokemoncolor?: { name?: WhereEq };
    pokemonspeciesflavortexts?: {
      flavor_text?: WhereEq;
      language?: { name?: WhereEq };
    };
  };
}

/** Opciones del buscador. */
export interface SearchOptions {
  readonly search?: string;
  readonly limit?: number;
  readonly withTotal?: boolean;
}

/**
 * Construye el `where` GraphQL combinando los filtros del plan con
 * AND. Solo añade las cláusulas que tienen valor (los filtros son
 * opcionales).
 */
export function buildPokemonWhere(
  filters: PokemonFilters,
): PokemonWhere {
  const clauses: PokemonWhere[] = [];

  if (filters.type1) {
    const t: PokemonType = filters.type1;
    clauses.push({
      pokemontypes: {
        type: { name: { _eq: t } },
      },
    });
  }

  if (filters.type2) {
    const t: PokemonType = filters.type2;
    clauses.push({
      pokemontypes: {
        slot: { _eq: 2 },
        type: { name: { _eq: t } },
      },
    });
  }

  if (filters.generation) {
    const g: Generation = filters.generation;
    clauses.push({
      pokemonspecy: {
        generation: { name: { _eq: g } },
      },
    });
  }

  if (filters.color) {
    clauses.push({
      pokemonspecy: {
        pokemoncolor: { name: { _eq: filters.color } },
      },
    });
  }

  if (filters.habitat) {
    clauses.push({
      pokemonspecy: {
        pokemonhabitat: {
          name: { _eq: HABITAT_REVERSE_ALIAS[filters.habitat] },
        },
      },
    });
  }

  if (filters.ability) {
    clauses.push({
      pokemonabilities: {
        ability: { name: { _eq: filters.ability } },
      },
    });
  }

  if (filters.height) {
    clauses.push(buildBucketClause("height", filters.height));
  }

  if (filters.weight) {
    clauses.push(buildBucketClause("weight", filters.weight));
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0]!;
  return { _and: clauses };
}

function buildBucketClause(
  field: "height" | "weight",
  bucket: FilterBucket,
): PokemonWhere {
  const clause: PokemonWhere = { [field]: {} };
  if (Number.isFinite(bucket.min)) {
    (clause[field] as WhereEq)._gte = bucket.min;
  }
  if (Number.isFinite(bucket.max)) {
    (clause[field] as WhereEq)._lte = bucket.max;
  }
  return clause;
}

/**
 * Construye un `where` para búsqueda por nombre parcial. Usa `_ilike`
 * con comodines `%term%`.
 */
export function buildNameSearchWhere(term: string): PokemonWhere {
  return {
    name: { _ilike: `%${term}%` },
  };
}

/**
 * Construye el `where` "ampliado" cuando la búsqueda por nombre no
 * devuelve resultados y el término tiene 3+ letras: combina por OR
 * flavor_text, tipos, habitat y generación.
 *
 * Endpoint v1beta2 (Plan 06.2): naming sin prefijo `pokemon_v2_`.
 */
export function buildExpandedSearchWhere(term: string): PokemonWhere {
  return {
    _or: [
      {
        pokemonspecy: {
          pokemonspeciesflavortexts: {
            flavor_text: { _ilike: `%${term}%` },
          },
        },
      },
      {
        pokemontypes: {
          type: { name: { _ilike: `%${term}%` } },
        },
      },
      {
        pokemonspecy: {
          pokemonhabitat: { name: { _ilike: `%${term}%` } },
        },
      },
      {
        pokemonspecy: {
          generation: { name: { _ilike: `%${term}%` } },
        },
      },
    ],
  };
}