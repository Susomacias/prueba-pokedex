"use client";

import { Suspense, type ReactNode } from "react";
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
 * Suspense para prerenderizar el segmento estático.
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
  return (
    <Suspense fallback={children}>
      <AppTransitionShellInner>{children}</AppTransitionShellInner>
    </Suspense>
  );
}

function AppTransitionShellInner({ children }: { children: ReactNode }) {
  const { router } = useNavigation();
  // `useNavigation` ya devuelve un `router` con `push(url)` que
  // respeta `scroll: false` (lo configuramos en el adaptador). Lo
  // envolvemos en el tipo del orquestador para que el provider no
  // dependa de `next/navigation`.
  const routerLike: OrchestratorRouterLike = {
    push: (url) => router.push(url),
  };
  return (
    <TransitionOrchestratorProvider router={routerLike}>
      {children}
    </TransitionOrchestratorProvider>
  );
}