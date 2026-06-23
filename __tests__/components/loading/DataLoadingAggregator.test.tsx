import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { DataLoadingAggregator } from "@/src/components/loading/DataLoadingAggregator";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { AppShellProvider } from "@/src/components/app/ViewContext";
import { PokedexPageProvider } from "@/src/components/pokedex/PokedexPageProvider";

/**
 * Plan 06.7 — TDD del `DataLoadingAggregator`.
 *
 * El aggregator agrega el estado de carga de las fuentes de datos
 * de la Pokédex que aún no tienen spinner local dedicado:
 *
 *   - Detalle del pokemon seleccionado (`usePokedexPage.selectedName`
 *     → fetch local del aggregator vía `fetchPokemonDetail`).
 *     El spinner local del `PokemonCarousel` sólo cubre el área
 *     del carrusel, no la pantalla completa: este aggregator
 *     extiende el loading a toda la Pokédex.
 *
 * Por qué NO se rastrea aquí:
 *
 *   - Lista paginada: el `PokemonList` YA tiene su propio spinner
 *     local al final del scroll y durante la primera carga (su
 *     contenedor tiene `aria-busy`). Si el aggregator invocara
 *     `useFilteredPokemonList` también, dispararía un segundo fetch
 *     en paralelo. La solución completa (store externo tipo
 *     `useFilterOptions`) la abordará el Plan 07 cuando se monte
 *     la lista + filtros en un solo árbol.
 *
 *   - Opciones de filtros: cada consumidor (`FilterDropdownsSlot`,
 *     Plan 07) usará `useFilterOptions(key)` que tiene su propio
 *     estado de loading. Como ese hook aún no se ha integrado en
 *     ningún consumidor real, NO forzamos fetches especulativos desde
 *     el aggregator.
 *
 * Tiempo mínimo visible (FIX del bug "no veo la animación"):
 *
 *  - El aggregator garantiza un `minVisibleMs` (por defecto 800 ms)
 *    de presencia visible del pikachu. Sin esto, cuando la PokeAPI
 *    responde muy rápido (caso típico: caché de Next.js), el
 *    pikachu se desmonta en <50 ms y el usuario nunca lo ve. Con el
 *    mínimo visible, el pikachu permanece en pantalla al menos 800
 *    ms (carga normal) y si la API tarda más, sigue visible
 *    durante toda la carga sin retardo artificial.
 *
 * Cuando CUALQUIERA de las fuentes rastreadas está en estado
 * "loading" o no se ha cumplido el tiempo mínimo visible, el
 * aggregator renderiza un `<LoadingPikachu loading={true} />`.
 * Cuando ambas condiciones se cumplen, el LoadingPikachu se desmonta
 * (esperando al `animationend` del último ciclo).
 *
 * Implementación:
 *  - El aggregator NO depende del `CarouselProvider`: tiene su
 *    propio mini-controller local para el detalle. Esto evita
 *    mover providers y desacopla el loading del slot del carrusel.
 *  - El aggregator SÍ depende del `PokedexPageProvider` (para
 *    saber qué pokemon está seleccionado). Si se monta fuera,
 *    lanza error (heredando el contrato defensivo del provider).
 *
 * Notas de testing:
 *  - El `PokedexPageProvider` deriva `selectedName` desde
 *    `useAppShell().pathname` que a su vez lee
 *    `window.location.pathname`. En jsdom eso es `/`. Para simular
 *    `/pokemon/<name>` usamos `window.history.replaceState` antes
 *    del render (el `AppShellProvider` lee la URL en su estado
 *    inicial con `useState(() => readPathname())`).
 *  - Usamos `vi.useFakeTimers` + `vi.advanceTimersByTime` para
 *    verificar el contrato de `minVisibleMs` de forma determinista
 *    sin sleeps reales.
 */

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  fetchPokemonDetail: vi.fn(),
}));

const harnessRef = globalThis as unknown as {
  __harness?: ReturnType<typeof createNavigationHarness>;
};

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => {
    const h = harnessRef.__harness!;
    return {
      pathname: h.pathname,
      searchParams: h.searchParams(),
      router: h.router,
      subscribe: (fn: () => void) => h.subscribe(fn),
    };
  },
}));

