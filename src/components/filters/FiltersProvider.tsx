"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  useFilters,
  type UseFiltersApi,
} from "@/src/hooks/useFilters";

/**
 * Plan 02.3 — Provider de filtros.
 *
 * Levanta el hook `useFilters()` (que ya sincroniza con la URL) a un
 * Context para que cualquier consumidor dentro del árbol pueda
 * acceder al mismo estado sin prop drilling. Sigue el patrón de
 * `state-context-interface`: el provider es el único lugar que conoce
 * la implementación concreta (`useFilters`).
 *
 * IMPORTANTE: el `FiltersProvider` se monta en
 * `src/app/pokedex/layout.tsx`. El acceso a `useSearchParams()`
 * fuerza una frontera `<Suspense>` en el segmento `/pokedex` para
 * permitir el prerender del resto del árbol. Ver nota del Plan 02
 * (riesgos) y `use-search-params.md` en la docs de Next.js 16.
 */

const FiltersContext = createContext<UseFiltersApi | null>(null);

export interface FiltersProviderProps {
  children: ReactNode;
}

export function FiltersProvider({ children }: FiltersProviderProps) {
  return <FiltersContextBridge>{children}</FiltersContextBridge>;
}

/**
 * Puente interno que llama a `useFilters()`. Existe separado para
 * que el provider externo pueda envolverse en `<Suspense>` sin que
 * un consumidor directo del provider tenga que hacerlo.
 */
function FiltersContextBridge({ children }: FiltersProviderProps) {
  const api = useFilters();
  const value = useMemo(() => api, [api]);
  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

/**
 * Acceso al API de filtros expuesto por `FiltersProvider`.
 * Lanza un error si se usa fuera del provider para detectar mal uso
 * lo antes posible.
 */
export function useFiltersContext(): UseFiltersApi {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error(
      "useFiltersContext debe usarse dentro de <FiltersProvider>",
    );
  }
  return ctx;
}

/**
 * Hook derivado: número de filtros activos. Útil para mostrar un
 * contador en la consola o los chips de filtros activos.
 *
 * @example
 *   const count = useActiveFiltersCount();
 *   <span>{count > 0 ? `${count} filtros` : "Sin filtros"}</span>
 */
export function useActiveFiltersCount(): number {
  return useFiltersContext().activeCount;
}