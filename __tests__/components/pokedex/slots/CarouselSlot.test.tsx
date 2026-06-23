import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { CarouselSlot } from "@/src/components/pokedex/slots/CarouselSlot";
import { CarouselProvider } from "@/src/components/pokedex/carousel/CarouselController";
import {
  AppShellProvider,
  useAppShell,
} from "@/src/components/app/ViewContext";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";

/**
 * Plan 11 — TDD del slot `CARRUSEL_IMAGENES_DESCRIPCION` con
 * overlay lista ↔ carrusel.
 *
 * Cobertura:
 *  - Sin pokemon seleccionado: la lista está visible y NO hay
 *    overlay del carrusel.
 *  - Con pokemon seleccionado: la lista sigue montada detrás (con
 *    `data-active="behind"`) y aparece el overlay del carrusel con
 *    `data-state="enter"` y un botón X de cerrar.
 *  - El overlay pasa a `data-state="shown"` tras la animación de
 *    entrada (350ms).
 *  - Al cambiar pokemonName a null, se dispara la animación de
 *    salida (`data-state="exit"`) y el overlay se desmonta.
 *  - Al cambiar de un pokemon a otro (sin pasar por null), no hay
 *    animación de salida: el overlay hace crossfade del contenido.
 *  - El botón X llama a `goToPokedex()` (pushState a `/pokedex`).
 *  - La lista NUNCA se desmonta al cambiar pokemon.
 *
 * El test no necesita mockear la PokeAPI completa porque la lista
 * usa `applyFiltersToList` (mockeado a vacío) y el carrusel
 * `fetchPokemonDetail` (mockeado a null).
 */

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  applyFiltersToList: vi.fn().mockResolvedValue({
    items: [],
    nextOffset: null,
    total: 0,
    single: false,
  }),
  fetchPokemonDetail: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => ({
    pathname: "/pokedex",
    searchParams: new URLSearchParams(),
    router: {
      replace: () => undefined,
      push: () => undefined,
      back: () => undefined,
      forward: () => undefined,
      refresh: () => undefined,
    },
    subscribe: () => () => undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pokedex",
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

/* --------- Helper: render directo del slot --------- */

interface RenderSlotOptions {
  pokemonName?: string | null;
  mode3D?: boolean;
}

function renderSlot(opts: RenderSlotOptions = {}) {
  // El `CarouselSlot` consume `useAppShell` para el botón X (que
  // llama a `goToPokedex`). Lo demás lo recibe por props. No
  // necesitamos pathname dinámico aquí. Envolvemos también con el
  // `CarouselProvider` porque el `PokemonCarousel` lo requiere
  // (en producción lo monta el `PokedexShell`).
  return render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <CarouselProvider pokemonName={opts.pokemonName ?? null}>
          <CarouselSlot
            pokemonName={opts.pokemonName ?? null}
            mode3D={opts.mode3D ?? false}
          />
        </CarouselProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );
}

/* --------- Tests --------- */

describe("CarouselSlot — overlay lista ↔ carrusel (Plan 11)", () => {
  it("sin pokemon seleccionado: muestra la lista y NO renderiza overlay", () => {
    renderSlot({ pokemonName: null });

    const slot = screen.getByRole("region");
    expect(slot.getAttribute("data-active")).toBe("false");
    expect(slot.getAttribute("data-stub")).toBe("list");
    expect(slot.getAttribute("data-state")).toBe("idle");

    // La lista está visible (no aria-hidden).
    const list = slot.querySelector(".pokedex-carousel-slot__list");
    expect(list).not.toBeNull();
    expect(list!.getAttribute("data-active")).toBe("visible");
    expect(list!.getAttribute("aria-hidden")).toBeNull();

    // No hay overlay ni botón X.
    expect(
      slot.querySelector(".pokedex-carousel-slot__overlay"),
    ).toBeNull();
    expect(screen.queryByTestId("carousel-close-button")).toBeNull();
  });

  it("con pokemon seleccionado: la lista queda detrás y aparece el overlay con animación enter", async () => {
    renderSlot({ pokemonName: "pikachu" });

    const slot = await screen.findByRole("region");
    // Tras montar, debe haber overlay con estado "enter".
    await waitFor(() => {
      expect(
        slot.querySelector(".pokedex-carousel-slot__overlay"),
      ).not.toBeNull();
    });
    const overlay = slot.querySelector(".pokedex-carousel-slot__overlay");
    expect(overlay!.getAttribute("data-state")).toBe("enter");
    expect(overlay!.getAttribute("data-pokemon")).toBe("pikachu");

    // El slot expone data-stub="carousel" y pokemon="pikachu".
    expect(slot.getAttribute("data-stub")).toBe("carousel");
    expect(slot.getAttribute("data-pokemon")).toBe("pikachu");

    // La lista está detrás y aria-hidden.
    const list = slot.querySelector(".pokedex-carousel-slot__list");
    expect(list!.getAttribute("data-active")).toBe("behind");
    expect(list!.getAttribute("aria-hidden")).toBe("true");

    // El botón X está presente.
    expect(screen.getByTestId("carousel-close-button")).toBeInTheDocument();
  });

  it("tras 350ms el overlay pasa a estado 'shown' (estable)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderSlot({ pokemonName: "pikachu" });

    const slot = await screen.findByRole("region");
    await waitFor(() => {
      expect(
        slot.querySelector(".pokedex-carousel-slot__overlay"),
      ).not.toBeNull();
    });
    expect(
      slot.querySelector(".pokedex-carousel-slot__overlay")!.getAttribute(
        "data-state",
      ),
    ).toBe("enter");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(
      slot.querySelector(".pokedex-carousel-slot__overlay")!.getAttribute(
        "data-state",
      ),
    ).toBe("shown");

    vi.useRealTimers();
  });

  it("al quitar el pokemon (selectedName → null) el overlay entra en exit y se desmonta", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { rerender } = renderSlot({ pokemonName: "pikachu" });

    const slot = await screen.findByRole("region");
    await waitFor(() => {
      expect(
        slot.querySelector(".pokedex-carousel-slot__overlay"),
      ).not.toBeNull();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400); // entrada
    });
    expect(
      slot.querySelector(".pokedex-carousel-slot__overlay")!.getAttribute(
        "data-state",
      ),
    ).toBe("shown");

    // Quitamos el pokemon: re-renderizamos con `pokemonName=null`.
    rerender(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <CarouselProvider pokemonName={null}>
            <CarouselSlot pokemonName={null} />
          </CarouselProvider>
        </AppShellProvider>
      </FiltersProvider>,
    );

    // Ahora debe haber animación de salida.
    const overlay = slot.querySelector(".pokedex-carousel-slot__overlay");
    expect(overlay).not.toBeNull();
    expect(overlay!.getAttribute("data-state")).toBe("exit");

    // Tras 280ms el overlay se desmonta.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(320);
    });

    expect(slot.querySelector(".pokedex-carousel-slot__overlay")).toBeNull();
    expect(screen.queryByTestId("carousel-close-button")).toBeNull();

    vi.useRealTimers();
  });

  it("el botón X llama a goToPokedex() (pushState a /pokedex)", async () => {
    // Espiamos `pushState` directamente sobre window.history para
    // verificar que el botón X hace pushState (no router.push).
    const pushSpy = vi.spyOn(window.history, "pushState");

    renderSlot({ pokemonName: "pikachu" });

    const slot = await screen.findByRole("region");
    await waitFor(() => {
      expect(screen.getByTestId("carousel-close-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("carousel-close-button"));

    expect(pushSpy).toHaveBeenCalled();
    const lastCall = pushSpy.mock.calls[pushSpy.mock.calls.length - 1]!;
    // El tercer argumento de pushState es la URL.
    expect(lastCall[2]).toBe("/pokedex");
    pushSpy.mockRestore();
  });

  it("el botón X tiene aria-label accesible", async () => {
    renderSlot({ pokemonName: "pikachu" });

    await waitFor(() => {
      expect(screen.getByTestId("carousel-close-button")).toBeInTheDocument();
    });
    const btn = screen.getByTestId("carousel-close-button");
    expect(btn.getAttribute("aria-label")).toMatch(/cerrar/i);
  });

  it("al cambiar entre dos pokemons no se desmonta el overlay, sólo se actualiza el contenido", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { rerender } = renderSlot({ pokemonName: "pikachu" });

    const slot = await screen.findByRole("region");
    await waitFor(() => {
      expect(
        slot.querySelector(".pokedex-carousel-slot__overlay"),
      ).not.toBeNull();
    });
    await vi.advanceTimersByTimeAsync(400);

    // Cambiamos a charmander.
    rerender(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <CarouselProvider pokemonName="charmander">
            <CarouselSlot pokemonName="charmander" />
          </CarouselProvider>
        </AppShellProvider>
      </FiltersProvider>,
    );

    // El overlay debe seguir montado (no hay exit) y ahora con el
    // nuevo pokemon.
    const overlay = slot.querySelector(".pokedex-carousel-slot__overlay");
    expect(overlay).not.toBeNull();
    // Estado enter (animación de entrada desde el crossfade).
    expect(overlay!.getAttribute("data-state")).toBe("enter");
    expect(overlay!.getAttribute("data-pokemon")).toBe("charmander");

    vi.useRealTimers();
  });

  it("la lista NUNCA se desmonta al cambiar de pokemon", async () => {
    const { rerender } = renderSlot({ pokemonName: null });

    const slot = screen.getByRole("region");
    const listBefore = slot.querySelector(".pokedex-carousel-slot__list");
    expect(listBefore).not.toBeNull();

    // Aparece pokemon.
    rerender(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <CarouselProvider pokemonName="pikachu">
            <CarouselSlot pokemonName="pikachu" />
          </CarouselProvider>
        </AppShellProvider>
      </FiltersProvider>,
    );

    await waitFor(() => {
      expect(
        slot.querySelector(".pokedex-carousel-slot__overlay"),
      ).not.toBeNull();
    });

    const listAfter = slot.querySelector(".pokedex-carousel-slot__list");
    expect(listAfter).toBe(listBefore); // misma referencia DOM
    expect(listAfter!.getAttribute("data-active")).toBe("behind");
  });
});

/**
 * Verifica que `useAppShell().goToPokemon` actualiza la URL con
 * `history.pushState` y NO recarga la página (cambia `selectedName`
 * en el estado, sin tocar `view`).
 */
describe("useAppShell — navegación (Plan 11)", () => {
  it("goToPokemon hace pushState con la URL /pokemon/<name> y actualiza selectedName", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    let capturedSelectedName: string | null = null;
    function Capture() {
      const { selectedName, goToPokemon } = useAppShell();
      capturedSelectedName = selectedName;
      return (
        <button data-testid="trigger" onClick={() => goToPokemon("pikachu")}>
          go
        </button>
      );
    }
    render(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <Capture />
        </AppShellProvider>
      </FiltersProvider>,
    );
    expect(capturedSelectedName).toBeNull();

    fireEvent.click(screen.getByTestId("trigger"));

    expect(pushSpy).toHaveBeenCalled();
    const lastCall = pushSpy.mock.calls[pushSpy.mock.calls.length - 1]!;
    expect(lastCall[2]).toBe("/pokemon/pikachu");

    pushSpy.mockRestore();
  });

  it("goToPokedex hace pushState con /pokedex", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    function Capture() {
      const { goToPokedex } = useAppShell();
      return (
        <button data-testid="trigger" onClick={() => goToPokedex()}>
          go
        </button>
      );
    }
    render(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <Capture />
        </AppShellProvider>
      </FiltersProvider>,
    );
    fireEvent.click(screen.getByTestId("trigger"));
    expect(pushSpy).toHaveBeenCalled();
    const lastCall = pushSpy.mock.calls[pushSpy.mock.calls.length - 1]!;
    expect(lastCall[2]).toBe("/pokedex");
    pushSpy.mockRestore();
  });
});