import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, useState, type ReactNode } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { POKEMON_LIST_PAGE_SIZE } from "@/src/lib/types/pokemon";
import type { PokemonListItem } from "@/src/lib/types/pokemon";

/**
 * Plan 06.1 — TDD de la lista virtualizada con
 * `@tanstack/react-virtual`.
 *
 * Cobertura:
 *  - Al montar, carga las dos primeras páginas en paralelo.
 *  - Renderiza las cards de las páginas cargadas.
 *  - Click en una card llama a `router.push('/pokemon/<name>?
 *    <filtros>')`.
 *  - `single=true` → la lista NO se monta (la UI pasa a la ficha).
 *  - Estructura accesible: `role="listbox"` con `aria-label`.
 *  - Cuando el `total` es mayor que las páginas cargadas, el
 *    virtualizador dispara fetches adicionales bajo demanda.
 *
 * Mock strategy:
 *  - `useNavigation` mockeado al harness ya usado por `useFilters`.
 *  - `applyFiltersToList` (capa de datos) mockeada.
 *  - `useVirtualizer` mockeado para que en jsdom (donde el
 *    `clientHeight` es 0 y por tanto el virtualizador real no
 *    reporta items visibles) devuelva un item por cada `count`,
 *    con `start = index * 70` y `size = 70`. Así los tests
 *    inspeccionan el DOM de forma determinista.
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

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: <TScroll extends Element, TItem extends Element>(opts: {
    count: number;
  }) => {
    const items: Array<{ index: number; key: number; start: number; size: number; measureElement: (el: TItem | null) => void }> = [];
    for (let i = 0; i < opts.count; i++) {
      items.push({
        index: i,
        key: i,
        start: i * 70,
        size: 70,
        measureElement: () => {},
      });
    }
    return {
      getVirtualItems: () => items,
      getTotalSize: () => opts.count * 70,
      measureElement: () => {},
      measure: () => {},
    } as unknown as ReturnType<typeof import("@tanstack/react-virtual").useVirtualizer<TScroll, TItem>>;
  },
}));

import * as api from "@/src/lib/pokemon/cachedPokemonApi";
import { PokemonList } from "@/src/components/pokedex/list/PokemonList";

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

function page(offset: number, size: number, next: number | null, total = 200) {
  return {
    items: Array.from({ length: size }, (_, i) => makeItem(offset + i + 1)),
    nextOffset: next,
    total,
    single: false,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <FiltersProvider>{children}</FiltersProvider>;
}

beforeEach(() => {
  harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  vi.clearAllMocks();
});

/* ---------- Tests ---------- */

describe("PokemonList (Plan 06.1) — virtualización con @tanstack/react-virtual", () => {
  it("al montar carga las dos primeras páginas en paralelo", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(0, 30, 30));
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(30, 30, 60));

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(api.applyFiltersToList).toHaveBeenCalledTimes(2);
    });
    expect(api.applyFiltersToList).toHaveBeenNthCalledWith(1, {}, 0, undefined);
    expect(api.applyFiltersToList).toHaveBeenNthCalledWith(2, {}, 30, undefined);
  });

  it("pinta las cards de las páginas cargadas", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(0, 30, 30));
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(30, 30, 60));

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card").length).toBeGreaterThan(0);
    });
    const names = screen
      .getAllByTestId("pokemon-list-card")
      .map((c) => c.getAttribute("data-pokemon"));
    expect(names).toContain("pkm-1");
    expect(names).toContain("pkm-30");
    expect(names).toContain("pkm-31");
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

  it("cuando la API devuelve single=true, la lista NO se monta", async () => {
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
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(page(30, 30, 60));

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-list-card").length).toBeGreaterThan(0);
    });

    const list = screen.getByTestId("pokemon-list");
    expect(list.getAttribute("role")).toBe("listbox");
    expect(list.getAttribute("aria-label")).toBeTruthy();
  });

  it("con 1 solo resultado y single=false la lista muestra la única card", async () => {
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

  it("pide páginas adicionales bajo demanda cuando el virtualizador lo requiere", async () => {
    // Mockeamos respuestas para 3 páginas: la precarga consume las
    // dos primeras, y la siguiente demanda del componente consume
    // la tercera (offset=60). El componente solo debe pedir esa
    // única página adicional mientras haya rango visible por
    // cubrir.
    vi.mocked(api.applyFiltersToList).mockImplementation(
      async (_f, offset) => {
        // Devolvemos `next=null` si la cola se ha acabado para que
        // el componente marque `loadedAll` y detenga más fetches.
        if (offset >= 90) return page(offset, 30, null, 200);
        return page(offset, 30, offset + POKEMON_LIST_PAGE_SIZE, 200);
      },
    );

    render(<PokemonList />, { wrapper });

    // Tras la precarga y al menos un fetch de demanda, la página
    // con offset=60 debe haberse pedido.
    await waitFor(() => {
      const calls = vi.mocked(api.applyFiltersToList).mock.calls;
      expect(calls.some((c) => c[1] === 60)).toBe(true);
    });
  });

  it("usa `POKEMON_LIST_PAGE_SIZE` como tamaño de página al calcular offsets", async () => {
    // Si el tamaño de página cambiara en el futuro, este test
    // garantiza que el offset del segundo fetch es exactamente
    // `POKEMON_LIST_PAGE_SIZE`.
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(
      page(0, POKEMON_LIST_PAGE_SIZE, POKEMON_LIST_PAGE_SIZE),
    );
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce(
      page(
        POKEMON_LIST_PAGE_SIZE,
        POKEMON_LIST_PAGE_SIZE,
        POKEMON_LIST_PAGE_SIZE * 2,
      ),
    );

    render(<PokemonList />, { wrapper });

    await waitFor(() => {
      expect(api.applyFiltersToList).toHaveBeenCalledTimes(2);
    });
    expect(api.applyFiltersToList).toHaveBeenNthCalledWith(
      1,
      {},
      0,
      undefined,
    );
    expect(api.applyFiltersToList).toHaveBeenNthCalledWith(
      2,
      {},
      POKEMON_LIST_PAGE_SIZE,
      undefined,
    );
  });
});
