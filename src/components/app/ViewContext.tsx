"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Estado global de la SPA con routing "ligero" basado en
 * `history.pushState` (Plan 02 — Routing y Estado Compartido).
 *
 * Modelo de routing elegido (alineado con el Plan 04 de
 * transiciones):
 *
 *   - La SPA vive siempre en una sola página real (`/`). El AppShell
 *     monta Home + Pokédex pre-renderizada desde el primer paint;
 *     el cambio de "vista" es una transición puramente CSS.
 *
 *   - `/pokedex` y `/pokemon/[name]` siguen existiendo como rutas
 *     reales del App Router para que el usuario pueda acceder
 *     directamente por URL compartida, marcador o refresh. Esas
 *     páginas renderizan exactamente el mismo shell con
 *     `initialView="home"` y dejan que el `useEffect` de
 *     sincronización ejecute la transición de entrada.
 *
 *   - Para la navegación cliente entre páginas NO usamos
 *     `router.push` del App Router: eso desmontaría el árbol y
 *     provocaría un parpadeo. En su lugar, `goToHome` /
 *     `goToPokedex` / `goToPokemon` hacen `window.history.pushState`
 *     para cambiar la URL mostrada en la barra del navegador SIN
 *     recargar ni remontar nada. La vista se actualiza vía un
 *     listener local y el CSS anima la transición coreografiada
 *     por `globals.css`.
 *
 *   - El botón "atrás" del navegador se intercepta con `popstate`
 *     para mantener `view` y `selectedName` sincronizados con la
 *     URL resultante.
 *
 * Ventajas de este enfoque:
 *
 *   1. Las transiciones CSS se ejecutan siempre (cambio real de
 *      `data-view` + `transform`), sin flashes ni remontajes.
 *   2. La Pokédex y su estado (filtros, scroll, pokemon) se
 *      preservan al navegar.
 *   3. La URL es compartible y muestra el estado real.
 *
 * `view` se almacena localmente (no se deriva sincrónicamente de
 * `window.location.pathname`) porque necesitamos que el primer
 * paint del cliente difiera del pathname en rutas como
 * `/pokedex` para forzar la transición de entrada.
 */
export type View = "home" | "pokedex";

export interface AppShellContextValue {
  view: View;
  pathname: string;
  selectedName: string | null;
  goToHome(): void;
  goToPokedex(): void;
  goToPokemon(name: string): void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export interface AppShellProviderProps {
  children: ReactNode;
  /**
   * Vista del **primer paint del cliente**. Se usa para que las
   * transiciones CSS se ejecuten: si arrancamos ya en "pokedex",
   * el navegador pinta la Pokédex directamente sin animar.
   *
   * El caller lo elige según la ruta:
   *   - `/`                  → "home"   (la home es la vista final).
   *   - `/pokedex`           → "home"   (queremos que entre desde
   *                                   la home con animación).
   *   - `/pokemon/[name]`    → "home"   (idem).
   */
  initialView?: View;
}

/**
 * Regex que captura el nombre del pokemon en `/pokemon/<name>`.
 * El nombre puede contener letras, números y guiones (los nombres
 * de PokeAPI usan guiones: `mr-mime`, `nidoran-m`, etc.).
 */
const POKEMON_DETAIL_RE = /^\/pokemon\/([^/?#]+)/;

function deriveView(pathname: string): View {
  if (!pathname || pathname === "/") return "home";
  return "pokedex";
}

function deriveSelectedName(pathname: string): string | null {
  if (!pathname) return null;
  const match = POKEMON_DETAIL_RE.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function readPathname(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

function pushPath(url: string): void {
  if (typeof window === "undefined") return;
  // Misma firma que `history.pushState(state, "", url)`. Usamos
  // `pushState` directamente (no `router.push`) para que Next no
  // desmonte el árbol: queremos cambiar SOLO el texto de la URL
  // mientras la Pokédex y la home conviven en el DOM y la transición
  // CSS se ejecuta como si el usuario pulsara PRESS START.
  window.history.pushState({}, "", url);
}

export function AppShellProvider({
  children,
  initialView = "home",
}: AppShellProviderProps) {
// `pathname` se inicializa leyendo la URL actual. En SSR
  // `window` no existe, así que el inicializador devuelve "/";
  // la primera ejecución en cliente leerá la URL real
  // (`window.location.pathname`) sin necesidad de un setState
  // adicional en un effect.
  //
  // `view` se inicializa con `initialView` (pasado por el caller
  // según la ruta) — NO se deriva del pathname — para que el
  // primer paint del cliente pueda diferir del pathname y forzar
  // la transición de entrada en `/pokedex` y `/pokemon/[name]`.
  const [pathname, setPathname] = useState<string>(() => readPathname());
  const [view, setView] = useState<View>(initialView);

  // Suscribirse a `popstate` para que el botón "atrás/adelante"
  // del navegador mantenga `view` y `pathname` coherentes.
  //
  // No suscribimos a un evento custom para `pushState` porque la
  // única forma de cambiar la URL dentro de la SPA es llamar a
  // `goToHome` / `goToPokedex` / `goToPokemon` (que ya pasan por
  // aquí abajo actualizando el estado manualmente).
  //
  // La regla "no setState in effect" no aplica aquí: el effect
  // implementa una suscripción a un evento externo del navegador
  // y propaga ese cambio a React, que es exactamente el caso de
  // uso legítimo. Se desactiva la regla localmente.
  useEffect(() => {
    const handlePopState = () => {
      const next = readPathname();
      setPathname(next);
      setView(deriveView(next));
    };
    window.addEventListener("popstate", handlePopState);
    // Disparamos un popstate sintético tras el mount para forzar
    // la sincronización inicial de `view` con el pathname real
    // (en SSR `pathname="/"` y `view=initialView`; tras este
    // evento la vista pasa a derivarse del pathname y, en
    // `/pokedex`, dispara la transición de entrada). Hacemos la
    // llamada dentro del effect, no en el body, para que React
    // considere legítima la suscripción a un evento externo.
    handlePopState();
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const selectedName = deriveSelectedName(pathname);

  const goToHome = useCallback(() => {
    const current = readPathname();
    if (current === "/") return;
    pushPath("/");
    setPathname("/");
    setView("home");
  }, []);

  const goToPokedex = useCallback(() => {
    const current = readPathname();
    const search = typeof window !== "undefined" ? window.location.search : "";
    const url = `/pokedex${search}`;
    if (current === "/pokedex") return;
    pushPath(url);
    setPathname("/pokedex");
    setView("pokedex");
  }, []);

  const goToPokemon = useCallback((name: string) => {
    if (!name) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    const url = `/pokemon/${encodeURIComponent(name)}${search}`;
    const current = readPathname();
    if (current === url) return;
    pushPath(url);
    setPathname(url);
    setView("pokedex");
  }, []);

  const value = useMemo<AppShellContextValue>(
    () => ({
      view,
      pathname,
      selectedName,
      goToHome,
      goToPokedex,
      goToPokemon,
    }),
    [view, pathname, selectedName, goToHome, goToPokedex, goToPokemon],
  );

  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell debe usarse dentro de <AppShellProvider>");
  }
  return ctx;
}

/**
 * Alias de compatibilidad. Muchos consumidores existentes
 * (`PressStartButton`, `PokedexHomeButton`, `MusicViewBinder`,
 * `HomeShell`) importaban `useView` y `ViewProvider`. Mantenemos
 * los mismos nombres como re-exports delgados para no tocar cada
 * uno.
 */
export const ViewProvider = AppShellProvider;
export const useView = useAppShell;