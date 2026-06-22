import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  CarouselProvider,
  useCarousel,
} from "@/src/components/pokedex/carousel/CarouselController";
import { PokemonCarousel } from "@/src/components/pokedex/carousel/PokemonCarousel";
import type { PokemonDetail } from "@/src/lib/types/pokemon";

/**
 * Plan 06.3 — TDD del carrusel de imágenes + info.
 *
 * Cobertura:
 *  - Renderiza N diapositivas (máx 7) según sprites disponibles.
 *  - Slide 1 = imagen principal grande.
 *  - Slide 2 = imagen pequeña izq + flavor text (es) der con scroll.
 *  - Slides 3..N = otras imágenes (front_shiny, back_default, etc.).
 *  - Auto-avance cada 5s.
 *  - Nombre del pokemon siempre visible arriba-izq.
 *  - Al pulsar el botón "siguiente" del controller, el auto-avance
 *    se detiene (vía `useCarousel`).
 */

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  fetchPokemonDetail: vi.fn(),
}));

import { fetchPokemonDetail } from "@/src/lib/pokemon/cachedPokemonApi";

const mockedFetch = vi.mocked(fetchPokemonDetail);

/* ---------- Fixtures ---------- */

function makeDetail(overrides: Partial<PokemonDetail> = {}): PokemonDetail {
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
    generation: "generation-i",
    habitat: "bosque",
    types: [{ slot: 1, name: "electric" }],
    stats: [
      { name: "hp", baseStat: 35 },
      { name: "attack", baseStat: 55 },
    ],
    abilities: [{ name: "static", isHidden: false, slot: 1 }],
    sprites: {
      frontDefault: "https://example.test/pikachu-front.png",
      frontShiny: "https://example.test/pikachu-shiny.png",
      backDefault: "https://example.test/pikachu-back.png",
      backShiny: "https://example.test/pikachu-back-shiny.png",
      officialArtwork: "https://example.test/pikachu-official.png",
      officialArtworkShiny: "https://example.test/pikachu-official-shiny.png",
      homeFront: "https://example.test/pikachu-home.png",
      homeShiny: "https://example.test/pikachu-home-shiny.png",
    },
    cryLatestUrl: "https://example.test/pikachu.cry.ogg",
    flavorText:
      "Cuando se enfada, descarga la energía almacenada en las bolsas de las mejillas.",
    flavorTextVersion: "yellow",
    evolutionChain: [],
    ...overrides,
  };
}

function renderCarousel(pokemonName: string | null = "pikachu"): ReturnType<typeof render> {
  return render(
    <CarouselProvider pokemonName={pokemonName}>
      <PokemonCarousel />
    </CarouselProvider>,
  );
}

/* ---------- Tests ---------- */

