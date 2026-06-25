"use client";

import { useEffect, useSyncExternalStore, useMemo } from "react";
import type {
  AvailableFilterValues,
  PokemonFilterFields,
} from "@/src/lib/pokemon/fetchFilterAvailability";
import {
  computeAvailableFilterValues,
  isBucketAvailable,
} from "@/src/lib/pokemon/fetchFilterAvailability";
import type { FilterKey, Filters } from "@/src/lib/filters/types";
import type { FilterBucket, PokemonFilters } from "@/src/lib/types/pokemon";

type CacheStatus = "loading" | "ready" | "error";

interface CacheEntry {
  status: CacheStatus;
  data: ReadonlyArray<PokemonFilterFields> | null;
  error: Error | null;
}

let cache: CacheEntry = { status: "loading", data: null, error: null };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): CacheEntry {
  return cache;
}

function getServerSnapshot(): CacheEntry {
  return SERVER_SNAPSHOT;
}

const SERVER_SNAPSHOT: CacheEntry = Object.freeze({
  status: "loading" as const,
  data: null,
  error: null,
}) as CacheEntry;

async function load(): Promise<void> {
  try {
    const { fetchAllPokemonFilterFields } = await import(
      "@/src/lib/pokemon/cachedPokemonApi"
    );
    const data = await fetchAllPokemonFilterFields();
    if (cache.status === "ready") return;
    cache = { status: "ready", data, error: null };
  } catch (err) {
    if (cache.status === "ready") return;
    cache = {
      status: "error",
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  } finally {
    for (const fn of listeners) fn();
  }
}

function ensureLoaded(): void {
  if (cache.status !== "loading") return;
  cache = { status: "loading", data: null, error: null };
  void load();
}

function toPokemonFilters(filters: Filters): PokemonFilters {
  const result: Record<string, unknown> = { ...filters };
  delete result.search;
  return result as unknown as PokemonFilters;
}

export interface FilterAvailabilityResult {
  status: CacheStatus;
  error: Error | null;
  isAvailable(key: FilterKey, value: string): boolean;
  isBucketAvailableForRange(bucket: FilterBucket, key: "height" | "weight"): boolean;
}

export function useFilterAvailability(
  filters: Filters,
): FilterAvailabilityResult {
  const entry = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureLoaded();
  }, []);

  const apiFilters = useMemo(() => toPokemonFilters(filters), [filters]);

  const availability = useMemo<AvailableFilterValues | null>(() => {
    if (!entry.data) return null;
    return computeAvailableFilterValues(entry.data, apiFilters);
  }, [entry.data, apiFilters]);

  const activeCount = useMemo(
    () => Object.keys(apiFilters).length,
    [apiFilters],
  );

  return useMemo<FilterAvailabilityResult>(() => {
    if (activeCount === 0 || !availability) {
      return {
        status: entry.status,
        error: entry.error,
        isAvailable: () => true,
        isBucketAvailableForRange: () => true,
      };
    }

    return {
      status: entry.status,
      error: entry.error,
      isAvailable(key: FilterKey, value: string): boolean {
        switch (key) {
          case "type1":
            return availability.type1.has(value);
          case "type2":
            return availability.type2.has(value);
          case "generation":
            return availability.generation.has(value);
          case "color":
            return availability.color.has(value);
          case "habitat":
            return availability.habitat.has(value);
          case "ability":
            return availability.ability.has(value);
          case "height":
            return isBucketAvailable(
              { value, label: "", min: 0, max: 0 },
              availability.heightRange,
            );
          case "weight":
            return isBucketAvailable(
              { value, label: "", min: 0, max: 0 },
              availability.weightRange,
            );
          default:
            return true;
        }
      },
      isBucketAvailableForRange(
        bucket: FilterBucket,
        key: "height" | "weight",
      ): boolean {
        const range =
          key === "height"
            ? availability.heightRange
            : availability.weightRange;
        return isBucketAvailable(bucket, range);
      },
    };
  }, [availability, activeCount, entry.status, entry.error]);
}

/** Reset de caché. Sólo para tests. @internal */
export function __resetFilterAvailabilityCache(): void {
  cache = { status: "loading", data: null, error: null };
  listeners.clear();
}
