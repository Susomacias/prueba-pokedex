"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Plan 05.3 + 05.4 — Provider de estado de la página `/pokedex`.
 *
 * Mantiene el estado mínimo que el shell necesita (pokemon
 * seleccionado, modo 3D, modo stats/abilities, filtros activos) y lo
 * expone vía Context al `PokedexShell`. La razón de usar Context y no
 * props es que `/pokedex/page.tsx` es un Server Component y no puede
 * pasar callbacks o estado mutable al shell (Client Component)
 * directamente.
 *
 * En esta fase todos los valores son `useState` locales con defaults
 * sensatos. En las fases 06–09 se sustituirán por:
 *   - `selectedName` → derivado de la URL (`/pokemon/[name]`)
 *   - `mode3D` → estado interno del componente 3D (Plan 09)
 *   - `toggleStatsAbilities` → toggle local del shell (Plan 08)
 *   - `filtersActive` → derivado de `useActiveFiltersCount()` (Plan 07)
 *   - `has3DModel` → derivado del detalle del pokemon (Plan 09)
 *
 * El estado se expone como "valor + setters" siguiendo el patrón
 * `state-context-interface` (ver skill vercel-composition-patterns).
 */

export interface PokedexPageState {
  selectedName: string | null;
  mode3D: boolean;
  has3DModel: boolean;
  toggleStatsAbilities: "stats" | "abilities";
  filtersActive: boolean;
}

export interface PokedexPageApi extends PokedexPageState {
  setSelectedName(name: string | null): void;
  setMode3D(active: boolean): void;
  setHas3DModel(has: boolean): void;
  setToggleStatsAbilities(mode: "stats" | "abilities"): void;
  setFiltersActive(active: boolean): void;
  reset(): void;
}

const PokedexPageContext = createContext<PokedexPageApi | null>(null);

const DEFAULTS: PokedexPageState = {
  selectedName: null,
  mode3D: false,
  has3DModel: false,
  toggleStatsAbilities: "stats",
  filtersActive: false,
};

export interface PokedexPageProviderProps {
  children: ReactNode;
}

export function PokedexPageProvider({ children }: PokedexPageProviderProps) {
  const [state, setState] = useState<PokedexPageState>(DEFAULTS);

  const setSelectedName = useCallback((name: string | null) => {
    setState((prev) => ({ ...prev, selectedName: name }));
  }, []);
  const setMode3D = useCallback((active: boolean) => {
    setState((prev) => ({ ...prev, mode3D: active }));
  }, []);
  const setHas3DModel = useCallback((has: boolean) => {
    setState((prev) => ({ ...prev, has3DModel: has }));
  }, []);
  const setToggleStatsAbilities = useCallback(
    (mode: "stats" | "abilities") => {
      setState((prev) => ({ ...prev, toggleStatsAbilities: mode }));
    },
    [],
  );
  const setFiltersActive = useCallback((active: boolean) => {
    setState((prev) => ({ ...prev, filtersActive: active }));
  }, []);
  const reset = useCallback(() => {
    setState(DEFAULTS);
  }, []);

  const value = useMemo<PokedexPageApi>(
    () => ({
      ...state,
      setSelectedName,
      setMode3D,
      setHas3DModel,
      setToggleStatsAbilities,
      setFiltersActive,
      reset,
    }),
    [
      state,
      setSelectedName,
      setMode3D,
      setHas3DModel,
      setToggleStatsAbilities,
      setFiltersActive,
      reset,
    ],
  );

  return (
    <PokedexPageContext.Provider value={value}>
      {children}
    </PokedexPageContext.Provider>
  );
}

/**
 * Acceso al API del provider. Lanza error si se usa fuera del árbol
 * para detectar mal uso temprano.
 */
export function usePokedexPage(): PokedexPageApi {
  const ctx = useContext(PokedexPageContext);
  if (!ctx) {
    throw new Error(
      "usePokedexPage debe usarse dentro de <PokedexPageProvider>",
    );
  }
  return ctx;
}
