"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import { applyFiltersToList } from "@/src/lib/pokemon/cachedPokemonApi";
import type {
  PokemonFilters,
  PokemonListItem,
} from "@/src/lib/types/pokemon";

/**
 * Plan 02.3 — Hook que combina los filtros activos con la lista
 * paginada de pokemons.
 *
 * Estrategia:
 *  - Lee los filtros activos desde el `FiltersProvider` (que a su
 *    vez los sincroniza con la URL vía `useFilters`).
 *  - Convierte los filtros de la UI (`Filters`) al formato que
 *    consume la capa de datos (`PokemonFilters`). En esta fase los
 *    tipos son compatibles 1:1.
 *  - Mantiene estado local con los items acumulados y expone
 *    `loadMore()` para pedir la siguiente página usando
 *    `nextOffset`.
 *  - Re-fetch automático cuando cambian los filtros.
 *
 * Notas:
 *  - `search` no forma parte de los filtros activos todavía; se
 *    añadirá en una fase posterior (buscador). El parámetro se
 *    acepta opcionalmente para que `loadMore` pueda mantener la
 *    query original entre páginas.
 *  - El `dataRef` guarda los items acumulados entre renders para
 *    que `loadMore` pueda concatenar con la página anterior. El ref
 *    se actualiza dentro de `useEffect` (no durante render) para
 *    cumplir con las reglas de `react-hooks/refs`.
 */

export interface UseFilteredPokemonListOptions {
  /** Término de búsqueda opcional (futuro: buscador). */
  search?: string;
}

export type UseFilteredPokemonListStatus =
  | "loading"
  | "loadingMore"
  | "ready"
  | "error";

export interface UseFilteredPokemonListResult {
  status: UseFilteredPokemonListStatus;
  items: ReadonlyArray<PokemonListItem>;
  nextOffset: number | null;
  total: number | null;
  single: boolean;
  error: Error | null;
  loadMore(): Promise<void>;
  refresh(): Promise<void>;
}

function toApiFilters(
  filters: ReturnType<typeof useFiltersContext>["filters"],
): PokemonFilters {
  return filters as unknown as PokemonFilters;
}

export function useFilteredPokemonList(
  initialOffset: number = 0,
  options: UseFilteredPokemonListOptions = {},
): UseFilteredPokemonListResult {
  const { filters } = useFiltersContext();
  const apiFilters = toApiFilters(filters);
  const filterKey = stableKey(apiFilters);
  const searchKey = options.search ?? "";

  const [items, setItems] = useState<ReadonlyArray<PokemonListItem>>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [single, setSingle] = useState<boolean>(false);
  const [status, setStatus] = useState<UseFilteredPokemonListStatus>("loading");
  const [error, setError] = useState<Error | null>(null);

  // Sincroniza un ref con `items` para que `loadMore` (estable) pueda
  // leer el valor actual sin invalidarse cuando cambian los items.
  const itemsRef = useRef<ReadonlyArray<PokemonListItem>>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Re-fetch cuando cambian los filtros o el search.
  useEffect(() => {
    let cancelled = false;
    const searchOpt = options.search ? { search: options.search } : undefined;
    void (async () => {
      try {
        const next = await applyFiltersToList(apiFilters, initialOffset, searchOpt);
        if (cancelled) return;
        setItems(next.items);
        setNextOffset(next.nextOffset);
        setTotal(next.total);
        setSingle(next.single);
        setError(null);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        const wrapped =
          err instanceof Error ? err : new Error(String(err));
        setItems([]);
        setNextOffset(null);
        setTotal(null);
        setSingle(false);
        setError(wrapped);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // `initialOffset` se aplica sólo al primer fetch; cambios
    // posteriores se manejan vía `loadMore`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, searchKey]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (nextOffset === null) return;
    setStatus("loadingMore");
    try {
      const next = await applyFiltersToList(
        apiFilters,
        nextOffset,
        options.search ? { search: options.search } : undefined,
      );
      setItems([...itemsRef.current, ...next.items]);
      setNextOffset(next.nextOffset);
      setTotal(next.total);
      setSingle(next.single);
      setError(null);
      setStatus("ready");
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      setStatus("error");
    }
  }, [apiFilters, nextOffset, options.search]);

  const refresh = useCallback(async (): Promise<void> => {
    setStatus("loading");
    setItems([]);
    setNextOffset(null);
    setTotal(null);
    setSingle(false);
    try {
      const next = await applyFiltersToList(
        apiFilters,
        initialOffset,
        options.search ? { search: options.search } : undefined,
      );
      setItems(next.items);
      setNextOffset(next.nextOffset);
      setTotal(next.total);
      setSingle(next.single);
      setStatus("ready");
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      setStatus("error");
    }
  }, [apiFilters, initialOffset, options.search]);

  return {
    status,
    items,
    nextOffset,
    total,
    single,
    error,
    loadMore,
    refresh,
  };
}

function stableKey(filters: PokemonFilters): string {
  return Object.keys(filters)
    .sort()
    .map((k) => {
      const v = filters[k as keyof PokemonFilters];
      return `${k}=${valueToString(v)}`;
    })
    .join("&");
}

function valueToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    return `${obj.value ?? ""}`;
  }
  return String(v);
}