/**
 * Tipos crudos compartidos por las queries de lista (`fetchList.ts`)
 * y lista filtrable (`fetchListFiltered.ts`).
 *
 * Se exportan por separado para que cada query pueda declarar su
 * propia forma de respuesta completa (algunos campos adicionales,
 * como `pokemon_v2_pokemoncolor` o `_aggregate`, solo están en la
 * variante filtrable).
 */

export interface RawListType {
  slot: number;
  pokemon_v2_type: { name: string };
}

export interface RawListAbility {
  is_hidden: boolean;
  slot: number;
  pokemon_v2_ability: { name: string };
}

export interface RawListFlavorText {
  flavor_text: string;
}

export interface RawListSpecies {
  pokemon_v2_pokemonhabitat: { name: string } | null;
  pokemon_v2_generation: { name: string } | null;
  pokemon_v2_pokemoncolor?: { name: string } | null;
  pokemon_v2_pokemonspeciesflavortexts?: ReadonlyArray<RawListFlavorText>;
}

export interface RawListPokemon {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  pokemon_v2_pokemonsprites: Array<{ sprites: unknown }>;
  pokemon_v2_pokemontypes: ReadonlyArray<RawListType>;
  pokemon_v2_pokemonabilities?: ReadonlyArray<RawListAbility>;
  pokemon_v2_pokemonspecies: RawListSpecies | null;
}

/**
 * Resultado "agregado" opcional que devuelve `pokemon_v2_pokemon_aggregate`
 * cuando se solicita el total de resultados (ver
 * `POKEMON_LIST_FILTERED_QUERY`).
 */
export interface RawListAggregate {
  pokemon_v2_pokemon_aggregate?: {
    aggregate: { count: number };
  };
}