import * as api from "@/src/lib/pokemon/cachedPokemonApi";
import type { PokemonDetail } from "@/src/lib/types/pokemon";
import type { ReactNode } from "react";
import { createNavigationHarness } from "@/__tests__/hooks/harness";

type PokemonDetailPromise = Promise<PokemonDetail>;
type ResolveDetail = (value: PokemonDetail | PromiseLike<PokemonDetail>) => void;

beforeEach(() => {
  harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  vi.clearAllMocks();
  // Default: fetchPokemonDetail resuelve con `null` (no hay
  // pokemon). Usamos `as never` para satisfacer la firma
  // `Promise<PokemonDetail>` que el consumidor estricto espera.
  vi.mocked(api.fetchPokemonDetail).mockResolvedValue(
    null as unknown as Awaited<ReturnType<typeof api.fetchPokemonDetail>>,
  );
  // Path por defecto: Pokédex sin pokemon seleccionado.
  window.history.replaceState({}, "", "/pokedex");
});

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState({}, "", "/");
});

function Harness({ children }: { children: ReactNode }) {
  return (
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <PokedexPageProvider>{children}</PokedexPageProvider>
      </AppShellProvider>
    </FiltersProvider>
  );
}

/**
 * Helper: cambia `window.location.pathname` al path dado antes
 * del render. El `AppShellProvider` leerá este path en su estado
 * inicial y el `PokedexPageProvider` derivará `selectedName`.
 * También actualizamos el harness de `useNavigation` para que
 * `useFilters` (que vive en el árbol) reciba un pathname
 * coherente.
 */
function gotoPath(p: string) {
  window.history.replaceState({}, "", p);
  harnessRef.__harness = createNavigationHarness({ pathname: p });
}

/**
 * `pikachuDetail` mínimo: cualquier `PokemonDetail` válido para
 * que `fetchPokemonDetail` resuelva "satisfactoriamente".
 */
function pikachuDetail() {
  return {
    id: 25,
    name: "pikachu",
    height: 4,
    weight: 60,
    baseExperience: 112,
    isLegendary: false,
    isMythical: false,
    captureRate: 190,
    baseHappiness: 70,
    generation: "generation-i" as const,
    habitat: "bosque" as const,
    types: [{ slot: 1 as const, name: "electric" as const }],
    stats: [],
    abilities: [],
    sprites: {
      frontDefault: null,
      frontShiny: null,
      backDefault: null,
      backShiny: null,
      officialArtwork: null,
      officialArtworkShiny: null,
      homeFront: null,
      homeShiny: null,
    },
    cryLatestUrl: null,
    flavorText: null,
    flavorTextVersion: null,
    evolutionChain: [],
  };
}

