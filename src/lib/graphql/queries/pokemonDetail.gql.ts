/**
 * Query GraphQL: detalle completo de un pokemon por `name`
 * (Plan 01.3).
 *
 * Se entra por `pokemonspecy` para acceder a:
 *  - datos básicos del pokemon por defecto
 *  - stats y abilities
 *  - tipos
 *  - sprites (JSON con `front_default` y compañía)
 *  - cries (URL del sonido)
 *  - generación y hábitat (vía la propia species)
 *  - flavor text en español
 *  - cadena evolutiva completa (todas las species de la cadena)
 *
 * Endpoint v1beta2 (Plan 06.2): naming sin prefijo `pokemon_v2_`.
 */
export const POKEMON_DETAIL_QUERY = /* GraphQL */ `
  query PokemonDetail($name: String!) {
    pokemonspecies(where: { name: { _eq: $name } }) {
      id
      name
      is_legendary
      is_mythical
      capture_rate
      base_happiness
      generation {
        name
      }
      pokemonhabitat {
        name
      }
      pokemonspeciesflavortexts(
        where: { language: { name: { _eq: "es" } } }
        limit: 5
        order_by: { version_id: desc }
      ) {
        flavor_text
        version {
          name
        }
      }
      pokemons(limit: 1, where: { is_default: { _eq: true } }) {
        id
        name
        height
        weight
        base_experience
        pokemonstats {
          base_stat
          stat {
            name
          }
        }
        pokemonabilities {
          is_hidden
          slot
          ability {
            name
          }
        }
        pokemontypes {
          slot
          type {
            name
          }
        }
        pokemonsprites {
          sprites
        }
        pokemoncries {
          cries
        }
      }
      evolutionchain {
        pokemonspecies(order_by: { id: asc }) {
          id
          name
          evolves_from_species_id
        }
      }
    }
  }
`;
