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
import {
  getHomePreloadSources,
  getPokedexPreloadSources,
  preloadSources,
} from "@/src/components/transitions/assetPreloader";

/**
 * Plan 04.1 — Orquestador de transiciones animadas entre la pantalla
 * de inicio y la Pokédex.
 *
 * Responsabilidades:
 *
 *   1. Exponer `transitionTo(target)` que coordina los pasos:
 *      (a) espera a que los assets del destino estén cargados,
 *      (b) hace `router.push(target.path)` con `{ scroll: false }`,
 *      (c) devuelve una promesa que resuelve al COMPLETAR (b).
 *      El caller (Plan 04.2 / 04.3) puede esperar a esa promesa
 *      para coordinar la coreografía de animaciones: ejecutar
 *      fade-out de música, animar elementos, etc., y dejar la
 *      navegación para el FINAL de la transición.
 *
 *   2. Bloquear dobles invocaciones concurrentes (`isTransitioning`).
 *      Mientras una transición está en curso, una segunda llamada a
 *      `transitionTo` es no-op (no llama a preload ni a push).
 *
 *   3. Exponer el flag `isTransitioning` para que la UI pueda:
 *      - deshabilitar listeners (HomeNavController ya lo lee del
 *        HomeNavigationContext — este orquestador es paralelo y se
 *        complementa vía `HomeShell`).
 *      - mostrar el overlay de carga si la precarga tarda.
 *
 * Diseño:
 *   - El provider SIEMPRE recibe un router inyectado. Esto desacopla
 *     el orquestador de `next/navigation` y permite tests sin mockear
 *     módulos globales. En producción, un shell de alto nivel
 *     (`AppTransitionShell`) lo monta con `useNavigation()`.
 *   - El target es `'pokedex' | 'home'`. Las URLs se mantienen
 *     centralizadas en este módulo para evitar que el resto del
 *     código tenga que hardcodearlas.
 *   - El orquestador NO ejecuta las animaciones. Eso lo hace cada
 *     página que conoce sus propios elementos (logo, ash, slider,
 *     carcasa, etc.). El orquestador es el "semáforo": garantiza
 *     que la navegación se hace al final y que no hay colisiones.
 */

export type TransitionTarget = "pokedex" | "home";

export const TRANSITION_PATHS: Record<TransitionTarget, string> = {
  pokedex: "/pokedex",
  home: "/",
};

export interface OrchestratorRouterLike {
  push(url: string, options?: { scroll?: boolean }): void | Promise<void>;
}

export interface TransitionOrchestratorState {
  isTransitioning: boolean;
  transitionTo(target: TransitionTarget): Promise<void>;
}

const TransitionOrchestratorContext =
  createContext<TransitionOrchestratorState | null>(null);

export interface TransitionOrchestratorProviderProps {
  children: ReactNode;
  router: OrchestratorRouterLike;
}

export function TransitionOrchestratorProvider({
  children,
  router,
}: TransitionOrchestratorProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Ref que sincroniza el flag con los callbacks/listeners que se
  // crean en cada render pero NO queremos re-bindear.
  const inFlightRef = useRef(false);

  const transitionTo = useCallback(
    async (target: TransitionTarget): Promise<void> => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsTransitioning(true);

      try {
        const sources =
          target === "home"
            ? getHomePreloadSources()
            : getPokedexPreloadSources();
        await preloadSources(sources);
        await router.push(TRANSITION_PATHS[target], { scroll: false });
      } finally {
        // Reseteamos el flag AL FINAL incluso si push() lanza (así
        // la UI puede reintentar). El componente que reciba el push
        // ya estará desmontado en el caso normal; en el caso de
        // error (red, etc.) permitimos reintentos.
        inFlightRef.current = false;
        setIsTransitioning(false);
      }
    },
    [router],
  );

  const value = useMemo<TransitionOrchestratorState>(
    () => ({ isTransitioning, transitionTo }),
    [isTransitioning, transitionTo],
  );

  return (
    <TransitionOrchestratorContext.Provider value={value}>
      {children}
    </TransitionOrchestratorContext.Provider>
  );
}

export function useTransitionOrchestrator(): TransitionOrchestratorState {
  const ctx = useContext(TransitionOrchestratorContext);
  if (!ctx) {
    throw new Error(
      "useTransitionOrchestrator debe usarse dentro de <TransitionOrchestratorProvider>",
    );
  }
  return ctx;
}

/**
 * Variante "segura" del hook: si no hay provider en el árbol,
 * devuelve un objeto con `isTransitioning: false` y un `transitionTo`
 * que es no-op (no navega, no hace preload). Útil para componentes
 * que pueden montarse tanto dentro como fuera del provider
 * (típicamente: el botón PRESS START en tests de aislamiento).
 *
 * El comportamiento por defecto (sin provider) sigue siendo
 * "navegación nativa" porque `transitionTo` no llama al router:
 * el `<Link>` se ocupa de hacer su navegación por defecto.
 */
export const NOOP_TRANSITION: (target: TransitionTarget) => Promise<void> = () =>
  Promise.resolve();

const NOOP_STATE: TransitionOrchestratorState = {
  isTransitioning: false,
  transitionTo: NOOP_TRANSITION,
};

export function useOptionalTransitionOrchestrator(): TransitionOrchestratorState {
  const ctx = useContext(TransitionOrchestratorContext);
  return ctx ?? NOOP_STATE;
}

/**
 * Helper que devuelve `true` cuando hay un orquestador REAL en el
 * árbol (no el no-op por defecto). Útil para que componentes como
 * `PressStartButton` decidan si deben interceptar el click o dejar
 * que el `<Link>` navegue de forma nativa.
 */
export function useHasTransitionOrchestrator(): boolean {
  const ctx = useContext(TransitionOrchestratorContext);
  return ctx !== null;
}