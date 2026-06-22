import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect, useState, type ReactNode } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { PokemonList } from "@/src/components/pokedex/list/PokemonList";
import type { PokemonListItem } from "@/src/lib/types/pokemon";

/**
 * Plan 06.1 — TDD de la lista virtualizada con ventana deslizante.
 *
 * Cobertura:
 *  - Render inicial de 30 cards (primera página).
 *  - Scroll al final → segunda página (60 cards) vía IntersectionObserver.
 *  - Al visualizar el item 60, los items 1–30 se desmontan.
 *  - Click en una card llama a `router.push('/pokemon/<name>?<filtros>')`.
 *  - `single=true` → la lista NO se monta (la UI pasa a la ficha).
 *
 * Mock strategy:
 *  - `useNavigation` mockeado al harness ya usado por `useFilters`.
 *  - `applyFiltersToList` (capa de datos) mockeada.
 *  - `IntersectionObserver` polyfill: cada instancia se registra en
 *    un Set global y expone un `trigger(entries)`; los tests localizan
 *    el observer correcto por el sentinel observado.
 */

const harnessRef = globalThis as unknown as { __harness?: NavigationHarness };

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => {
    const h = harnessRef.__harness;
    if (!h) {
      throw new Error("harness not initialized");
    }
    const [, setTick] = useState(0);
    useEffect(() => h.subscribe(() => setTick((t) => t + 1)), [h]);
    return {
      pathname: h.pathname,
      searchParams: h.searchParams(),
      router: h.router,
      subscribe: (fn: () => void) => h.subscribe(fn),
    };
  },
}));

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  applyFiltersToList: vi.fn(),
}));

import * as api from "@/src/lib/pokemon/cachedPokemonApi";

/* ---------- Helpers ---------- */

function makeItem(id: number, name?: string): PokemonListItem {
  return {
    id,
    name: name ?? `pkm-${id}`,
    height: null,
    weight: null,
    spriteFront: null,
    types: [{ slot: 1, name: "normal" }],
    habitat: null,
    generation: null,
  };
}

