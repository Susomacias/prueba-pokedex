/**
 * Query GraphQL: lista filtrable de pokemons (Plan 01.5).
 *
 * Extiende `POKEMON_LIST_QUERY` añadiendo los campos necesarios para
 * soportar todos los filtros del plan y la búsqueda con fallback a
 * flavor text:
 *
 *  - `pokemoncolor` (filtro de color)
 *  - `pokemonspeciesflavortexts` (búsqueda por descripción)
 *  - `pokemonabilities` (filtro de habilidad)
 *  - `pokemon_aggregate { aggregate { count } }` (total)
 *
 * Endpoint v1beta2 (Plan 06.2): naming sin prefijo `pokemon_v2_`.
 *
 * Nota sobre el `where`: GraphQL NO soporta spread (`...$where`).
 * Combinamos `is_default: { _eq: true }` con la variable `$where`
 * usando un array `_and`. La variable es `pokemon_bool_exp! = {}`
 * para que el array nunca contenga `null`.
 */
export const POKEMON_LIST_FILTERED_QUERY = /* GraphQL */ `
  query PokemonListFiltered(
    $limit: Int! = 30
    $offset: Int! = 0
    $where: pokemon_bool_exp! = {}
    $orderBy: [pokemon_order_by!] = { id: asc }
  ) {
    pokemon(
      where: { _and: [{ is_default: { _eq: true } }, $where] }
      limit: $limit
      offset: $offset
      order_by: $orderBy
    ) {
      id
      name
      height
      weight
      pokemonsprites {
        sprites
      }
      pokemontypes {
        slot
        type {
          name
        }
      }
      pokemonabilities {
        slot
        is_hidden
        ability {
          name
        }
      }
      pokemonspecy {
        pokemonhabitat {
          name
        }
        generation {
          name
        }
        pokemoncolor {
          name
        }
        pokemonspeciesflavortexts(
          where: { language: { name: { _eq: "en" } } }
          limit: 5
        ) {
          flavor_text
        }
      }
    }
    pokemon_aggregate(where: { _and: [{ is_default: { _eq: true } }, $where] }) {
      aggregate {
        count
      }
    }
  }
`;