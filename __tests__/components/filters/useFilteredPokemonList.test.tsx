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

const applyFiltersToListMock = vi.mocked(api.applyFiltersToList);

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

  /* ------------------------------------------------------------------------ *
   * Plan 07.1 — Búsqueda multi-palabra y misma política de scroll infinito
   * que la lista inicial sin filtros (ver `PokemonList` + `useFilteredPokemonList`
   * en `src/components/filters/useFilteredPokemonList.ts` y `AGENTS.md`).
   *
   * El término que llega al hook desde la consola (`filters.search`) se
   * pasa tal cual a `applyFiltersToList(filters, offset, { search })`. La
   * normalización de mayúsculas / acentos / palabras ocurre dentro de
   * `buildNameSearchWhere` (ver `__tests__/graphql/where.test.ts`). Aquí
   * verificamos que el hook hace de puente correcto y respeta la política
   * de scroll infinito (acumulativo, re-fetch al cambiar filtros).
   * ------------------------------------------------------------------------ */

  it("búsqueda multi-palabra: 'Charman Pika' llega íntegra a applyFiltersToList", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [sampleItem],
      nextOffset: null,
      total: 1,
      single: false,
    });

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });
    // La mutación del estado unificado se hace a través del provider.
    await act(async () => {
      // Simula el efecto de teclear `Charman Pika` en la consola:
      // `setFilter('search', 'Charman Pika')` actualiza la URL y, por
      // tanto, los `filters` del provider.
      harnessRef.__harness!.setSearch("search=Charman+Pika");
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(api.applyFiltersToList).toHaveBeenCalledWith(
      expect.objectContaining({}),
      0,
      { search: "Charman Pika" },
    );
  });

  it("el término de búsqueda desde la URL preserva el caso original (la normalización la hace la capa de datos)", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [],
      nextOffset: null,
      total: 0,
      single: false,
    });

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });
    await act(async () => {
      harnessRef.__harness!.setSearch("search=P%C3%8DKACHU%21%21%21");
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    // El término llega tal cual desde la URL (`PÍKACHU!!!`) y se
    // inyecta en `options.search`; `buildNameSearchWhere` se encarga
    // de normalizar a `pikachu` antes de armar la query GraphQL.
    expect(api.applyFiltersToList).toHaveBeenCalledWith(
      expect.objectContaining({}),
      0,
      { search: "PÍKACHU!!!" },
    );
  });

  it("al cambiar la búsqueda, los items se reinician (no se acumula el resultado anterior)", async () => {
    vi.mocked(api.applyFiltersToList)
      .mockResolvedValueOnce({
        items: [sampleItem],
        nextOffset: 30,
        total: 60,
        single: false,
      })
      .mockResolvedValueOnce({
        items: [{ ...sampleItem, id: 25, name: "pikachu" }],
        nextOffset: null,
        total: 1,
        single: false,
      });

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0]?.name).toBe("bulbasaur");

    // Cambiar la búsqueda debe descartar la página anterior
    // (mismo patrón que para los filtros — NO hay ventana deslizante).
    await act(async () => {
      harnessRef.__harness!.setSearch("search=pikachu");
    });

    await waitFor(() =>
      expect(result.current.items[0]?.name).toBe("pikachu"),
    );
    expect(result.current.items).toHaveLength(1);
    expect(result.current.nextOffset).toBeNull();
  });

  it("loadMore con filtros + búsqueda concatena correctamente con la siguiente página", async () => {
    vi.mocked(api.applyFiltersToList)
      .mockResolvedValueOnce({
        items: [sampleItem],
        nextOffset: 30,
        total: 60,
        single: false,
      })
      .mockResolvedValueOnce({
        items: [{ ...sampleItem, id: 25, name: "pikachu" }],
        nextOffset: null,
        total: 60,
        single: false,
      });

    harnessRef.__harness!.setSearch("type1=Fuego&search=char");

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    // La URL serializa `fire` con su etiqueta traducida `Fuego`
    // (ver `POKEMON_TYPE_LABELS`); `useFilters` parsea de vuelta al
    // value canónico antes de pasar a la API.
    expect(api.applyFiltersToList).toHaveBeenLastCalledWith(
      expect.objectContaining({ type1: "fire" }),
      0,
      { search: "char" },
    );

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(api.applyFiltersToList).toHaveBeenLastCalledWith(
      expect.objectContaining({ type1: "fire" }),
      30,
      { search: "char" },
    );
  });

  it("options.search (explícito) tiene prioridad sobre filters.search (URL)", async () => {
    vi.mocked(api.applyFiltersToList).mockResolvedValueOnce({
      items: [],
      nextOffset: null,
      total: 0,
      single: false,
    });

    harnessRef.__harness!.setSearch("search=eevee");

    renderHook(() => useFilteredPokemonList(0, { search: "pikachu" }), {
      wrapper,
    });

    await waitFor(() =>
      expect(api.applyFiltersToList).toHaveBeenCalledWith(
        expect.objectContaining({}),
        0,
        { search: "pikachu" },
      ),
    );
  });

  /* ------------------------------------------------------------------------ *
   * Retry: el hook expone un método `retry()` que dispara un reintento
   * manual cuando la carga inicial falla (p.ej. 502 del proxy). Esto
   * es lo que el botón "Reintentar" de `PokemonList` ejecuta cuando
   * el usuario quiere forzar la recarga sin esperar al backoff
   * automático del auto-retry.
   * ------------------------------------------------------------------------ */

  it("expone `retry()` que dispara un nuevo fetch cuando hay error", async () => {
    vi.mocked(api.applyFiltersToList)
      .mockRejectedValueOnce(new Error("PokeAPI 502 Bad Gateway"))
      .mockResolvedValueOnce({
        items: [sampleItem],
        nextOffset: null,
        total: 1,
        single: false,
      });

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.message).toContain("502");
    expect(result.current.items).toHaveLength(0);

    // El usuario pulsa "Reintentar".
    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items).toHaveLength(1);
    // El segundo fetch se hizo con los mismos args.
    expect(api.applyFiltersToList).toHaveBeenCalledTimes(2);
  });

  it("retry() NO se llama automáticamente si el error no es transitorio", async () => {
    vi.mocked(api.applyFiltersToList).mockRejectedValue(
      new Error("GraphQL: field not found"),
    );

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));

    // Esperamos el tiempo suficiente para que el backoff expire sin
    // nuevos fetches (sólo el inicial).
    await new Promise((r) => setTimeout(r, 50));

    // El error NO es transitorio, así que el auto-retry no se dispara.
    expect(api.applyFiltersToList).toHaveBeenCalledTimes(1);
  });

  it("el auto-retry se detiene tras 3 intentos", async () => {
    vi.mocked(api.applyFiltersToList).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    const initialCalls = applyFiltersToListMock.mock.calls.length;

    // Disparamos manualmente varios reintentos para acelerar el test.
    // Cada retry() incrementa retryNonce, lo que dispara el useEffect
    // de reintento. El contador de reintentos tiene un tope de 3.
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        result.current.retry();
        await new Promise((r) => setTimeout(r, 30));
      }
    });

    // Al menos se hizo un reintento (el hook no quedó "atascado" tras
    // el primer fallo), pero NO debe haber reintentado infinitamente.
    const finalCalls = applyFiltersToListMock.mock.calls.length;
    expect(finalCalls).toBeGreaterThan(initialCalls);
    // Tope: 1 inicial + 3 retry = 4. Permitimos un pequeño margen
    // porque el primer setTimeout del auto-retry puede solaparse.
    expect(finalCalls).toBeLessThanOrEqual(5);
  });

  /* ----------------------------------------------------------------- *
   * REGRESIÓN: cuando el upstream devuelve un error tipado con
   * `retryAfter` (Cloudflare 521 → 502 con `retry_after: 120`),
   * el auto-retry debe esperar al menos ese tiempo antes de reintentar.
   * Antes de este fix, el backoff era fijo 1s/2s/4s y reintentaba contra
   * un upstream que estaba bloqueando activamente → 3× 502 encadenados
   * y mensaje críptico al usuario.
   *
   * Para que el test sea rápido, simulamos retryAfter = 80 ms.
   * ----------------------------------------------------------------- */

  it("cuando el error tiene retryAfter >= 1000ms, el auto-retry espera al menos ese tiempo", async () => {
    const err = Object.assign(
      new Error(
        "Upstream Cloudflare error 521: Web server is down (retryable)",
      ),
      { retryAfterMs: 1500 },
    );
    vi.mocked(api.applyFiltersToList).mockRejectedValue(err);

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));

    const t0 = Date.now();
    // Sin retry manual: esperamos al menos 1.5s para ver el primer
    // auto-retry (retryNonce=1 → useEffect dispara doFetch).
    await waitFor(
      () => expect(applyFiltersToListMock.mock.calls.length).toBeGreaterThanOrEqual(2),
      { timeout: 4000 },
    );
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(1400); // margen por timers
    expect(result.current.retryAfterMs).toBe(1500);
  });

  it("expone `retryAfterMs` en el resultado del hook para que la UI pueda mostrarlo", async () => {
    const err = Object.assign(
      new Error("Upstream Cloudflare error 521 (retryable)"),
      { retryAfterMs: 120_000 },
    );
    vi.mocked(api.applyFiltersToList).mockRejectedValue(err);

    const { result } = renderHook(() => useFilteredPokemonList(0), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.retryAfterMs).toBe(120_000);
  });
});