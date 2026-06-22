import type {
  FilterBucket,
  Habitat,
  PokemonType,
  Generation,
} from "@/src/lib/types/pokemon";

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

export const FILTERS = [
  {
    key: "type1",
    kind: "single" as const,
    label: "Tipo 1",
    parse: (raw: string): PokemonType | undefined =>
      raw === "" ? undefined : (raw as PokemonType),
    format: (value: PokemonType): string => value,
  },
  {
    key: "type2",
    kind: "single" as const,
    label: "Tipo 2",
    parse: (raw: string): PokemonType | undefined =>
      raw === "" ? undefined : (raw as PokemonType),
    format: (value: PokemonType): string => value,
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
    },
    format: (value: FilterBucket): string => value.value,
  },
  {
    key: "weight",
    kind: "range" as const,
    label: "Peso",
    parse: (raw: string): FilterBucket | undefined => {
      if (raw === "") return undefined;
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
    },
    format: (value: FilterBucket): string => value.value,
  },
] as const satisfies ReadonlyArray<
  | TypeFilter
  | GenerationFilter
  | ColorFilter
  | HabitatFilter
  | AbilityFilter
  | HeightFilter
  | WeightFilter
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
}

export type FilterValue<K extends FilterKey> = NonNullable<Filters[K]>;

export interface FilterSummaryEntry<K extends FilterKey = FilterKey> {
  key: K;
  label: string;
  /** Representación cruda del valor para mostrar al usuario. */
  display: string;
}
