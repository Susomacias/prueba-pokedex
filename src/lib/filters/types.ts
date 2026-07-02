import type {
  FilterBucket,
  Habitat,
  PokemonType,
  Generation,
} from "@/src/lib/types/pokemon";
export type { FilterBucket };
import { POKEMON_TYPE_LABELS } from "@/src/lib/constants/pokemonTypes";
import { TYPE_LABEL_TO_VALUE, normalizeFilterString } from "@/src/lib/constants/pokemonTypes";

/**
 * Filtros activos — Plan 02.2.
 *
 * El hook `useFilters()` y la consola comparten este mapa como única
 * fuente de verdad. Cualquier filtro nuevo debe añadirse a `FILTERS` Y
 * a la unión `Filters` (mapa explícito de clave → tipo).
 */

type SingleFilter<K extends string, V> = {
  readonly key: K;
  readonly kind: "single";
  readonly label: string;
  parse(raw: string): V | undefined;
  format(value: V): string;
};

type RangeFilter<K extends string> = {
  readonly key: K;
  readonly kind: "range";
  readonly label: string;
  parse(raw: string): FilterBucket | undefined;
  format(value: FilterBucket): string;
};

type TypeFilter = SingleFilter<"type1", PokemonType> | SingleFilter<"type2", PokemonType>;
type GenerationFilter = SingleFilter<"generation", Generation>;
type ColorFilter = SingleFilter<"color", string>;
type HabitatFilter = SingleFilter<"habitat", Habitat>;
type AbilityFilter = SingleFilter<"ability", string>;
type HeightFilter = RangeFilter<"height">;
type WeightFilter = RangeFilter<"weight">;
type SearchFilter = SingleFilter<"search", string>;

export const FILTERS = [
  {
    key: "type1",
    kind: "single" as const,
    label: "Tipo 1",
    parse: (raw: string): PokemonType | undefined => {
      if (raw === "") return undefined;
      return TYPE_LABEL_TO_VALUE.get(normalizeFilterString(raw));
    },
    format: (value: PokemonType): string => POKEMON_TYPE_LABELS[value] ?? value,
  },
  {
    key: "type2",
    kind: "single" as const,
    label: "Tipo 2",
    parse: (raw: string): PokemonType | undefined => {
      if (raw === "") return undefined;
      return TYPE_LABEL_TO_VALUE.get(normalizeFilterString(raw));
    },
    format: (value: PokemonType): string => POKEMON_TYPE_LABELS[value] ?? value,
  },
  {
    key: "generation",
    kind: "single" as const,
    label: "Generación",
    parse: (raw: string): Generation | undefined =>
      raw === "" ? undefined : (raw as Generation),
    format: (value: Generation): string => value,
  },
  {
    key: "color",
    kind: "single" as const,
    label: "Color",
    parse: (raw: string): string | undefined => (raw === "" ? undefined : raw),
    format: (value: string): string => value,
  },
  {
    key: "habitat",
    kind: "single" as const,
    label: "Hábitat",
    parse: (raw: string): Habitat | undefined =>
      raw === "" ? undefined : (raw as Habitat),
    format: (value: Habitat): string => value,
  },
  {
    key: "ability",
    kind: "single" as const,
    label: "Habilidad",
    parse: (raw: string): string | undefined => (raw === "" ? undefined : raw),
    format: (value: string): string => value,
  },
  {
    key: "height",
    kind: "range" as const,
    label: "Altura",
    parse: (raw: string): FilterBucket | undefined => {
      if (raw === "") return undefined;
      const bucket = parseRangeBucket(raw);
      if (bucket) return bucket;
      return parseLegacyRange(raw);
    },
    format: (value: FilterBucket): string =>
      `${value.min}_${value.max}`,
  },
  {
    key: "weight",
    kind: "range" as const,
    label: "Peso",
    parse: (raw: string): FilterBucket | undefined => {
      if (raw === "") return undefined;
      const bucket = parseRangeBucket(raw);
      if (bucket) return bucket;
      return parseLegacyRange(raw);
    },
    format: (value: FilterBucket): string =>
      `${value.min}_${value.max}`,
  },
  {
    key: "search",
    kind: "single" as const,
    label: "Búsqueda",
    parse: (raw: string): string | undefined => (raw === "" ? undefined : raw),
    format: (value: string): string => value,
  },
] as const satisfies ReadonlyArray<
  | TypeFilter
  | GenerationFilter
  | ColorFilter
  | HabitatFilter
  | AbilityFilter
  | HeightFilter
  | WeightFilter
  | SearchFilter
>;

export type FilterDefinition = (typeof FILTERS)[number];
export type FilterKey = FilterDefinition["key"];

/**
 * Mapa explícito de clave → tipo de valor del filtro.
 * Mantener en sincronía con `FILTERS` (ver tests de tipo en `types.test.ts`).
 */
export interface Filters {
  readonly type1?: PokemonType;
  readonly type2?: PokemonType;
  readonly generation?: Generation;
  readonly color?: string;
  readonly habitat?: Habitat;
  readonly ability?: string;
  readonly height?: FilterBucket;
  readonly weight?: FilterBucket;
  /**
   * Término de búsqueda libre (Plan 07.1). Actúa como un filtro más
   * dentro del estado unificado de `useFilters`: se serializa a la
   * URL (`?search=...`), se refleja en la consola/dropdowns/buscador
   * y lo consume `useFilteredPokemonList` para alimentar el scroll
   * infinito. No forma parte de `PokemonFilters` (where-clause) del
   * backend; se inyecta como `options.search`.
   */
  readonly search?: string;
}

export type FilterValue<K extends FilterKey> = NonNullable<Filters[K]>;

export interface FilterSummaryEntry<K extends FilterKey = FilterKey> {
  key: K;
  label: string;
  /** Representación cruda del valor para mostrar al usuario. */
  display: string;
}

function parseRangeBucket(raw: string): FilterBucket | undefined {
  const parts = raw.split("_");
  if (parts.length !== 2) return undefined;
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (Number.isNaN(min) || Number.isNaN(max)) return undefined;
  return { value: raw, label: raw, min, max };
}

function parseLegacyRange(raw: string): FilterBucket | undefined {
  const [min, max] = raw.split("-").map((n) => Number(n));
  if (
    Number.isNaN(min) ||
    Number.isNaN(max) ||
    min === undefined ||
    max === undefined
  ) {
    return undefined;
  }
  return { value: raw, label: raw, min, max };
}
