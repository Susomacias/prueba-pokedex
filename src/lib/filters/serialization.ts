import { FILTERS, type FilterKey, type Filters } from "./types";

/**
 * Serializa un objeto `Filters` a `URLSearchParams`.
 * Las claves con valor `undefined` o `null` se omiten.
 */
export function filtersToSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  for (const def of FILTERS) {
    const raw = filters[def.key];
    if (raw === undefined || raw === null || raw === "") {
      continue;
    }
    const stringified = def.format(raw as never);
    params.set(def.key, String(stringified));
  }
  return params;
}

/**
 * Parsea `URLSearchParams` (o iterable equivalente) a un objeto `Filters`.
 * Las claves ausentes o con valor vacío se omiten. Los valores inválidos
 * quedan como `undefined`.
 */
export function searchParamsToFilters(
  source:
    | URLSearchParams
    | ReadonlyURLSearchParamsLike
    | ReadonlyMap<string, string>
    | Record<string, string | readonly string[] | undefined>,
): Filters {
  const filters: Partial<Record<FilterKey, unknown>> = {};
  for (const def of FILTERS) {
    const raw = readSingle(source, def.key);
    if (raw === undefined || raw === "") {
      continue;
    }
    const parsed = def.parse(raw);
    if (parsed === undefined) {
      continue;
    }
    filters[def.key] = parsed;
  }
  return filters as Filters;
}

/**
 * Aplica una mutación a un objeto `Filters` creando uno nuevo
 * (inmutable). Útil para `setFilter` / `removeFilter`.
 */
export function applyFilterChange<K extends FilterKey>(
  prev: Filters,
  key: K,
  next: Filters[K] | undefined,
): Filters {
  if (next === undefined) {
    const rest: { -readonly [P in FilterKey]?: Filters[P] } = { ...prev };
    delete rest[key];
    return rest;
  }
  return { ...prev, [key]: next };
}

function readSingle(
  source:
    | URLSearchParams
    | ReadonlyURLSearchParamsLike
    | ReadonlyMap<string, string>
    | Record<string, string | readonly string[] | undefined>,
  key: string,
): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined;
  }
  if (typeof (source as ReadonlyURLSearchParamsLike).get === "function") {
    const v = (source as ReadonlyURLSearchParamsLike).get(key);
    return v ?? undefined;
  }
  if (typeof (source as ReadonlyMap<string, string>).get === "function") {
    const v = (source as ReadonlyMap<string, string>).get(key);
    return v ?? undefined;
  }
  const raw = (source as Record<string, string | readonly string[] | undefined>)[
    key
  ];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  if (typeof raw === "string") {
    return raw;
  }
  return undefined;
}

interface ReadonlyURLSearchParamsLike {
  get(key: string): string | null;
}
