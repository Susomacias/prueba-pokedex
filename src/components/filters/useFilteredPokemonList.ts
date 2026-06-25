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
 *    tipos son compatibles 1:1, excepto `search` (Plan 07.1) que es
 *    un filtro de estado pero NO un `where`-clause del backend: se
 *    extrae y se inyecta como `options.search`.
 *  - Mantiene estado local con los items acumulados y expone
 *    `loadMore()` para pedir la siguiente página usando
 *    `nextOffset`.
 *  - Re-fetch automático cuando cambian los filtros o la búsqueda.
 *    Mismo patrón de scroll infinito acumulativo que la lista sin
 *    filtros: no hay virtualización ni ventana deslizante.
 *
 * Auto-retry (Plan 07.1):
 *  - Cuando la carga inicial falla con un error transitorio (502/504
 *    del proxy / upstream), el hook reintenta automáticamente con
 *    backoff exponencial (1s, 2s, 4s, máximo 3 intentos). Esto
 *    cubre el caso real donde la PokeAPI está temporalmente
 *    inalcanzable (p.ej. bloqueo de Cloudflare) y vuelve sola sin
 *    que el usuario tenga que recargar la página.
 *  - El hook también expone `retry()` para reintentos manuales (botón
 *    "Reintentar" en la UI).
 *
 * Notas:
 *  - El `dataRef` guarda los items acumulados entre renders para
 *    que `loadMore` pueda concatenar con la página anterior. El ref
 *    se actualiza dentro de `useEffect` (no durante render) para
 *    cumplir con las reglas de `react-hooks/refs`.
 */

export interface UseFilteredPokemonListOptions {
  /**
   * Término de búsqueda explícito. Si se pasa, tiene prioridad sobre
   * `filters.search` (útil para el buscador tipo combobox del Plan
   * 07.3 que puede querer un término transitorio sin tocar la URL).
   * Por defecto se usa `filters.search` del estado unificado.
   */
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
  /**
   * Sugerencia de espera del upstream en milisegundos cuando hay
   * error. `null` si el error no incluye `retryAfter` (o no es
   * recuperable). La UI puede mostrar un contador ("Reintentando en
   * 2:00...") y el auto-retry del hook respeta este valor como suelo
   * del backoff.
   */
  retryAfterMs: number | null;
  loadMore(): Promise<void>;
  refresh(): Promise<void>;
  /** Reintenta manualmente la carga (ignora el backoff del auto-retry). */
  retry(): void;
}

function toApiFilters(
  filters: ReturnType<typeof useFiltersContext>["filters"],
): PokemonFilters {
  // `search` vive en el estado unificado de filtros pero NO es un
  // `where`-clause del backend: se inyecta como `options.search`.
  // Se elimina aquí para que `buildPokemonWhere` no lo vea.
  const { search: _search, ...rest } = filters;
  return rest as unknown as PokemonFilters;
}

