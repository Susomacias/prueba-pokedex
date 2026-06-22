/**
 * Query GraphQL: lista paginada de pokemons (Plan 01.2).
 *
 * Pide el mínimo de campos necesario para renderizar la card:
 * `id`, `name`, `height`, `weight`, `sprites.front_default`, los tipos
 * (`slot` + `name`) y, vía `pokemonspecy`, el nombre del hábitat y de
 * la generación.
 *
 * La query está parametrizada por `$limit` y `$offset` para soportar
 * paginación cursor/offset. En fases futuras se extenderá con
 * `$where` (filtros) y `$order_by`.
 *
 * Endpoint v1beta2 (Plan 06.2): usa los nombres sin prefijo
 * `pokemon_v2_` (`pokemon`, `pokemonsprites`, `pokemontypes`,
 * `pokemonspecy`, ...) según el mapping expuesto por Hasura en
 * `doc/pokeapi/graphql/v1beta2/metadata/databases/default/tables/`.
 *
 * Nota sobre el `where`: GraphQL no soporta spread (`...$where`).
 * Combinamos el filtro base `is_default: { _eq: true }` con la
 * variable `$where` mediante un array `_and`. La variable es
 * `pokemon_bool_exp!` con valor por defecto `{}` para que el array
 * nunca contenga `null` (Hasura rechaza elementos null en `_and`).
 */
export const POKEMON_LIST_QUERY = /* GraphQL */ `
  query PokemonList(
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
      pokemonspecy {
        pokemonhabitat {
          name
        }
        generation {
          name
        }
      }
    }
  }
`;
