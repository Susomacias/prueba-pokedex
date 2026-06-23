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
 * Estado global mínimo de la SPA: qué vista está activa.
 *
 * - "home" → pantalla de inicio (logo + Ash + slider + pokédex cerrada + botones)
 * - "pokedex" → pokédex abierta centrada con su contenido interactivo
 *
 * El árbol de la home (`/`) monta SIEMPRE ambas vistas. La pokédex
 * se pre-renderiza fuera de pantalla (`translateY(100%)`) para que,
 * al cambiar el estado, suba al centro sin glitches ni cargas
 * perceptibles (es el requisito del borrador: "creamos de forma
 * asíncrona una pokédex … con la lista precargada").
 *
 * NO usamos el router de Next.js para cambiar entre vistas: la home
 * es una SPA de una sola URL. El `/pokedex` se redirige a `/` vía
 * `next.config.ts` (cualquier marcador, enlace antiguo o refresh en
 * `/pokedex` aterriza en `/`).
 *
 * La transición musical (fade) se gestiona desde el componente que
 * dispara el cambio de vista (ver `AppShell`).
 */
export type View = "home" | "pokedex";

export interface ViewContextValue {
  view: View;
  goToHome(): void;
  goToPokedex(): void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

export interface ViewProviderProps {
  children: ReactNode;
  initial?: View;
}

export function ViewProvider({
  children,
  initial = "home",
}: ViewProviderProps) {
  const [view, setView] = useState<View>(initial);

  const goToHome = useCallback(() => setView("home"), []);
  const goToPokedex = useCallback(() => setView("pokedex"), []);

  const value = useMemo<ViewContextValue>(
    () => ({ view, goToHome, goToPokedex }),
    [view, goToHome, goToPokedex],
  );

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewContextValue {
  const ctx = useContext(ViewContext);
  if (!ctx) {
    throw new Error("useView debe usarse dentro de <ViewProvider>");
  }
  return ctx;
}
