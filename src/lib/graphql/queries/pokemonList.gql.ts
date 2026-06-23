/**
 * Query GraphQL: lista paginada de pokemons (Plan 01.2).
 *
 * Pide el mínimo de campos necesario para renderizar la card:
 * `id`, `name`, `height`, `weight`, `sprites.front_default`, los tipos
 * (`slot` + `name`) y, vía `pokemon_v2_pokemonspecy`, el nombre del
 * hábitat y de la generación.
 *
 * La query está parametrizada por `$limit` y `$offset` para soportar
 * paginación cursor/offset. En fases futuras se extenderá con
 * `$where` (filtros) y `$order_by`.
 *
 * Endpoint v1beta (`https://beta.pokeapi.co/graphql/v1beta`): usa
 * los nombres CON prefijo `pokemon_v2_` (`pokemon_v2_pokemon`,
 * `pokemon_v2_pokemonsprites`, `pokemon_v2_pokemontypes`,
 * `pokemon_v2_pokemonspecy`, ...).
 *
 * Nota sobre el `where`: GraphQL no soporta spread (`...$where`).
 * Combinamos el filtro base `is_default: { _eq: true }` con la
 * variable `$where` mediante un array `_and`. La variable es
 * `pokemon_v2_pokemon_bool_exp!` con valor por defecto `{}` para que
 * el array nunca contenga `null` (Hasura rechaza elementos null en `_and`).
 */
export const POKEMON_LIST_QUERY = /* GraphQL */ `
  query PokemonList(
    $limit: Int! = 30
    $offset: Int! = 0
    $where: pokemon_v2_pokemon_bool_exp! = {}
    $orderBy: [pokemon_v2_pokemon_order_by!] = { id: asc }
  ) {
    pokemon_v2_pokemon(
      where: { _and: [{ is_default: { _eq: true } }, $where] }
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
      pokemon_v2_pokemonspecy {
        pokemon_v2_pokemonhabitat {
          name
        }
        pokemon_v2_generation {
          name
        }
      }
    }
  }
`;
