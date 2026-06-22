/**
 * Query GraphQL: lista filtrable de pokemons (Plan 01.5).
 *
 * Extiende `POKEMON_LIST_QUERY` añadiendo los campos necesarios para
 * soportar todos los filtros del plan y la búsqueda con fallback a
 * flavor text:
 *
 *  - `pokemon_v2_pokemoncolor` (filtro de color)
 *  - `pokemon_v2_pokemonspeciesflavortexts` (búsqueda por descripción)
 *  - `pokemon_v2_pokemonabilities` (filtro de habilidad)
 *  - `pokemon_v2_pokemon_aggregate { aggregate { count } }` (total)
 *
 * La query se define como alias de la query raíz para que el cliente
 * GraphQL no se queje de documentos duplicados cuando se envíen en
 * la misma operación.
 */
export const POKEMON_LIST_FILTERED_QUERY = /* GraphQL */ `
  query PokemonListFiltered(
    $limit: Int! = 30
    $offset: Int! = 0
    $where: pokemon_v2_pokemon_bool_exp
    $orderBy: [pokemon_v2_pokemon_order_by!] = { id: asc }
  ) {
    pokemon_v2_pokemon(
      where: { is_default: { _eq: true }, ...$where }
      limit: $limit
      offset: $offset
      order_by: $orderBy
    ) {
      id
      name
      height
      weight
      pokemon_v2_pokemonsprites {
        sprites
      }
      pokemon_v2_pokemontypes {
        slot
        pokemon_v2_type {
          name
        }
      }
      pokemon_v2_pokemonabilities {
        slot
        is_hidden
        pokemon_v2_ability {
          name
        }
      }
      pokemon_v2_pokemonspecies {
        pokemon_v2_pokemonhabitat {
          name
        }
        pokemon_v2_generation {
          name
        }
        pokemon_v2_pokemoncolor {
          name
        }
        pokemon_v2_pokemonspeciesflavortexts(
          where: { pokemon_v2_language: { name: { _eq: "en" } } }
          limit: 5
        ) {
          flavor_text
        }
      }
    }
    pokemon_v2_pokemon_aggregate(where: { is_default: { _eq: true }, ...$where }) {
      aggregate {
        count
      }
    }
  }
`;