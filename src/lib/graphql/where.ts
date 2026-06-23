/**
 * Builder tipado del argumento `where` de las queries de la PokeAPI
 * (Plan 01.5).
 *
 * La PokeAPI expone un input `pokemon_v2_pokemon_bool_exp` con
 * operadores booleanos (`_and`, `_or`, `_not`) y por campo (`_eq`,
 * `_neq`, `_ilike`, `_in`, `_gte`, `_lte`, etc.). El builder se limita
 * al subconjunto que el plan necesita para los filtros del borrador.
 *
 * Endpoint v1beta (`https://beta.pokeapi.co/graphql/v1beta`): naming
 * CON prefijo `pokemon_v2_` en todos los tipos y campos. Esto incluye
 * los nombres de input (`pokemon_v2_pokemon_bool_exp`,
 * `pokemon_v2_pokemon_order_by`) y los tipos anidados
 * (`pokemon_v2_pokemonspecy`, `pokemon_v2_pokemoncolor`, etc.).
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

/** Forma simplificada de un nodo `where` para `pokemon_v2_pokemon`. */
export interface PokemonWhere {
  _and?: ReadonlyArray<PokemonWhere>;
  _or?: ReadonlyArray<PokemonWhere>;
  _not?: PokemonWhere;
  is_default?: WhereEq;
  id?: WhereEq;
  name?: WhereEq;
  height?: WhereEq;
  weight?: WhereEq;
  pokemon_v2_pokemontypes?: {
    pokemon_v2_type?: { name?: WhereEq };
    slot?: WhereEq;
  };
  pokemon_v2_pokemonabilities?: {
    pokemon_v2_ability?: { name?: WhereEq };
  };
  pokemon_v2_pokemonspecy?: {
    pokemon_v2_pokemonhabitat?: { name?: WhereEq };
    pokemon_v2_generation?: { name?: WhereEq };
    pokemon_v2_pokemoncolor?: { name?: WhereEq };
    pokemon_v2_pokemonspeciesflavortexts?: {
      flavor_text?: WhereEq;
      pokemon_v2_language?: { name?: WhereEq };
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
      pokemon_v2_pokemontypes: {
        pokemon_v2_type: { name: { _eq: t } },
      },
    });
  }

  if (filters.type2) {
    const t: PokemonType = filters.type2;
    clauses.push({
      pokemon_v2_pokemontypes: {
        slot: { _eq: 2 },
        pokemon_v2_type: { name: { _eq: t } },
      },
    });
  }

  if (filters.generation) {
    const g: Generation = filters.generation;
    clauses.push({
      pokemon_v2_pokemonspecy: {
        pokemon_v2_generation: { name: { _eq: g } },
      },
    });
  }

  if (filters.color) {
    clauses.push({
      pokemon_v2_pokemonspecy: {
        pokemon_v2_pokemoncolor: { name: { _eq: filters.color } },
      },
    });
  }

  if (filters.habitat) {
    clauses.push({
      pokemon_v2_pokemonspecy: {
        pokemon_v2_pokemonhabitat: {
          name: { _eq: HABITAT_REVERSE_ALIAS[filters.habitat] },
        },
      },
    });
  }

  if (filters.ability) {
    clauses.push({
      pokemon_v2_pokemonabilities: {
        pokemon_v2_ability: { name: { _eq: filters.ability } },
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
 * Normaliza un término de búsqueda para hacerlo:
 *  - insensible a mayúsculas/minúsculas,
 *  - insensible a acentos/diacríticos (NFD + strip combining marks),
 *  - insensible a signos de puntuación y caracteres especiales
 *    (se conservan únicamente letras, números y espacios).
 *
 * Los nombres de pokemon en PokeAPI son slugs ASCII en minúsculas
 * (`charmander`, `pikachu`), así que normalizar el input del usuario
 * garantiza que `PÍKACHU!!!`, `pikachu`, `Pikachu` produzcan el mismo
 * `where`. Se exporta para poder testearla de forma aislada.
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Divide un término de búsqueda normalizado en tokens (palabras).
 * Cada token se busca de forma independiente con `_ilike %token%` y
 * los resultados se combinan con OR, de modo que `Charman Pika`
 * muestra Charmander **o** Pikachu. Devuelve `[]` si el término no
 * contiene tokens válidos.
 */
export function splitSearchTokens(term: string): string[] {
  const normalized = normalizeSearchTerm(term);
  if (normalized === "") return [];
  return normalized.split(" ").filter((t) => t.length > 0);
}

/**
 * Construye un `where` para búsqueda por nombre parcial.
 *
 * Soporta términos multi-palabra (`Charman Pika`): cada token se
 * busca con `_ilike %token%` sobre `name` y se combinan con OR, de
 * modo que el resultado incluye cualquier pokemon cuyo nombre
 * contenga alguno de los tokens. El término se normaliza
 * (minúsculas, sin acentos ni signos) antes de construir el `where`.
 */
export function buildNameSearchWhere(term: string): PokemonWhere {
  const tokens = splitSearchTokens(term);
  if (tokens.length === 0) return {};
  if (tokens.length === 1) {
    return { name: { _ilike: `%${tokens[0]}%` } };
  }
  return {
    _or: tokens.map((token) => ({
      name: { _ilike: `%${token}%` },
    })),
  };
}

/**
 * Construye el `where` "ampliado" cuando la búsqueda por nombre no
 * devuelve resultados y el término tiene 3+ letras: combina por OR
 * flavor_text, tipos, habitat y generación.
 *
 * Soporta términos multi-palabra: cada token se aplica en OR sobre
 * cada campo ampliado, de modo que `Charman Pradera` pueda encontrar
 * Charmander (por nombre) o pokemons de la pradera (por hábitat).
 *
 * Endpoint v1beta: tipos anidados con prefijo `pokemon_v2_`.
 */
export function buildExpandedSearchWhere(term: string): PokemonWhere {
  const tokens = splitSearchTokens(term);
  if (tokens.length === 0) return {};
  const orClauses: PokemonWhere[] = [];
  for (const token of tokens) {
    orClauses.push(
      {
        pokemon_v2_pokemonspecy: {
          pokemon_v2_pokemonspeciesflavortexts: {
            flavor_text: { _ilike: `%${token}%` },
          },
        },
      },
      {
        pokemon_v2_pokemontypes: {
          pokemon_v2_type: { name: { _ilike: `%${token}%` } },
        },
      },
      {
        pokemon_v2_pokemonspecy: {
          pokemon_v2_pokemonhabitat: { name: { _ilike: `%${token}%` } },
        },
      },
      {
        pokemon_v2_pokemonspecy: {
          pokemon_v2_generation: { name: { _ilike: `%${token}%` } },
        },
      },
    );
  }
  return { _or: orClauses };
}
