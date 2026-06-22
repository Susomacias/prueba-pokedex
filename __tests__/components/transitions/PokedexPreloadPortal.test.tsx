import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { PokedexPreloadPortal } from "@/src/components/transitions/PokedexPreloadPortal";
import { pokedexPreloadBus } from "@/src/components/transitions/pokedexPreloadBus";
import * as cachedPokemonApi from "@/src/lib/pokemon/cachedPokemonApi";

/**
 * Plan 04 (precarga) — TDD del `PokedexPreloadPortal`.
 *
 * El portal es el componente que materializa el requisito del borrador:
 *
 *   "Creamos una pokedex (Horizontal o vertical dependiendo del
 *    tamaño de la pantalla) en la parte inferior fuera de la pantalla
 *    para estar lista para hacer la transición, la carga se hará de
 *    forma asíncrona para que el usuario no espere a que aparezca."
 *
 * Lo que verifica este test:
 *   1. Al montarse, fija `data-pokedex-preload="loading"` y empuja el
 *      estado al bus.
 *   2. Inicia la carga de la lista de pokemons (preload) sin bloquear
 *      al usuario.
 *   3. Cuando la lista termina de cargar, fija
 *      `data-pokedex-preload="ready"` y empuja el estado al bus.
 *   4. Posiciona la Pokédex con `transform: translateY(100%)` y
 *      `visibility: hidden` para que NUNCA sea visible al usuario
 *      mientras está en la Home.
 *   5. Si la carga falla, el portal debe seguir marcando "ready" con
 *      datos vacíos para no bloquear la transición indefinidamente.
 *
 * Estrategia:
 *   - Mockeamos `preloadPokemonList` y `getCachedPokemonList` para que
 *     el test sea determinista.
 *   - Renderizamos el portal como lo haría `HomeShell` (dentro del
 *     árbol de la Home, no necesita `AppTransitionShell` ni
 *     `HomeTransitionOut`).
 *   - Verificamos los atributos DOM y los cambios de estado del bus.
 */

function makeEmptyList(count = 30) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    types: ["normal"],
    habitat: null,
    generation: 1,
    spriteUrl: null,
    cryUrl: null,
  }));
}

function makeDeferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface RenderOpts {
  preloadList?: ReturnType<typeof vi.fn>;
  listResult?: ReturnType<typeof makeEmptyList> | null;
}

function renderPortal({ preloadList, listResult = makeEmptyList() }: RenderOpts) {
  preloadList ??= vi.fn().mockResolvedValue(undefined);
  vi.spyOn(cachedPokemonApi, "preloadPokemonList").mockImplementation(
    preloadList as never,
  );
  vi.spyOn(cachedPokemonApi, "getCachedPokemonList").mockResolvedValue(
    listResult as never,
  );

  function Wrapper({ children }: { children?: ReactNode }) {
    return <>{children}</>;
  }

  return {
    preloadList,
    ...render(
      <Wrapper>
        <PokedexPreloadPortal />
      </Wrapper>,
    ),
  };
}

describe("PokedexPreloadPortal (Plan 04 — precarga en Home)", () => {
  beforeEach(() => {
    pokedexPreloadBus._resetForTests();
  });

  afterEach(() => {
    pokedexPreloadBus._resetForTests();
    vi.restoreAllMocks();
  });

  it("estado inicial: el portal marca data-pokedex-preload='loading' y empuja estado al bus", async () => {
    const { container } = renderPortal({});

    const host = container.querySelector(
      '[data-testid="pokedex-preload-portal"]',
    );
    expect(host).not.toBeNull();
    expect(host!.getAttribute("data-pokedex-preload")).toBe("loading");
    expect(pokedexPreloadBus.getStatus()).toBe("loading");
  });

  it("cuando la lista termina de cargar, marca data-pokedex-preload='ready' y notifica al bus", async () => {
    const { preloadList } = renderPortal({});

    await act(async () => {
      await preloadList.mock.results[0]!.value;
    });
    // Tras la carga, el bus debe pasar a "ready" y el atributo también.
    expect(pokedexPreloadBus.getStatus()).toBe("ready");
    const host = screen.getByTestId("pokedex-preload-portal");
    expect(host.getAttribute("data-pokedex-preload")).toBe("ready");
  });

  it("la Pokédex está FUERA del viewport y NO visible mientras está en la Home", () => {
    const { container } = renderPortal({});
    const host = container.querySelector(
      '[data-testid="pokedex-preload-portal"]',
    ) as HTMLElement | null;
    expect(host).not.toBeNull();
    // Posicionada con `translateY(100%)` para estar fuera del viewport.
    expect(host!.className).toMatch(/translate-y-full/);
    // Y oculta al usuario mientras la Home está activa.
    expect(host!.className).toMatch(/invisible/);
  });

  it("la precarga se hace en background (no bloquea el render inicial)", async () => {
    const deferred = makeDeferred<void>();
    const preloadList = vi.fn().mockReturnValue(deferred.promise);
    renderPortal({ preloadList });

    // Tras el primer render, el componente ya está montado y marcado
    // como "loading" — la promesa del preload aún no ha resuelto.
    expect(pokedexPreloadBus.getStatus()).toBe("loading");
    expect(preloadList).toHaveBeenCalledTimes(1);

    // La Pokédex sigue oculta. Resolvemos el preload manualmente.
    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });
    expect(pokedexPreloadBus.getStatus()).toBe("ready");
  });

  it("si la carga falla, el portal termina en estado 'ready' con datos vacíos para no bloquear la transición", async () => {
    const preloadList = vi
      .fn()
      .mockRejectedValue(new Error("network boom"));
    const { container } = renderPortal({
      preloadList,
      listResult: [],
    });

    // El rechazo se controla internamente: esperamos a que la promesa
    // microtask complete para no contaminar la salida del test.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(pokedexPreloadBus.getStatus()).toBe("ready");
    const host = container.querySelector(
      '[data-testid="pokedex-preload-portal"]',
    );
    expect(host!.getAttribute("data-pokedex-preload")).toBe("ready");
  });

  it("el portal expone data-pokemon-mount='hidden' mientras la Home está activa", () => {
    const { container } = renderPortal({});
    const host = container.querySelector(
      '[data-testid="pokedex-preload-portal"]',
    );
    expect(host!.getAttribute("data-pokemon-mount")).toBe("hidden");
  });

  it("hay UN SOLO portal montado en el árbol (no se duplica)", () => {
    const { container } = renderPortal({});
    const portals = container.querySelectorAll(
      '[data-testid="pokedex-preload-portal"]',
    );
    expect(portals.length).toBe(1);
  });
});
