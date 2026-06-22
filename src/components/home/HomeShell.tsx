"use client";

import { Suspense, type ReactNode } from "react";
import { HomeNavigationProvider } from "@/src/components/home/HomeNavigationContext";
import { HomeNavController } from "@/src/components/home/HomeNavController";
import { SoundMusicProvider } from "@/src/components/home/SoundMusicContext";

/**
 * Plan 03.5 — Shell cliente de la pantalla de inicio.
 *
 * Reúne los providers y el controlador global de navegación
 * (teclado/click) en un único Client Component para que el
 * `page.tsx` pueda seguir siendo un Server Component que prepara
 * los datos y el layout.
 *
 * Estructura:
 *   <SoundMusicProvider>          ← estado de música (Plan 03.4)
 *     <Suspense>                   ← obligatorio: useSearchParams()
 *       <HomeNavigationProvider>     ← navegación centralizada (03.5)
 *         <HomeNavController>        ← listeners globales (03.5)
 *           {children}                ← contenido estático (03.1–03.4)
 *         </HomeNavController>
 *       </HomeNavigationProvider>
 *     </Suspense>
 *   </SoundMusicProvider>
 *
 * `<Suspense>` es necesario porque `HomeNavigationProvider` consume
 * `useSearchParams()` a través de `useNavigation()` (router de Next).
 * Next.js 16 exige una frontera Suspense para poder prerenderizar
 * el segmento estático `/`. Ver `use-search-params.md` en la docs.
 */

export function HomeShell({ children }: { children: ReactNode }) {
  return (
    <SoundMusicProvider>
      <Suspense fallback={null}>
        <HomeNavigationProvider>
          <HomeNavController>{children}</HomeNavController>
        </HomeNavigationProvider>
      </Suspense>
    </SoundMusicProvider>
  );
}