describe("PokemonCarousel (Plan 06.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("carga el detalle al montar y muestra el nombre siempre visible", async () => {
    mockedFetch.mockResolvedValueOnce(makeDetail());

    renderCarousel();

    // Mientras carga, no debe haber slides.
    expect(screen.queryAllByTestId("pokemon-carousel-slide")).toHaveLength(0);

    await waitFor(() => {
      expect(screen.getByText("pikachu")).toBeInTheDocument();
    });
    // El nombre vive FUERA del track, en una cabecera persistente.
    const header = screen.getByTestId("pokemon-carousel-name");
    expect(header.textContent).toBe("pikachu");
    expect(mockedFetch).toHaveBeenCalledWith("pikachu");
  });

  it("renderiza 7 diapositivas cuando todos los sprites están disponibles", async () => {
    mockedFetch.mockResolvedValueOnce(makeDetail());

    renderCarousel();

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-carousel-slide")).toHaveLength(7);
    });
  });

  it("la diapositiva 1 es la imagen principal grande (front_default)", async () => {
    mockedFetch.mockResolvedValueOnce(makeDetail());

    renderCarousel();

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-carousel-slide")).toHaveLength(7);
    });
    const slide1 = screen.getAllByTestId("pokemon-carousel-slide")[0]!;
    const img = slide1.querySelector("img");
    expect(img?.getAttribute("src")).toContain("pikachu-front.png");
    expect(slide1.getAttribute("data-variant")).toBe("hero");
  });

  it("la diapositiva 2 contiene el flavor text en español con scroll vertical propio", async () => {
    mockedFetch.mockResolvedValueOnce(makeDetail());

    renderCarousel();

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-carousel-slide")).toHaveLength(7);
    });
    const slide2 = screen.getAllByTestId("pokemon-carousel-slide")[1]!;
    expect(slide2.getAttribute("data-variant")).toBe("flavor");
    expect(slide2.textContent).toContain("bolsas de las mejillas");
    expect((slide2.querySelector("p") as HTMLElement).style.overflowY).toBe("auto");
  });

  it("el resto de diapositivas (3..7) muestran las demás imágenes disponibles", async () => {
    mockedFetch.mockResolvedValueOnce(makeDetail());

    renderCarousel();

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-carousel-slide")).toHaveLength(7);
    });
    const slides = screen.getAllByTestId("pokemon-carousel-slide");
    for (let i = 2; i < 7; i++) {
      expect(slides[i]!.getAttribute("data-variant")).toBe("gallery");
    }
  });

  it("con un solo sprite disponible renderiza 2 diapositivas (hero + flavor)", async () => {
    mockedFetch.mockResolvedValueOnce(
      makeDetail({
        sprites: {
          frontDefault: "https://example.test/pkm-front.png",
          frontShiny: null,
          backDefault: null,
          backShiny: null,
          officialArtwork: null,
          officialArtworkShiny: null,
          homeFront: null,
          homeShiny: null,
        },
      }),
    );

    renderCarousel();

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-carousel-slide")).toHaveLength(2);
    });
  });

  it("el auto-avance pasa a la siguiente diapositiva cada 5s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedFetch.mockResolvedValueOnce(makeDetail());

    renderCarousel();

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-carousel-slide")).toHaveLength(7);
    });
    expect(screen.getByTestId("pokemon-carousel-track").getAttribute("data-active")).toBe(
      "0",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByTestId("pokemon-carousel-track").getAttribute("data-active")).toBe(
      "1",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByTestId("pokemon-carousel-track").getAttribute("data-active")).toBe(
      "2",
    );
    vi.useRealTimers();
  });

  it("al pulsar el botón 'siguiente' del controller el auto-avance se detiene", async () => {
    // El test del flujo end-to-end (click en botón del slot)
    // vive en los tests de integración con `PokedexShell`. Aquí
    // verificamos el contrato del controller con un consumidor
    // arbitrario.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedFetch.mockResolvedValueOnce(makeDetail());

    function Consumer() {
      const { goNext } = useCarousel();
      return (
        <button data-testid="manual-next" onClick={goNext}>
          Next
        </button>
      );
    }

    render(
      <CarouselProvider pokemonName="pikachu">
        <Consumer />
        <PokemonCarousel />
      </CarouselProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("pokemon-carousel-slide")).toHaveLength(7);
    });

    await act(async () => {
      screen.getByTestId("manual-next").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(screen.getByTestId("pokemon-carousel-track").getAttribute("data-active")).toBe(
      "1",
    );

    // Tras pulsar, el interval queda cancelado y el auto-avance
    // se detiene aunque pasen más de 5s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByTestId("pokemon-carousel-track").getAttribute("data-active")).toBe(
      "1",
    );
    vi.useRealTimers();
  });

  it("muestra error si el detalle no se puede cargar", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("not found"));

    renderCarousel();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("pokemon-carousel-track")).toBeNull();
  });

  it("con pokemonName=null no carga nada y muestra estado neutro", () => {
    renderCarousel(null);
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pokemon-carousel-track")).toBeNull();
  });
});