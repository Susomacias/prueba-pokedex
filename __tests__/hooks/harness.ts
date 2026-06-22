/**
 * Harness ligero para testear hooks que dependen de `next/navigation`
 * (`useRouter`, `usePathname`, `useSearchParams`).
 *
 * El mock de `useNavigation` (en `useFilters.test.tsx`) consume un objeto
 * expuesto en `globalThis.__harness` y se suscribe a sus notificaciones
 * para forzar re-renders. Este archivo expone únicamente los helpers de
 * creación del harness.
 */

export interface HarnessRouter {
  replace: (url: string) => void;
  push: (url: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
}

export interface NavigationHarness {
  pathname: string;
  search: string;
  router: HarnessRouter;
  setRouter(partial: Partial<HarnessRouter>): void;
  setPathname(next: string): void;
  setSearch(next: string): void;
  searchParams(): URLSearchParams;
  subscribe(fn: () => void): () => void;
}

export interface HarnessOptions {
  pathname?: string;
  initialSearch?: string;
  router?: Partial<HarnessRouter>;
}

export function createNavigationHarness(
  options: HarnessOptions = {},
): NavigationHarness {
  let pathname = options.pathname ?? "/pokedex";
  let search = options.initialSearch ?? "";
  const subscribers = new Set<() => void>();
  const router: HarnessRouter = {
    replace: () => undefined,
    push: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    ...options.router,
  };

  const notify = () => {
    for (const fn of subscribers) fn();
  };

  return {
    get pathname() {
      return pathname;
    },
    get search() {
      return search;
    },
    router,
    setRouter(partial) {
      Object.assign(router, partial);
    },
    setPathname(next) {
      pathname = next;
      notify();
    },
    setSearch(next) {
      search = next.startsWith("?") ? next.slice(1) : next;
      notify();
    },
    searchParams() {
      return new URLSearchParams(search);
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
  };
}