export function useFilteredPokemonList(
  initialOffset: number = 0,
  options: UseFilteredPokemonListOptions = {},
): UseFilteredPokemonListResult {
  const { filters } = useFiltersContext();
  const apiFilters = toApiFilters(filters);
  const filterKey = stableKey(apiFilters);
  // `options.search` (explícito) tiene prioridad sobre `filters.search`
  // (estado unificado de la URL). El buscador combobox (Plan 07.3)
  // puede pasar un término transitorio; la consola (Plan 07.1) escribe
  // en `filters.search` y lo lee aquí.
  const resolvedSearch =
    options.search !== undefined ? options.search : filters.search;
  const searchKey = resolvedSearch ?? "";

  // Refs estables sobre los args de fetch. Sin ellos, `doFetch` se
  // recrearía en cada render (el `filters` del Context cambia de
  // referencia cuando se actualiza la URL aunque los valores sean
  // iguales) y dispararía el `useEffect` de fetch en bucle.
  const apiFiltersRef = useRef(apiFilters);
  const resolvedSearchRef = useRef(resolvedSearch);
  useEffect(() => {
    apiFiltersRef.current = apiFilters;
  }, [apiFilters]);
  useEffect(() => {
    resolvedSearchRef.current = resolvedSearch;
  }, [resolvedSearch]);

  const [items, setItems] = useState<ReadonlyArray<PokemonListItem>>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [single, setSingle] = useState<boolean>(false);
  const [status, setStatus] = useState<UseFilteredPokemonListStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  /**
   * Nonce de reintentos manuales. NO se incluye en el efecto de
   * fetch por filtros (así un cambio de filtros reinicia la
   * cuenta automáticamente, sin necesidad de un `useEffect`
   * adicional que dispararía el lint `react-hooks/set-state-in-effect`).
   */
  const [retryNonce, setRetryNonce] = useState(0);

  // Sincroniza un ref con `items` para que `loadMore` (estable) pueda
  // leer el valor actual sin invalidarse cuando cambian los items.
  const itemsRef = useRef<ReadonlyArray<PokemonListItem>>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /**
   * Función de fetch reutilizable. NO se mete en `useCallback` con
   * dependencias para evitar que se recreen en cada render y
   * disparen el `useEffect` de fetch en bucle. Lee siempre de los
   * refs (`apiFiltersRef.current`, `resolvedSearchRef.current`,
   * `initialOffsetRef.current`).
   */
  const initialOffsetRef = useRef(initialOffset);
  useEffect(() => {
    initialOffsetRef.current = initialOffset;
  }, [initialOffset]);
  const doFetch = useCallback(async (): Promise<void> => {
    const searchOpt =
      resolvedSearchRef.current && resolvedSearchRef.current.length > 0
        ? { search: resolvedSearchRef.current }
        : undefined;
    try {
      const next = await applyFiltersToList(
        apiFiltersRef.current,
        initialOffsetRef.current,
        searchOpt,
      );
      setItems(next.items);
      setNextOffset(next.nextOffset);
      setTotal(next.total);
      setSingle(next.single);
      setError(null);
      setStatus("ready");
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setItems([]);
      setNextOffset(null);
      setTotal(null);
      setSingle(false);
      setError(wrapped);
      setStatus("error");
    }
  }, []);

  // Re-fetch cuando cambian los filtros o el search. `retryNonce` NO
  // es dependencia: la lógica de retry usa su propio `useEffect`
  // (más abajo) para evitar re-fetches redundantes cuando el usuario
  // pulsa "Reintentar" sin cambiar filtros.
  useEffect(() => {
    void doFetch();
  }, [doFetch, filterKey, searchKey]);

  /**
   * Auto-retry cuando el error es claramente transitorio (502/504 del
   * proxy / upstream, Network error). Reintenta hasta 3 veces con
   * backoff exponencial (1s, 2s, 4s), respetando siempre el
   * `retryAfterMs` que pueda sugerir el upstream (Cloudflare suele
   * pedir 60-120 s en errores 5xx). El nonce (`retryNonce`) fuerza
   * la re-ejecución cuando el usuario pulsa "Reintentar" desde la UI.
   *
   * NO reintenta errores lógicos (4xx con `GraphQLError`, etc.).
   *
   * REGRESIÓN: antes de este fix, el backoff era fijo 1s/2s/4s y
   * reintentaba contra un upstream que estaba bloqueando activamente
   * (Cloudflare 521) → 3× 502 encadenados y mensaje críptico
   * "PokeAPI GraphQL request failed: 502 Bad Gateway".
   */
  useEffect(() => {
    if (status !== "error" || !error) return;
    const retryAfterMs = extractRetryAfterMs(error);
    const isTransient = isTransientError(error, retryAfterMs);
    if (!isTransient) return;
    if (retryNonce >= 3) return;
    const expBackoff = Math.min(1000 * 2 ** retryNonce, 8000);
    // El suelo es lo que pida el upstream (Cloudflare); si no pide
    // nada, usamos el backoff exponencial clásico.
    const delay = retryAfterMs !== null && retryAfterMs > expBackoff
      ? retryAfterMs
      : expBackoff;
    const timer = setTimeout(() => {
      setRetryNonce((n) => n + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [status, error, retryNonce]);

  /**
   * Re-fetch disparado por `retryNonce > 0` (auto-retry o botón
   * manual). Usa la misma `doFetch` pero no aparece en las
   * dependencias de los filtros, así un cambio de filtro puede
   * "competir" con un retry en vuelo sin causar re-renders infinitos.
   */
  useEffect(() => {
    if (retryNonce === 0) return;
    void doFetch();
  }, [doFetch, retryNonce]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (nextOffset === null) return;
    setStatus("loadingMore");
    try {
      const next = await applyFiltersToList(
        apiFiltersRef.current,
        nextOffset,
        resolvedSearchRef.current &&
          resolvedSearchRef.current.length > 0
          ? { search: resolvedSearchRef.current }
          : undefined,
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
  }, [nextOffset]);

  const refresh = useCallback(async (): Promise<void> => {
    setStatus("loading");
    setItems([]);
    setNextOffset(null);
    setTotal(null);
    setSingle(false);
    try {
      const next = await applyFiltersToList(
        apiFiltersRef.current,
        initialOffsetRef.current,
        resolvedSearchRef.current &&
          resolvedSearchRef.current.length > 0
          ? { search: resolvedSearchRef.current }
          : undefined,
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
  }, []);

  // Memo del retry para que la referencia sea estable mientras el
  // `retryNonce` no cambie.
  const retry = useCallback((): void => {
    setRetryNonce((n) => n + 1);
  }, []);

  return {
    status,
    items,
    nextOffset,
    total,
    single,
    error,
    retryAfterMs: status === "error" && error
      ? extractRetryAfterMs(error)
      : null,
    loadMore,
    refresh,
    retry,
  };
}

/**
 * Lee el `retryAfterMs` que `GraphQLUpstreamError` adjunta al Error.
 * La asignación a una propiedad custom es no-tipada en TS, así que
 * usamos `unknown` y validamos. Devuelve `null` si no está presente o
 * no es un número finito >= 0.
 */
function extractRetryAfterMs(err: Error): number | null {
  const v = (err as Error & { retryAfterMs?: unknown }).retryAfterMs;
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    return v;
  }
  return null;
}

/**
 * ¿Es el error transitorio (merece la pena reintentar)? Misma
 * heurística que la política de Next.js Data Cache más el contrato
 * que `request()` / `GraphQLUpstreamError` cumplen:
 *  - Cualquier error con `retryAfterMs` es por definición transitorio
 *    (el upstream lo sugiere).
 *  - Mensajes típicos: "Network error", "Failed to fetch", 502, 504,
 *    408, 429.
 */
function isTransientError(
  err: Error,
  retryAfterMs: number | null,
): boolean {
  if (retryAfterMs !== null) return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("408") ||
    msg.includes("429") ||
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("econnrefused")
  );
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
