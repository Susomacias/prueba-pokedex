import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { useFilteredPokemonList } from "@/src/components/filters/useFilteredPokemonList";

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
import type { PokemonListItem } from "@/src/lib/types/pokemon";

const sampleItem: PokemonListItem = {
  id: 1,
  name: "bulbasaur",
  height: 7,
  weight: 69,
  spriteFront: null,
  types: [{ slot: 1, name: "grass" }],
  habitat: "pradera",
  generation: "generation-i",
};

function wrapper({ children }: { children: ReactNode }) {
  return <FiltersProvider>{children}</FiltersProvider>;
}

describe("useFilteredPokemonList", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
    vi.clearAllMocks();
  });

  it("dispara la primera carga al montar", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [sampleItem],
      nextOffset: null,
      total: 1,
      single: false,
    });

    const { result } = renderHook(() => useFilteredPokemonList(0), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items).toEqual([sampleItem]);
    expect(api.applyFiltersToList).toHaveBeenCalledTimes(1);
    expect(api.applyFiltersToList).toHaveBeenCalledWith(
      {},
      0,
      undefined,
    );
  });

  it("pasa los filtros activos desde la URL a applyFiltersToList", async () => {
    harnessRef.__harness!.setSearch("type1=fire&habitat=pradera");
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [],
      nextOffset: null,
      total: 0,
      single: false,
    });

    const { result } = renderHook(() => useFilteredPokemonList(0), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(api.applyFiltersToList).toHaveBeenCalledWith(
      expect.objectContaining({ type1: "fire", habitat: "pradera" }),
      0,
      undefined,
    );
  });

  it("re-fetch cuando cambian los filtros en la URL", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValue({
      items: [],
      nextOffset: null,
      total: 0,
      single: false,
    });

    const { result } = renderHook(() => useFilteredPokemonList(0), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(api.applyFiltersToList).toHaveBeenCalledTimes(1);

    act(() => {
      harnessRef.__harness!.setSearch("type1=fire");
    });

    await waitFor(() => expect(api.applyFiltersToList).toHaveBeenCalledTimes(2));
    expect(api.applyFiltersToList).toHaveBeenLastCalledWith(
      expect.objectContaining({ type1: "fire" }),
      0,
      undefined,
    );
  });

  it("loadMore pide la siguiente página usando nextOffset", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [sampleItem],
      nextOffset: 30,
      total: 60,
      single: false,
    });
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [{ ...sampleItem, id: 2, name: "ivysaur" }],
      nextOffset: null,
      total: 60,
      single: false,
    });

    const { result } = renderHook(() => useFilteredPokemonList(0), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.nextOffset).toBe(30);

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(api.applyFiltersToList).toHaveBeenLastCalledWith(
      {},
      30,
      undefined,
    );
  });

  it("loadMore no hace nada si no hay nextOffset", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [sampleItem],
      nextOffset: null,
      total: 1,
      single: false,
    });

    const { result } = renderHook(() => useFilteredPokemonList(0), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(api.applyFiltersToList).toHaveBeenCalledTimes(1);
  });
});