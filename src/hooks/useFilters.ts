"use client";

import { useCallback, useMemo } from "react";
import { useNavigation } from "./useNavigation";
import {
  applyFilterChange,
  filtersToSearchParams,
  searchParamsToFilters,
} from "@/src/lib/filters/serialization";
import {
  FILTERS,
  type FilterBucket,
  type FilterKey,
  type FilterSummaryEntry,
  type FilterValue,
  type Filters,
} from "@/src/lib/filters/types";

/**
 * Hook único de estado de filtros (Plan 02.2).
 *
 * Es el **único** punto de mutación: consola, dropdowns y buscador
 * lo consumen. La sincronización con la URL es **bidireccional**:
 *   - Al mutar `setFilter`/`removeFilter`/`clearAll` → actualiza la URL
 *     con `router.replace({ scroll: false })` (sin recarga de página).
 *   - Al cambiar la URL (back/forward, link compartido) → `filters`
 *     refleja los nuevos `searchParams`.
 *
 * Para evitar prop-drilling, el provider se monta en
 * `src/components/filters/FiltersProvider.tsx` (Plan 02.3).
 */
export interface UseFiltersApi {
  filters: Filters;
  activeCount: number;
  setFilter<K extends FilterKey>(
    key: K,
    value: FilterValue<K> | undefined,
  ): void;
  removeFilter(key: FilterKey): void;
  clearAll(): void;
  summary(): FilterSummaryEntry[];
}

export function useFilters(): UseFiltersApi {
  const navigation = useNavigation();

  const filters = useMemo(
    () => searchParamsToFilters(navigation.searchParams),
    [navigation.searchParams],
  );

  const writeFilters = useCallback(
    (next: Filters) => {
      const params = filtersToSearchParams(next);
      const queryString = params.toString();
      const url =
        queryString.length > 0
          ? `${navigation.pathname}?${queryString}`
          : navigation.pathname;
      navigation.router.replace(url);
    },
    [navigation.pathname, navigation.router],
  );

  const setFilter = useCallback(
    <K extends FilterKey>(key: K, value: FilterValue<K> | undefined) => {
      writeFilters(applyFilterChange(filters, key, value));
    },
    [filters, writeFilters],
  );

  const removeFilter = useCallback(
    (key: FilterKey) => {
      writeFilters(applyFilterChange(filters, key, undefined));
    },
    [filters, writeFilters],
  );

  const clearAll = useCallback(() => {
    if (Object.keys(filters).length === 0) return;
    writeFilters({});
  }, [filters, writeFilters]);

  const activeCount = useMemo(
    () =>
      FILTERS.reduce(
        (acc, def) => (filters[def.key] !== undefined ? acc + 1 : acc),
        0,
      ),
    [filters],
  );

  const summary = useCallback((): FilterSummaryEntry[] => {
    const entries: FilterSummaryEntry[] = [];
    for (const def of FILTERS) {
      const value = filters[def.key];
      if (value === undefined) continue;
      const display =
        def.kind === "range"
          ? (value as FilterBucket).label
          : def.format(value as never);
      entries.push({
        key: def.key,
        label: def.label,
        display,
      });
    }
    return entries;
  }, [filters]);

  return { filters, activeCount, setFilter, removeFilter, clearAll, summary };
}
