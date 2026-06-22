/**
 * Tipos crudos compartidos por las queries de lista (`fetchList.ts`)
 * y lista filtrable (`fetchListFiltered.ts`).
 *
 * Se exportan por separado para que cada query pueda declarar su
 * propia forma de respuesta completa (algunos campos adicionales,
 * como `pokemoncolor` o `_aggregate`, solo están en la variante
 * filtrable).
 *
 * Endpoint v1beta2 (Plan 06.2): naming sin prefijo `pokemon_v2_`.
 */

export interface RawListType {
  slot: number;
  type: { name: string };
}

export interface RawListAbility {
  is_hidden: boolean;
  slot: number;
  ability: { name: string };
}

export interface RawListFlavorText {
  flavor_text: string;
}

export interface RawListSpecies {
  pokemonhabitat: { name: string } | null;
  generation: { name: string } | null;
  pokemoncolor?: { name: string } | null;
  pokemonspeciesflavortexts?: ReadonlyArray<RawListFlavorText>;
}

export interface RawListPokemon {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  pokemonsprites: Array<{ sprites: unknown }>;
  pokemontypes: ReadonlyArray<RawListType>;
  pokemonabilities?: ReadonlyArray<RawListAbility>;
  pokemonspecy: RawListSpecies | null;
}

/**
 * Resultado "agregado" opcional que devuelve `pokemon_aggregate`
 * cuando se solicita el total de resultados (ver
 * `POKEMON_LIST_FILTERED_QUERY`).
 */
export interface RawListAggregate {
  pokemon_aggregate?: {
    aggregate: { count: number };
  };
}
