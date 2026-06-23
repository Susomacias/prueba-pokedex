"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAppShell } from "@/src/components/app/ViewContext";

/**
 * Plan 05.3 + 05.4 + Plan 02 (routing ligero) — Provider de estado
 * de la Pokédex.
 *
 * Mantiene el estado que el shell necesita (modo 3D, modo
 * stats/abilities, filtros activos) y lo expone vía Context al
 * `PokedexShell`. La razón de usar Context y no props es que las
 * páginas son Server Components y no pueden pasar callbacks o
 * estado mutable al shell (Client Component) directamente.
 *
 * **selectedName** se deriva del `pathname` del `AppShellProvider`
 * (Plan 02 + Plan 08.2):
 *
 *   - pathname = `/`                   → selectedName = null
 *   - pathname = `/pokedex`            → selectedName = null
 *   - pathname = `/pokemon/pikachu`    → selectedName = "pikachu"
 *   - pathname = `/pokemon/mr-mime`    → selectedName = "mr-mime"
 *
 * Para cambiar el pokemon seleccionado el consumidor debe llamar a
 * `useAppShell().goToPokemon("<name>")` (lo hace `PokemonList` al
 * pulsar una card y `EvolutionsSlot` al pulsar una evolución).
 * NO hay setter local: el estado vive en la URL.
 *
 * El resto de campos siguen siendo `useState` locales con defaults
 * sensatos; en planes futuros se sustituirán por hooks específicos:
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
  setMode3D(active: boolean): void;
  setHas3DModel(has: boolean): void;
  setToggleStatsAbilities(mode: "stats" | "abilities"): void;
  setFiltersActive(active: boolean): void;
  reset(): void;
}

const PokedexPageContext = createContext<PokedexPageApi | null>(null);

/**
 * Regex que captura el nombre del pokemon en `/pokemon/<name>`.
 * El nombre puede contener letras, números y guiones (los nombres de
 * PokeAPI usan guiones: `mr-mime`, `nidoran-m`, etc.). No captura
 * `?query` ni `#hash`.
 */
const POKEMON_DETAIL_RE = /^\/pokemon\/([^/?#]+)/;

function deriveSelectedName(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = POKEMON_DETAIL_RE.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export interface PokedexPageProviderProps {
  children: ReactNode;
}

export function PokedexPageProvider({ children }: PokedexPageProviderProps) {
  const { pathname } = useAppShell();
  const selectedName = deriveSelectedName(pathname);

  // Estado mutable: 3D, stats/abilities, filtros. Vive en memoria
  // porque NO debe reflejarse en la URL: son toggles puramente
  // visuales de la sesión.
  const [mode3D, setMode3D] = useState(false);
  const [has3DModel, setHas3DModel] = useState(false);
  const [toggleStatsAbilities, setToggleStatsAbilities] =
    useState<"stats" | "abilities">("stats");
  const [filtersActive, setFiltersActive] = useState(false);

  const reset = useCallback(() => {
    setMode3D(false);
    setHas3DModel(false);
    setToggleStatsAbilities("stats");
    setFiltersActive(false);
  }, []);

  const value = useMemo<PokedexPageApi>(
    () => ({
      selectedName,
      mode3D,
      has3DModel,
      toggleStatsAbilities,
      filtersActive,
      setMode3D,
      setHas3DModel,
      setToggleStatsAbilities,
      setFiltersActive,
      reset,
    }),
    [
      selectedName,
      mode3D,
      has3DModel,
      toggleStatsAbilities,
      filtersActive,
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
    throw new Error("usePokedexPage debe usarse dentro de <PokedexPageProvider>");
  }
  return ctx;
}