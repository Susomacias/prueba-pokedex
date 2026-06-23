"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  fetchAbilityOptions,
  fetchColorOptions,
  fetchGenerationOptions,
  fetchHabitatOptions,
  fetchHeightBuckets,
  fetchTypeOptions,
  fetchWeightBuckets,
} from "@/src/lib/pokemon/cachedPokemonApi";
import type { FilterBucket, FilterOption } from "@/src/lib/types/pokemon";

/**
 * Plan 02.3 — Carga de opciones de un filtro bajo demanda.
 *
 * Implementa una caché en cliente (Map a nivel de módulo) de modo que
 * dos consumidores que pidan la misma `key` sólo disparan un fetch.
 * La notificación a suscriptores se hace con `useSyncExternalStore`,
 * que es el camino canónico en React 19 para sincronizar con un
 * store externo y evita lecturas/escrituras de refs durante el
 * render.
 *
 * Soporta los filtros con opciones remotas (`type`, `generation`,
 * `color`, `habitat`, `ability`) y los buckets estáticos (`height`,
 * `weight`).
 */

export type FilterOptionKey =
  | "type"
  | "generation"
  | "color"
  | "habitat"
  | "ability"
  | "height"
  | "weight";

export type FilterOptionOrBucket = FilterOption | FilterBucket;

export type UseFilterOptionsStatus = "loading" | "ready" | "error";

export interface UseFilterOptionsResult {
  status: UseFilterOptionsStatus;
  options: ReadonlyArray<FilterOptionOrBucket>;
  error: Error | null;
}

type CacheEntry = {
  status: UseFilterOptionsStatus;
  options: ReadonlyArray<FilterOptionOrBucket>;
  error: Error | null;
};

const cache: Map<FilterOptionKey, CacheEntry> = new Map();
const listeners: Map<FilterOptionKey, Set<() => void>> = new Map();

function getListeners(key: FilterOptionKey): Set<() => void> {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
}

function getOrInit(key: FilterOptionKey): CacheEntry {
  const existing = cache.get(key);
  if (existing) return existing;
  const fresh: CacheEntry = {
    status: "loading",
    options: [],
    error: null,
  };
  cache.set(key, fresh);
  void load(key, fresh);
  return fresh;
}

function setEntry(key: FilterOptionKey, patch: Partial<CacheEntry>): void {
  const prev = cache.get(key);
  if (!prev) return;
  const next: CacheEntry = { ...prev, ...patch };
  cache.set(key, next);
  for (const fn of getListeners(key)) fn();
}

async function load(key: FilterOptionKey, entry: CacheEntry): Promise<void> {
  try {
    const options = await fetchOptionsFor(key);
    if (cache.get(key) !== entry) return;
    setEntry(key, { status: "ready", options, error: null });
  } catch (err) {
    if (cache.get(key) !== entry) return;
    const error = err instanceof Error ? err : new Error(String(err));
    setEntry(key, { status: "error", error });
  }
}

async function fetchOptionsFor(
  key: FilterOptionKey,
): Promise<ReadonlyArray<FilterOptionOrBucket>> {
  switch (key) {
    case "type":
      return fetchTypeOptions();
    case "generation":
      return fetchGenerationOptions();
    case "color":
      return fetchColorOptions();
    case "habitat":
      return fetchHabitatOptions();
    case "ability":
      return fetchAbilityOptions();
    case "height":
      return fetchHeightBuckets();
    case "weight":
      return fetchWeightBuckets();
  }
}

function subscribe(key: FilterOptionKey, listener: () => void): () => void {
  const set = getListeners(key);
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

function getSnapshot(key: FilterOptionKey): CacheEntry {
  return getOrInit(key);
}

function getServerSnapshot(): CacheEntry {
  return SERVER_SNAPSHOT;
}

/**
 * Snapshot cacheado a nivel de módulo para SSR. `useSyncExternalStore`
 * exige que `getServerSnapshot` devuelva **siempre la misma referencia**
 * mientras el servidor renderiza; crear un objeto nuevo en cada llamada
 * dispara el warning
 * "The result of getServerSnapshot should be cached to avoid an infinite loop"
 * y, peor, provoca un bucle de re-render en el servidor.
 */
const SERVER_SNAPSHOT: CacheEntry = Object.freeze({
  status: "loading",
  options: Object.freeze([]),
  error: null,
}) as CacheEntry;

export function useFilterOptions(
  key: FilterOptionKey,
): UseFilterOptionsResult {
  const entry = useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => getSnapshot(key),
    getServerSnapshot,
  );

  useEffect(() => {
    getOrInit(key);
  }, [key]);

  return {
    status: entry.status,
    options: entry.options,
    error: entry.error,
  };
}

/**
 * Reset de caché. Pensado sólo para tests.
 * @internal
 */
export function __resetFilterOptionsCache(): void {
  cache.clear();
  listeners.clear();
}