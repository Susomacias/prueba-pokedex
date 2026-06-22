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

/**
 * Plan 03.5 — Contexto que centraliza la navegación de la pantalla
 * de inicio.
 *
 * La pantalla de inicio puede navegar a `/pokedex` desde varios
 * puntos de entrada:
 *
 *   - Pulsar Enter, Space o cualquier letra A–Z en el documento.
 *   - Click en una zona neutra del contenedor principal.
 *   - Click en el botón PRESS START (que en 03.5 se renderiza como
 *     `<Link>` de Next.js para beneficiarse de prefetch).
 *
 * Centralizamos la navegación en un único punto para:
 *
 *   1. Evitar dobles navegaciones (`isNavigating` desactiva los
 *      listeners hasta que la promesa devuelta por `router.push`
 *      termine).
 *   2. Exponer el estado `isLoading` al `HomeLoadingOverlay`, que
 *      muestra el pikachu + "CARGANDO…" si la transición tarda.
 *   3. Permitir que el Plan 04 (transiciones animadas) sustituya la
 *      implementación de `navigate()` por una promesa que espera a
 *      los assets y resuelve al final del fade-out — sin tocar a
 *      los consumidores.
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

    let result: void | Promise<void>;
    try {
      result = router.push(HOME_POKEDEX_PATH, { scroll: false });
    } catch (err) {
      // Si `push` lanza síncronamente (poco probable pero posible
      // en tests con mocks parciales), reintentamos el flag para
      // que la UI no quede "atascada" en loading.
      navigatingRef.current = false;
      setIsNavigating(false);
      setIsLoading(false);
      throw err;
    }

    Promise.resolve(result).finally(() => {
      // Una vez completada la navegación:
      //   - El componente entero se habrá desmontado (la ruta
      //     `/pokedex` ocupa la pantalla), por lo que el estado
      //     interno deja de importar.
      //   - Sin embargo, si la navegación fallase o el componente
      //     no se desmontase (p. ej. error de red), sí queremos
      //     ocultar el overlay para que el usuario pueda reintentar.
      //     Para soportar este caso y mantener el flag
      //     `isNavigating` activo durante toda la vida del
      //     componente (evitando dobles navegaciones), reseteamos
      //     `isLoading` pero NO `isNavigating`.
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
