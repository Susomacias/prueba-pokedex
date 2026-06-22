"use client";

import {
  usePathname as nextUsePathname,
  useRouter as nextUseRouter,
  useSearchParams as nextUseSearchParams,
} from "next/navigation";

/**
 * Adaptador sobre `next/navigation` (Plan 02.2).
 *
 * En producción, Next ya re-renderiza los Client Components cuando
 * cambian `usePathname`/`useSearchParams`/`useRouter`. Este hook
 * devuelve un objeto estable que envuelve esas APIs.
 *
 * El módulo se mockea en `__tests__/hooks/useFilters.test.tsx` para
 * inyectar un harness determinista que dispara re-renders manualmente.
 */

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
  const pathname = nextUsePathname();
  const router = nextUseRouter();
  const searchParams = nextUseSearchParams();
  const searchString = searchParams?.toString() ?? "";

  return {
    pathname,
    searchParams: new URLSearchParams(searchString),
    router: {
      replace: (url) => router.replace(url, { scroll: false }),
      push: (url) => router.push(url, { scroll: false }),
      back: () => router.back(),
      forward: () => router.forward(),
      refresh: () => router.refresh(),
    },
    subscribe: () => () => undefined,
  };
}
