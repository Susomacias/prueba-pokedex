/**
 * Query GraphQL: opciones para los filtros del Plan 01.4.
 *
 * Devuelve todas las listas de valores posibles para los 8 filtros
 * del borrador:
 *  1. Tipo 1 / Tipo 2
 *  2. Generación
 *  3. Color
 *  4. Hábitat
 *  5. Altura (rango agregado)
 *  6. Peso (rango agregado)
 *  7. Habilidad
 *
 * Se ejecuta como una sola query para minimizar el número de
 * peticiones al endpoint y poder lanzarla en `Promise.all` con el
 * resto de fetches paralelos.
 *
 * Los buckets de altura y peso se derivan localmente en el cliente a
 * partir del `min`/`max` agregados, para poder reaccionar si la API
 * añade pokemons fuera de los rangos predefinidos.
 */
export const FILTER_OPTIONS_QUERY = /* GraphQL */ `
  query FilterOptions {
    pokemon_v2_type(order_by: { id: ASC }) {
      id
      name
    }
    pokemon_v2_generation(order_by: { id: ASC }) {
      id
      name
    }
    pokemon_v2_pokemoncolor(order_by: { id: ASC }) {
      id
      name
    }
    pokemon_v2_pokemonhabitat(order_by: { id: ASC }) {
      id
      name
    }
    pokemon_v2_ability(order_by: { id: ASC }) {
      id
      name
    }
    pokemon_v2_pokemon_aggregate(where: { is_default: { _eq: true } }) {
      aggregate {
        min {
          height
          weight
        }
        max {
          height
          weight
        }
      }
    }
  }
`;

export const TYPES_QUERY = /* GraphQL */ `
  query Types {
    pokemon_v2_type(order_by: { id: ASC }) {
      id
      name
    }
  }
`;

export const GENERATIONS_QUERY = /* GraphQL */ `
  query Generations {
    pokemon_v2_generation(order_by: { id: ASC }) {
      id
      name
    }
  }
`;

export const COLORS_QUERY = /* GraphQL */ `
  query Colors {
    pokemon_v2_pokemoncolor(order_by: { id: ASC }) {
      id
      name
    }
  }
`;

export const HABITATS_QUERY = /* GraphQL */ `
  query Habitats {
    pokemon_v2_pokemonhabitat(order_by: { id: ASC }) {
      id
      name
    }
  }
`;

export const ABILITIES_QUERY = /* GraphQL */ `
  query Abilities {
    pokemon_v2_ability(order_by: { id: ASC }) {
      id
      name
    }
  }
`;

export const HEIGHT_WEIGHT_AGGREGATE_QUERY = /* GraphQL */ `
  query HeightWeightAggregate {
    pokemon_v2_pokemon_aggregate(where: { is_default: { _eq: true } }) {
      aggregate {
        min {
          height
          weight
        }
        max {
          height
          weight
        }
      }
    }
  }
`;