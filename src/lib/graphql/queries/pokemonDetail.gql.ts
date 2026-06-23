/**
 * Query GraphQL: detalle completo de un pokemon por `name`
 * (Plan 01.3).
 *
 * Se entra por `pokemon_v2_pokemonspecies` para acceder a:
 *  - datos básicos del pokemon por defecto
 *  - stats y abilities
 *  - tipos
 *  - sprites (JSON con `front_default` y compañía)
 *  - cries (URL del sonido)
 *  - generación y hábitat (vía la propia species)
 *  - flavor text en español
 *  - cadena evolutiva completa (todas las species de la cadena)
 *
 * Endpoint v1beta: naming CON prefijo `pokemon_v2_`.
 */
export const POKEMON_DETAIL_QUERY = /* GraphQL */ `
  query PokemonDetail($name: String!) {
    pokemon_v2_pokemonspecies(where: { name: { _eq: $name } }) {
      id
      name
      is_legendary
      is_mythical
      capture_rate
      base_happiness
      pokemon_v2_generation {
        name
      }
      pokemon_v2_pokemonhabitat {
        name
      }
      pokemon_v2_pokemonspeciesflavortexts(
        where: { pokemon_v2_language: { name: { _eq: "es" } } }
        limit: 5
        order_by: { version_id: desc }
      ) {
        flavor_text
        pokemon_v2_version {
          name
        }
      }
      pokemon_v2_pokemons(limit: 1, where: { is_default: { _eq: true } }) {
        id
        name
        height
        weight
        base_experience
        pokemon_v2_pokemonstats {
          base_stat
          pokemon_v2_stat {
            name
          }
        }
        pokemon_v2_pokemonabilities {
          is_hidden
          slot
          pokemon_v2_ability {
            name
          }
        }
        pokemon_v2_pokemontypes {
          slot
          pokemon_v2_type {
            name
          }
        }
        pokemon_v2_pokemonsprites {
          sprites
        }
        pokemon_v2_pokemoncries {
          cries
        }
      }
      pokemon_v2_evolutionchain {
        pokemon_v2_pokemonspecies(order_by: { id: asc }) {
          id
          name
          evolves_from_species_id
        }
      }
    }
  }
`;