function page(offset: number, size: number, next: number | null) {
  return {
    items: Array.from({ length: size }, (_, i) => makeItem(offset + i + 1)),
    nextOffset: next,
    total: 200,
    single: false,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <FiltersProvider>{children}</FiltersProvider>;
}

/* ---------- IntersectionObserver polyfill ---------- */

interface ObserverEntry {
  isIntersecting: boolean;
  target: Element;
}

type ObserverCallback = (entries: ObserverEntry[]) => void;

interface MockObserver {
  callback: ObserverCallback;
  elements: Set<Element>;
  trigger(entries: ObserverEntry[]): void;
}

const liveObservers = new Set<MockObserver>();

class MockIntersectionObserver {
  private observer: MockObserver;
  constructor(cb: ObserverCallback) {
    const triggerCb = cb;
    this.observer = {
      get callback() {
        return triggerCb;
      },
      elements: new Set<Element>(),
      trigger(entries: ObserverEntry[]) {
        triggerCb(entries);
      },
    };
    liveObservers.add(this.observer);
  }
  observe(el: Element): void {
    this.observer.elements.add(el);
  }
  unobserve(el: Element): void {
    this.observer.elements.delete(el);
  }
  disconnect(): void {
    this.observer.elements.clear();
    liveObservers.delete(this.observer);
  }
}

beforeEach(() => {
  harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  vi.clearAllMocks();
  liveObservers.clear();
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver;
});

afterEach(() => {
  delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
});

/** Devuelve el observer vivo que esté observando `el`. */
function observerFor(el: Element): MockObserver | undefined {
  for (const obs of liveObservers) {
    if (obs.elements.has(el)) return obs;
  }
  return undefined;
}

/* ---------- Tests ---------- */

describe("PokemonList (Plan 06.1) — ventana deslizante", () => {
  it("renderiza 30 cards iniciales tras la primera carga", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(0, 30, 30));

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card")).toHaveLength(30);
    });
    expect(api.applyFiltersToList).toHaveBeenCalledTimes(1);
    expect(api.applyFiltersToList).toHaveBeenCalledWith({}, 0, undefined);
  });

  it("al hacer scroll al final (intersect bottom sentinel) carga la página siguiente (60 cards)", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(0, 30, 30));
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(30, 30, 60));

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card")).toHaveLength(30);
    });

    const bottomEl = document.querySelector<HTMLElement>(
      '[data-testid="pokemon-list-bottom-sentinel"]',
    );
    expect(bottomEl).not.toBeNull();
    const obs = observerFor(bottomEl!);
    expect(obs).toBeDefined();

    await act(async () => {
      obs!.trigger([{ isIntersecting: true, target: bottomEl! }]);
    });

    await waitFor(() => {
      expect(api.applyFiltersToList).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card")).toHaveLength(60);
    });
    expect(api.applyFiltersToList).toHaveBeenCalledTimes(2);
    expect(api.applyFiltersToList).toHaveBeenLastCalledWith({}, 30, undefined);
  });

  it("al visualizar el item 60, los items 1–30 se desmontan (ventana deslizante)", async () => {
    // Páginas: [0..29], [30..59], [60..89]
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(0, 30, 30));
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(30, 30, 60));
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(60, 30, 90));

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card")).toHaveLength(30);
    });

    // 1) Scroll al final → carga página 30.
    const bottomEl1 = document.querySelector<HTMLElement>(
      '[data-testid="pokemon-list-bottom-sentinel"]',
    )!;
    await act(async () => {
      observerFor(bottomEl1)!.trigger([
        { isIntersecting: true, target: bottomEl1 },
      ]);
    });
    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card")).toHaveLength(60);
    });

    // 2) Al visualizar el item 60 (último de la segunda página), la
    //    ventana avanza: destruye items 1..30, carga página 60.
    const bottomEl2 = document.querySelector<HTMLElement>(
      '[data-testid="pokemon-list-bottom-sentinel"]',
    )!;
    await act(async () => {
      observerFor(bottomEl2)!.trigger([
        { isIntersecting: true, target: bottomEl2 },
      ]);
    });

    await waitFor(() => {
      const cards = screen.getAllByTestId("pokemon-list-card");
      expect(cards).toHaveLength(60);
      const names = cards.map((c) => c.getAttribute("data-pokemon"));
      expect(names).not.toContain("pkm-1");
      expect(names).not.toContain("pkm-30");
      expect(names).toContain("pkm-31");
      expect(names).toContain("pkm-90");
    });
    expect(api.applyFiltersToList).toHaveBeenCalledTimes(3);
    expect(api.applyFiltersToList).toHaveBeenLastCalledWith({}, 60, undefined);
  });

  it("pulsar una card dispara router.push('/pokemon/<name>?<filtros>')", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(0, 30, null));

    const push = vi.fn();
    harnessRef.__harness!.setRouter({ push });
    harnessRef.__harness!.setSearch("type1=fire");

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card")).toHaveLength(30);
    });

    const firstCard = screen.getAllByTestId("pokemon-list-card")[0]!;
    await act(async () => {
      fireEvent.click(firstCard);
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      expect.stringMatching(/^\/pokemon\/pkm-1\?type1=fire/),
    );
  });

  it("cuando la API devuelve single=true, la lista NO se monta (la UI pasa a la ficha)", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [makeItem(25, "pikachu")],
      nextOffset: null,
      total: 1,
      single: true,
    });

    const { container } = render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-testid="pokemon-list-card"]'),
      ).toHaveLength(0);
    });
    expect(container.querySelector('[data-testid="pokemon-list"]')).not.toBeNull();
  });

  it("la lista expone data-testid='pokemon-list' y rol listbox accesible", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(0, 30, 30));

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card")).toHaveLength(30);
    });

    const list = screen.getByTestId("pokemon-list");
    expect(list.getAttribute("role")).toBe("listbox");
    expect(list.getAttribute("aria-label")).toBeTruthy();
  });

  it("con 1 solo resultado y single=false la lista sigue mostrando la única card", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [makeItem(25, "pikachu")],
      nextOffset: null,
      total: 1,
      single: false,
    });

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card")).toHaveLength(1);
    });
  });
});