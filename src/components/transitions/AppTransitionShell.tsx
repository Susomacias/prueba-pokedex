"use client";

import type { ReactNode } from "react";
import { useNavigation } from "@/src/hooks/useNavigation";
import {
  TransitionOrchestratorProvider,
  type OrchestratorRouterLike,
} from "@/src/components/transitions/TransitionOrchestratorContext";

/**
 * Plan 04.1 — Shell cliente de alto nivel que monta el provider del
 * orquestador con el router real de Next.js.
 *
 * Este shell existe para que las páginas (Server Components) puedan
 * seguir siendo "puras": no necesitan conocer el detalle de cómo se
 * obtiene el router. Sólo renderizan `<AppTransitionShell>` y los
 * hijos pueden llamar a `useTransitionOrchestrator()` directamente.
 *
 * `<Suspense>` es obligatorio: `useNavigation()` consume
 * `useSearchParams()` internamente, y Next 16 exige una frontera
 * Suspense para prerenderizar el segmento.
 *
 * Uso:
 *   <AppTransitionShell>
 *     <HomeShell>...</HomeShell>
 *   </AppTransitionShell>
 */
export interface AppTransitionShellProps {
  children: ReactNode;
}

export function AppTransitionShell({ children }: AppTransitionShellProps) {
  const { router } = useNavigation();
  // `useNavigation` ya devuelve un `router` con la firma que
  // necesitamos (incluye `push(url, { scroll: false })`), así que lo
  // pasamos tal cual sin adaptarlo. Mantenemos el `OrchestratorRouterLike`
  // como contrato interno para que el provider siga siendo testeable
  // con un mock plano.
  const routerLike: OrchestratorRouterLike = {
    push: (url, options) => router.push(url, options),
  };
  return (
    <TransitionOrchestratorProvider router={routerLike}>
      {children}
    </TransitionOrchestratorProvider>
  );
}