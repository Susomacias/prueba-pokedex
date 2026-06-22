"use client";

import { Suspense, type ReactNode } from "react";
import { HomeNavigationProvider } from "@/src/components/home/HomeNavigationContext";
import { HomeNavController } from "@/src/components/home/HomeNavController";
import { SoundMusicProvider } from "@/src/components/home/SoundMusicContext";
import { AppTransitionShell } from "@/src/components/transitions/AppTransitionShell";

/**
 * Plan 03.5 + 04.1 — Shell cliente de la pantalla de inicio.
 *
 * Reúne los providers y el controlador global de navegación
 * (teclado/click) en un único Client Component para que el
 * `page.tsx` pueda seguir siendo un Server Component que prepara
 * los datos y el layout.
 *
 * Estructura (Plan 04.1):
 *   <AppTransitionShell>           ← orquestador transiciones (04.1)
 *     <SoundMusicProvider>          ← estado de música (Plan 03.4)
 *       <Suspense>                   ← obligatorio: useSearchParams()
 *         <HomeNavigationProvider>    ← navegación centralizada (03.5)
 *           <HomeNavController>       ← listeners globales (03.5)
 *             {children}               ← contenido estático (03.1–03.4)
 *           </HomeNavController>
 *         </HomeNavigationProvider>
 *       </Suspense>
 *     </SoundMusicProvider>
 *   </AppTransitionShell>
 *
 * `<AppTransitionShell>` se monta por ENCIMA de los demás providers
 * para que `PressStartButton` (que vive en `children`) pueda usar el
 * orquestador (vía `useOptionalTransitionOrchestrator`). El
 * `<Suspense>` interior sigue siendo necesario porque
 * `HomeNavigationProvider` consume `useSearchParams()`.
 */

export function HomeShell({ children }: { children: ReactNode }) {
  return (
    <AppTransitionShell>
      <SoundMusicProvider>
        <Suspense fallback={null}>
          <HomeNavigationProvider>
            <HomeNavController>{children}</HomeNavController>
          </HomeNavigationProvider>
        </Suspense>
      </SoundMusicProvider>
    </AppTransitionShell>
  );
}