describe("DataLoadingAggregator (Plan 06.7)", () => {
  it("sin pokemon seleccionado: NO se monta LoadingPikachu", () => {
    gotoPath("/pokedex");
    render(
      <Harness>
        <DataLoadingAggregator minVisibleMs={50} />
      </Harness>,
    );

    // No hay fuentes rastreadas en loading (sin pokemon → sin
    // fetch del detalle; sin dropdowns abiertos → sin opciones
    // pendientes). El aggregator es invisible.
    expect(screen.queryByTestId("loading-pikachu")).toBeNull();
    // Aún así expone el nodo lógico para tests/inspección.
    expect(
      screen.getByTestId("data-loading-aggregator"),
    ).toBeInTheDocument();
  });

  it("mientras el detalle del pokemon carga: LoadingPikachu visible", async () => {
    gotoPath("/pokemon/pikachu");
    // Detalle del pokemon NO resuelve (loading infinito).
    vi.mocked(api.fetchPokemonDetail).mockReturnValueOnce(
      new Promise(() => {}),
    );

    render(
      <Harness>
        <DataLoadingAggregator minVisibleMs={50} />
      </Harness>,
    );

    await waitFor(() => {
      expect(api.fetchPokemonDetail).toHaveBeenCalledWith("pikachu");
    });
    expect(screen.getByTestId("loading-pikachu")).toBeInTheDocument();
  });

  it("FIX bug: la animación SIEMPRE se ve al menos minVisibleMs aunque la API responda rápido (Next.js cache)", async () => {
    // Escenario que reportaba el usuario: al seleccionar un pokemon
    // cuya respuesta está cacheada en Next.js, fetchPokemonDetail
    // retorna en microsegundos y el pikachu se desmonta antes de
    // ser visible. Con `minVisibleMs=800` garantizamos al menos
    // 800 ms de presencia visible.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    gotoPath("/pokemon/pikachu");
    // Fetch "instantáneo" (caché): resuelve en el siguiente tick.
    vi.mocked(api.fetchPokemonDetail).mockResolvedValueOnce(pikachuDetail());

    render(
      <Harness>
        <DataLoadingAggregator minVisibleMs={800} />
      </Harness>,
    );

    // Tras montar, el fetch está en curso.
    await waitFor(() => {
      expect(api.fetchPokemonDetail).toHaveBeenCalledWith("pikachu");
    });
    expect(screen.getByTestId("loading-pikachu")).toBeInTheDocument();

    // El fetch resuelve "instantáneamente" (caché). Pero el
    // aggregator retrasa `setIsReady(true)` hasta cumplir
    // `minVisibleMs=800ms`.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    // Tras 50 ms (carga rápida completada), el pikachu SIGUE
    // visible porque aún no se ha cumplido el mínimo.
    expect(screen.getByTestId("loading-pikachu")).toBeInTheDocument();

    // Tras 800 ms totales, sí se marca como ready (pero el
    // LoadingPikachu espera al animationend para desmontar).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    // El aggregator ya no está "loading".
    expect(
      screen.getByTestId("data-loading-aggregator").getAttribute("data-loading"),
    ).toBe("false");

    // Pero el LoadingPikachu sigue montado (esperando al
    // animationend). Disparamos animationend manualmente.
    const img = screen.getByTestId("loading-pikachu").querySelector("img")!;
    act(() => {
      img.dispatchEvent(new Event("animationend"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("loading-pikachu")).toBeNull();
    });

    vi.useRealTimers();
  });

  it("si la API tarda MÁS que minVisibleMs, NO se añade retardo artificial", async () => {
    // Carga lenta (>minVisibleMs): el pikachu sigue visible
    // durante toda la carga real, sin forzar tiempo extra.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    gotoPath("/pokemon/pikachu");
    // Fetch que tarda 2000 ms (más que el minVisibleMs=800).
    const deferredSlow: { resolve: ResolveDetail | null } = { resolve: null };
    vi.mocked(api.fetchPokemonDetail).mockReturnValueOnce(
      new Promise<PokemonDetail>((resolve) => {
        deferredSlow.resolve = resolve as unknown as ResolveDetail;
      }) as PokemonDetailPromise,
    );

    render(
      <Harness>
        <DataLoadingAggregator minVisibleMs={800} />
      </Harness>,
    );

    await waitFor(() => {
      expect(api.fetchPokemonDetail).toHaveBeenCalledWith("pikachu");
    });
    expect(screen.getByTestId("loading-pikachu")).toBeInTheDocument();

    // Tras 1500 ms (más que minVisibleMs pero la API no ha
    // respondido), el pikachu SIGUE visible.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.getByTestId("loading-pikachu")).toBeInTheDocument();

    // La API responde tras 2000 ms totales.
    await act(async () => {
      deferredSlow.resolve?.(pikachuDetail());
    });
    // Como elapsed (≈2000ms) > minVisibleMs (800ms), se marca
    // como ready inmediatamente.
    expect(
      screen.getByTestId("data-loading-aggregator").getAttribute("data-loading"),
    ).toBe("false");

    vi.useRealTimers();
  });

  it("al cambiar de pokemon a null, cancela fetch pendiente y timer de ready", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    gotoPath("/pokedex");
    const deferred: { resolve: ResolveDetail | null } = { resolve: null };
    vi.mocked(api.fetchPokemonDetail).mockReturnValueOnce(
      new Promise<PokemonDetail>((resolve) => {
        deferred.resolve = resolve as unknown as ResolveDetail;
      }) as PokemonDetailPromise,
    );
    const resolveDetail = (): ResolveDetail | null => deferred.resolve;

    // Usamos `pokemonNameOverride` para poder cambiar el
    // pokemon seleccionado sin tener que manipular el
    // `window.history` real (el `AppShellProvider` lee el
    // pathname una sola vez al montar).
    const { rerender } = render(
      <Harness>
        <DataLoadingAggregator minVisibleMs={500} pokemonNameOverride="pikachu" />
      </Harness>,
    );

    await waitFor(() => {
      expect(api.fetchPokemonDetail).toHaveBeenCalledWith("pikachu");
    });
    expect(screen.getByTestId("loading-pikachu")).toBeInTheDocument();

    // Cambiamos a sin pokemon. El aggregator debe:
    //  - cancelar el fetch pendiente (cancelledRef = true).
    //  - marcar isReady=true (no hay nada que cargar).
    rerender(
      <Harness>
        <DataLoadingAggregator minVisibleMs={500} pokemonNameOverride={null} />
      </Harness>,
    );

    // El aggregator ya no está "loading".
    expect(
      screen.getByTestId("data-loading-aggregator").getAttribute("data-loading"),
    ).toBe("false");

    // El LoadingPikachu está marcado para desmontar al final del
    // ciclo de animación actual (consistente con el contrato del
    // componente: nunca se corta a mitad). Disparamos animationend
    // para verificar que se desmonta limpiamente.
    const img = screen.getByTestId("loading-pikachu").querySelector("img")!;
    act(() => {
      img.dispatchEvent(new Event("animationend"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("loading-pikachu")).toBeNull();
    });

    // Cleanup: si la promesa pendiente se resuelve, no debe
    // causar warning de "set state on unmounted" ni afectar el
    // estado (la cancelación del effect ya invalidó el resultado).
    resolveDetail()?.(pikachuDetail());
    // Limpiamos timers pendientes para evitar warnings de fake
    // timers.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    vi.useRealTimers();
  });

  it("NO hace fetch del detalle si no hay pokemon seleccionado", async () => {
    gotoPath("/pokedex");

    render(
      <Harness>
        <DataLoadingAggregator minVisibleMs={50} />
      </Harness>,
    );

    // Pequeño respiro para que el effect corra.
    await new Promise((r) => setTimeout(r, 20));

    expect(api.fetchPokemonDetail).not.toHaveBeenCalled();
  });

  it("FIX bug frame-perdido: el pikachu se monta en el MISMO frame que se selecciona un pokemon", async () => {
    // Sin frame perdido entre seleccionar pokemon y montar
    // pikachu. Verifica el patrón "store previous value": cuando
    // `selectedName` pasa de null a un pokemon, `isLoading` ya
    // debe ser `true` en el primer render post-seleccion.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    gotoPath("/pokedex");
    const deferred: { resolve: ResolveDetail | null } = { resolve: null };
    vi.mocked(api.fetchPokemonDetail).mockReturnValueOnce(
      new Promise<PokemonDetail>((resolve) => {
        deferred.resolve = resolve as unknown as ResolveDetail;
      }) as PokemonDetailPromise,
    );
    const resolveDetail = (): ResolveDetail | null => deferred.resolve;

    // Render inicial sin pokemon → no pikachu.
    const { rerender } = render(
      <Harness>
        <DataLoadingAggregator minVisibleMs={500} pokemonNameOverride={null} />
      </Harness>,
    );
    expect(screen.queryByTestId("loading-pikachu")).toBeNull();

    // Cambiamos a un pokemon. Tras el rerender, el pikachu debe
    // estar montado SIN necesidad de esperar a un effect/timer.
    rerender(
      <Harness>
        <DataLoadingAggregator minVisibleMs={500} pokemonNameOverride="pikachu" />
      </Harness>,
    );
    expect(screen.getByTestId("loading-pikachu")).toBeInTheDocument();
    expect(
      screen.getByTestId("data-loading-aggregator").getAttribute("data-loading"),
    ).toBe("true");

    // Cleanup.
    resolveDetail()?.(pikachuDetail());
    vi.useRealTimers();
  });

  it("lanza error si se usa sin el PokedexPageProvider (defensivo)", () => {
    expect(() =>
      render(
        <FiltersProvider>
          <AppShellProvider initialView="pokedex">
            <DataLoadingAggregator />
          </AppShellProvider>
        </FiltersProvider>,
      ),
    ).toThrow(/PokedexPageProvider/);
  });
});
