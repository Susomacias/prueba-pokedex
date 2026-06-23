"use client";

import { useEffect, useReducer } from "react";

/**
 * Adaptador sobre `next/navigation` (Plan 02.2).
 *
 * NOTA: NO se usa `usePathname`, `useRouter` ni `useSearchParams` de
 * Next.js para escribir la URL porque estos métodos disparan un RSC
 * fetch aunque solo cambien los search params, lo que provoca que los
 * <Suspense> boundaries muestren su fallback (parpadeo visual).
 * Además, el `AppShellProvider` navega entre home y pokédex vía
 * `history.pushState` (para mantener la SPA), y el router de Next.js
 * no detecta esos cambios, causando que `nextUsePathname` devuelva
 * un pathname desincronizado con la URL real del navegador.
 *
 * En su lugar, todo el manejo de URL se hace mediante
 * `window.history.replaceState`/`pushState` + evento `popstate`,
 * que actualiza la barra del navegador SIN provocar viajes al
 * servidor. Es el mismo mecanismo que usa `AppShellProvider` para
 * la navegación home↔pokedex.
 *
 * El módulo se mockea en `__tests__/hooks/useFilters.test.tsx` para
 * inyectar un harness determinista que dispara re-renders manualmente.
 */

function getPathname(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

function getSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search || "";
}

/* ------------------------------------------------------------------ *
 * Suscriptores globales para notificar cambios de URL
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const fn of listeners) fn();
}

/* ------------------------------------------------------------------ *
 * API pública
 * ------------------------------------------------------------------ */

export interface NavigationRouter {
  replace(url: string): void;
  push(url: string): void;
  back(): void;
  forward(): void;
  refresh(): void;
}

export interface NavigationSnapshot {
  pathname: string;
  searchParams: URLSearchParams;
  router: NavigationRouter;
  subscribe(listener: () => void): () => void;
}

export function useNavigation(): NavigationSnapshot {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  // Suscribirse a `popstate` para que el botón atrás/adelante del
  // navegador mantenga `pathname` y `searchParams` sincronizados
  // con la URL real.
  useEffect(() => {
    const onPop = () => forceUpdate();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [forceUpdate]);

  const pathname = getPathname();
  const searchParams = new URLSearchParams(getSearch());

  return {
    pathname,
    searchParams,
    router: {
      replace: (url: string) => {
        if (typeof window === "undefined") return;
        window.history.replaceState({}, "", url);
        notifyListeners();
        // Disparamos `popstate` para que otros listeners (AppShell,
        // React state) se sincronicen.
        window.dispatchEvent(new PopStateEvent("popstate"));
      },
      push: (url: string) => {
        if (typeof window === "undefined") return;
        window.history.pushState({}, "", url);
        notifyListeners();
        window.dispatchEvent(new PopStateEvent("popstate"));
      },
      back: () => {
        window.history.back();
      },
      forward: () => {
        window.history.forward();
      },
      refresh: () => {
        window.location.reload();
      },
    },
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
