/**
 * Query GraphQL: lista paginada de pokemons (Plan 01.2).
 *
 * Pide el mínimo de campos necesario para renderizar la card:
 * `id`, `name`, `height`, `weight`, `sprites.front_default`, los tipos
 * (`slot` + `name`) y, vía `pokemon_v2_pokemonspecies`, el nombre del
 * hábitat y de la generación.
 *
 * La query está parametrizada por `$limit` y `$offset` para soportar
 * paginación cursor/offset. En fases futuras se extenderá con
 * `$where` (filtros) y `$order_by`.
 */
export const POKEMON_LIST_QUERY = /* GraphQL */ `
  query PokemonList(
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
      pokemon_v2_pokemonspecies {
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
