"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigation } from "@/src/hooks/useNavigation";
import { homeTransitionBus } from "@/src/components/transitions/HomeTransitionOut";

/**
 * Plan 03.5 + 04.2 — Contexto que centraliza la navegación de la pantalla
 * de inicio.
 *
 * La pantalla de inicio puede navegar a `/pokedex` desde varios
 * puntos de entrada:
 *
 *   - Pulsar Enter, Space o cualquier letra A–Z en el documento.
 *   - Click en una zona neutra del contenedor principal.
 *   - Click en el botón PRESS START (que intercepta su click y usa
 *     el orquestador de transiciones — Plan 04.1).
 *
 * Centralizamos la navegación en un único punto para:
 *
 *   1. Evitar dobles navegaciones (`isNavigating` desactiva los
 *      listeners hasta que la promesa devuelta por `router.push`
 *      termine).
 *   2. Permitir que el Plan 04 (transiciones animadas) sustituya la
 *      implementación de `navigate()` por una promesa que espera a
 *      los assets y resuelve al final del fade-out — sin tocar a
 *      los consumidores.
 *
 * El estado `isLoading` se conserva en el contexto para mantener la
 * compatibilidad con consumidores existentes, pero ya NO se usa para
 * mostrar un overlay: el borrador (líneas 317–319 del
 * `Borrador_Pokedex.md`) prohíbe el loading overlay entre la home y
 * la Pokédex porque todos los assets críticos se preloadean en el
 * primer paint. Si en el futuro queremos re-introducir un overlay
 * (p.ej. para la vista 3D), lo conectamos a un proveedor distinto.
 *
 * Plan 04.2 — coordinación con la animación de salida:
 *   - `navigate()` invoca `homeTransitionBus.playExit()` ANTES de
 *     hacer el `router.push`. Si hay un `<HomeTransitionOut>`
 *     montado (vía `HomeShell`), esto dispara la coreografía de
 *     salida + fade de música. Si NO hay nadie registrado
 *     (entornos sin `HomeShell`, tests sin provider), la promesa
 *     resuelve inmediato y la navegación es nativa.
 *
 * Inyección del router:
 *   - En producción `HomeNavigationProvider` usa `useNavigation()`
 *     (`src/hooks/useNavigation.ts`) para llegar al router de Next.
 *   - En los tests se inyecta un mock vía la prop `router` para
 *     poder espiar `push` sin mockear `next/navigation`.
 */

export const HOME_POKEDEX_PATH = "/pokedex";

export interface HomeRouterLike {
  push(url: string, options?: { scroll?: boolean }): void | Promise<void>;
}

export interface HomeNavigationContextValue {
  isNavigating: boolean;
  isLoading: boolean;
  navigate(): void;
}

const HomeNavigationContext = createContext<HomeNavigationContextValue | null>(
  null,
);

export interface HomeNavigationProviderProps {
  children: ReactNode;
  /**
   * Router inyectado. Por defecto usa `useNavigation()` para
   * producción. Los tests lo sobrescriben con un mock.
   */
  router?: HomeRouterLike;
}

export function HomeNavigationProvider({
  children,
  router,
}: HomeNavigationProviderProps) {
  if (router) {
    return (
      <HomeNavigationShell router={router}>{children}</HomeNavigationShell>
    );
  }
  return <HomeNavigationWithDefaultRouter>{children}</HomeNavigationWithDefaultRouter>;
}

function HomeNavigationWithDefaultRouter({ children }: { children: ReactNode }) {
  const { router } = useNavigation();
  return <HomeNavigationShell router={router}>{children}</HomeNavigationShell>;
}

function HomeNavigationShell({
  children,
  router,
}: {
  children: ReactNode;
  router: HomeRouterLike;
}) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Ref sincroniza el flag entre el callback (que se recrea) y los
  // listeners de keydown/click que viven en `HomeNavController`.
  const navigatingRef = useRef(false);

  const navigate = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setIsNavigating(true);
    setIsLoading(true);

    // Plan 04.2: si la pantalla de inicio tiene montado el
    // orquestador visual (`<HomeTransitionOut>`), esperamos a que la
    // animación de salida termine antes de hacer el push.
    //
    // Si NO hay nadie registrado (entornos sin `HomeShell`, tests
    // sin provider, SSR puro…), la navegación es SÍNCRONA como en
    // el Plan 03.5: preserva el comportamiento existente y mantiene
    // la firma `navigate(): void` que esperan los listeners.
    if (!homeTransitionBus.hasSubscriber()) {
      let result: void | Promise<void>;
      try {
        result = router.push(HOME_POKEDEX_PATH, { scroll: false });
      } catch (err) {
        navigatingRef.current = false;
        setIsNavigating(false);
        setIsLoading(false);
        throw err;
      }
      Promise.resolve(result).finally(() => {
        setIsLoading(false);
      });
      return;
    }

    // Camino con animación: la promesa interna maneja el push.
    void homeTransitionBus
      .playExit()
      .then(() => router.push(HOME_POKEDEX_PATH, { scroll: false }))
      .catch(() => {
        navigatingRef.current = false;
        setIsNavigating(false);
        setIsLoading(false);
      });
  }, [router]);

  const value = useMemo<HomeNavigationContextValue>(
    () => ({ isNavigating, isLoading, navigate }),
    [isNavigating, isLoading, navigate],
  );

  return (
    <HomeNavigationContext.Provider value={value}>
      {children}
    </HomeNavigationContext.Provider>
  );
}

export function useHomeNavigation(): HomeNavigationContextValue {
  const ctx = useContext(HomeNavigationContext);
  if (!ctx) {
    throw new Error(
      "useHomeNavigation debe usarse dentro de un <HomeNavigationProvider>",
    );
  }
  return ctx;
}
