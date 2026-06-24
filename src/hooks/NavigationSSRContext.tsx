"use client";

import { createContext, useContext } from "react";

/**
 * Contexto que permite a las Server Components pasar el pathname y los
 * search params conocidos en el momento de la petición. `useNavigation`
 * los usa durante SSR e hidratación inicial para evitar el hydration
 * mismatch de `getPathname()` y `getSearch()` (que en el servidor
 * devuelven valores por defecto porque `window` no existe).
 *
 * El provider se monta dentro de `AppShellProvider` en `ViewContext.tsx`.
 *
 * Este contexto vive en un archivo separado (no en `useNavigation.ts`)
 * para que los tests existentes que mockean `@/src/hooks/useNavigation`
 * no tengan que re-exportarlo.
 */
export interface NavigationSSRState {
  pathname?: string;
  search?: string;
}

export const NavigationSSRContext = createContext<NavigationSSRState>({});

export function useNavigationSSRState(): NavigationSSRState {
  return useContext(NavigationSSRContext);
}
