import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  TransitionOrchestratorProvider,
  useTransitionOrchestrator,
} from "@/src/components/transitions/TransitionOrchestratorContext";
import {
  getPokedexPreloadSources,
  getHomePreloadSources,
  preloadSources,
  registerAsset,
  resetPreloadCache,
} from "@/src/components/transitions/assetPreloader";
import * as assetPreloader from "@/src/components/transitions/assetPreloader";

/**
 * Plan 04.1 — TDD del contexto que orquesta las transiciones animadas
 * entre la pantalla de inicio y la Pokédex.
 *
 * Responsabilidades del orquestador:
 *
 *   1. Exponer `transitionTo(target)` que:
 *      - Devuelve una promesa que NO resuelve hasta que los assets
 *        del destino estén cargados.
 *      - Bloquea dobles llamadas concurrentes (`isTransitioning`).
 *      - Al resolver, hace `router.push(target.path)` con
 *        `{ scroll: false }`.
 *   2. Exponer el estado `isTransitioning` para que la UI pueda
 *        deshabilitar listeners y mostrar el overlay de carga.
 *   3. Centralizar el preload de assets por destino.
 *
 * Diseño:
 *   - Provider con `router` inyectable (mocks en tests).
 *   - Hook `useTransitionOrchestrator()` lanza error si se usa fuera
 *     del provider (mejor fallar pronto que tener un `false` mudo).
 *
 * Notas de aceptación (criterios del plan):
 *   - "La transición es secuencial y reproducible": el orden de
 *     pasos es fijo; garantizamos que el preload ocurre antes del
 *     push.
 *   - "Si un asset no está cargado, la transición espera": lo
 *     cubrimos bloqueando la promesa hasta que el `preloadSources`
 *     del destino se complete.
 *   - "No se puede disparar dos veces en paralelo": el flag
 *     `isTransitioning` evita una segunda invocación mientras la
 *     primera no haya terminado.
 */

interface FakeRouter {
  push: (url: string, options?: { scroll?: boolean }) => void | Promise<void>;
}

function makeRouter(): FakeRouter {
  return { push: vi.fn() };
}

function wrapperWith(router: FakeRouter) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TransitionOrchestratorProvider router={router}>
        {children}
      </TransitionOrchestratorProvider>
    );
  }
  Wrapper.displayName = "OrchestratorWrapper";
  return Wrapper;
}

describe("TransitionOrchestratorContext (Plan 04.1)", () => {
  beforeEach(() => {
    resetPreloadCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("estado inicial: isTransitioning es false y transitionTo es una función", () => {
    const router = makeRouter();
    const { result } = renderHook(() => useTransitionOrchestrator(), {
      wrapper: wrapperWith(router),
    });
    expect(result.current.isTransitioning).toBe(false);
    expect(typeof result.current.transitionTo).toBe("function");
  });

  it("useTransitionOrchestrator fuera del provider lanza error informativo", () => {
    expect(() => renderHook(() => useTransitionOrchestrator())).toThrow(
      /TransitionOrchestratorProvider/i,
    );
  });

  it("transitionTo('pokedex') hace router.push('/pokedex', { scroll: false }) tras el preload", async () => {
    const router = makeRouter();
    const { result } = renderHook(() => useTransitionOrchestrator(), {
      wrapper: wrapperWith(router),
    });

    const transitionTo = result.current.transitionTo;
    const callOrder: string[] = [];
    await act(async () => {
      callOrder.push("transitionTo-called");
      await transitionTo("pokedex");
      callOrder.push("transitionTo-resolved");
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
    // El preload ocurre antes del push (dentro de la misma promesa).
    expect(callOrder).toEqual(["transitionTo-called", "transitionTo-resolved"]);
  });

  it("transitionTo NO dispara router.push si el preload está pendiente", async () => {
    const router = makeRouter();
    const { result } = renderHook(() => useTransitionOrchestrator(), {
      wrapper: wrapperWith(router),
    });

    let resolvePreload: (() => void) | null = null;
    const slow = vi
      .spyOn(assetPreloader, "preloadSources")
      .mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePreload = resolve;
          }),
      );

    // Capturamos la función antes de cualquier re-render para evitar
    // leer un `result.current` stale tras `setIsTransitioning(true)`.
    const transitionTo = result.current.transitionTo;

    let transitionPromise: Promise<void> = Promise.resolve();
    act(() => {
      transitionPromise = transitionTo("pokedex");
    });

    // Mientras el preload está pendiente, NO debe haberse llamado a push.
    expect(router.push).not.toHaveBeenCalled();
    expect(result.current.isTransitioning).toBe(true);

    // Completamos el preload.
    await act(async () => {
      resolvePreload?.();
      await transitionPromise;
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(slow).toHaveBeenCalled();
  });

  it("transitionTo no se puede disparar dos veces en paralelo: la segunda llamada es no-op hasta que la primera termine", async () => {
    const router = makeRouter();
    const { result } = renderHook(() => useTransitionOrchestrator(), {
      wrapper: wrapperWith(router),
    });

    let resolveFirst: (() => void) | null = null;
    vi.spyOn(assetPreloader, "preloadSources").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const transitionTo = result.current.transitionTo;
    let firstPromise: Promise<void> = Promise.resolve();
    let secondPromise: Promise<void> = Promise.resolve();
    act(() => {
      firstPromise = transitionTo("pokedex");
    });
    act(() => {
      secondPromise = transitionTo("pokedex");
    });

    // Sólo hay UN preload en curso (la segunda llamada fue ignorada).
    await act(async () => {
      resolveFirst?.();
      await Promise.all([firstPromise, secondPromise]);
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(result.current.isTransitioning).toBe(false);
  });

  it("isTransitioning vuelve a false incluso si router.push lanza (regresión del estado atascado)", async () => {
    const router = makeRouter();
    router.push = vi.fn(() => {
      throw new Error("router boom");
    });
    const { result } = renderHook(() => useTransitionOrchestrator(), {
      wrapper: wrapperWith(router),
    });

    const transitionTo = result.current.transitionTo;
    await act(async () => {
      try {
        await transitionTo("pokedex");
      } catch {
        // esperado
      }
    });

    expect(result.current.isTransitioning).toBe(false);
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("transitionTo('home') hace router.push('/', { scroll: false }) tras preload de assets de inicio", async () => {
    const router = makeRouter();
    const { result } = renderHook(() => useTransitionOrchestrator(), {
      wrapper: wrapperWith(router),
    });

    const transitionTo = result.current.transitionTo;
    await act(async () => {
      await transitionTo("home");
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/", { scroll: false });
  });

  it("el provider delega el router (no se acopla a next/navigation en el módulo del orquestador)", async () => {
    const router = makeRouter();
    function Probe() {
      const { isTransitioning } = useTransitionOrchestrator();
      return <span data-testid="probe">{String(isTransitioning)}</span>;
    }
    await act(async () => {
      render(
        <TransitionOrchestratorProvider router={router}>
          <Probe />
        </TransitionOrchestratorProvider>,
      );
    });
    expect(screen.getByTestId("probe")).toHaveTextContent("false");
  });
});

describe("preloadSources / registerAsset / resetPreloadCache (Plan 04.1)", () => {
  let originalImage: typeof Image | undefined;

  beforeEach(() => {
    resetPreloadCache();
    originalImage = (globalThis as { Image?: typeof Image }).Image;
    // Sustituimos Image por uno que NO dispara onload automáticamente,
    // simulando el comportamiento del navegador real (donde el asset
    // tarda en cargar). Esto nos permite verificar que `preloadSources`
    // espera al `registerAsset` externo.
    function FakeImage() {
      const listeners: { onload: (() => void) | null; onerror: ((err: unknown) => void) | null } = {
        onload: null,
        onerror: null,
      };
      const img = {
        set src(_value: string) {
          // No disparamos onload: simulamos "asset aún cargando".
        },
        get src() {
          return "";
        },
        onload: null as (() => void) | null,
        onerror: null as ((err: unknown) => void) | null,
      };
      Object.defineProperty(img, "onload", {
        get() {
          return listeners.onload;
        },
        set(v: (() => void) | null) {
          listeners.onload = v;
        },
      });
      Object.defineProperty(img, "onerror", {
        get() {
          return listeners.onerror;
        },
        set(v: ((err: unknown) => void) | null) {
          listeners.onerror = v;
        },
      });
      return img as unknown as HTMLImageElement;
    }
    (globalThis as { Image?: typeof Image }).Image =
      FakeImage as unknown as typeof Image;
  });

  afterEach(() => {
    (globalThis as { Image?: typeof Image }).Image = originalImage;
  });

  it("getHomePreloadSources cubre todos los SVGs de la pantalla de inicio", () => {
    const sources = getHomePreloadSources();
    expect(sources).toEqual(
      expect.arrayContaining([
        "/pagina_inicio/logo.svg",
        "/pagina_inicio/ash.svg",
        "/pagina_inicio/pokedex_cerrada.svg",
        "/pagina_inicio/tileFondo.png",
        "/pagina_inicio/charmander.svg",
        "/pagina_inicio/ponita.svg",
        "/pagina_inicio/caterpi.svg",
        "/pagina_inicio/squirtle.svg",
        "/pagina_inicio/pikachu.svg",
        "/pagina_inicio/rinomer.svg",
        "/pagina_inicio/bulbasur.svg",
        "/pagina_inicio/onix.svg",
        "/pagina_inicio/abra.svg",
        "/pagina_inicio/magicarp.svg",
      ]),
    );
  });

  it("getPokedexPreloadSources contiene las dos carcases (horizontal y vertical)", () => {
    const sources = getPokedexPreloadSources();
    expect(sources).toEqual(
      expect.arrayContaining([
        "/pokedex_horizontal.svg",
        "/pokedex_vertical.svg",
      ]),
    );
  });

  it("preloadSources([src]) resuelve sólo cuando el asset ha sido registrado", async () => {
    const src = "/pagina_inicio/test-asset.svg";
    const promise = preloadSources([src]);

    let settled = false;
    promise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    registerAsset(src);
    await expect(promise).resolves.toBeUndefined();
  });

  it("preloadSources([src]) es idempotente: si el asset ya estaba cargado, resuelve inmediatamente", async () => {
    const src = "/pagina_inicio/idempotent.svg";
    registerAsset(src);
    await expect(preloadSources([src])).resolves.toBeUndefined();
  });

  it("resetPreloadCache descarta los assets ya marcados como cargados", async () => {
    const src = "/pagina_inicio/asset-x.svg";
    registerAsset(src);
    await expect(preloadSources([src])).resolves.toBeUndefined();

    resetPreloadCache();

    const promise = preloadSources([src]);
    let settled = false;
    promise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
  });
});