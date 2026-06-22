import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import {
  CarouselProvider,
  useCarousel,
} from "@/src/components/pokedex/carousel/CarouselController";
import { CarouselDots } from "@/src/components/pokedex/carousel/CarouselDots";
import { CarouselButtons } from "@/src/components/pokedex/carousel/CarouselButtons";
import { PokemonSoundButton } from "@/src/components/pokedex/carousel/PokemonSoundButton";
import { PokemonCarousel } from "@/src/components/pokedex/carousel/PokemonCarousel";
import type { PokemonDetail } from "@/src/lib/types/pokemon";

/**
 * Plan 06.3-06.6 — Test de integración del carrusel completo.
 *
 * Verifica que `CarouselDots` + `CarouselButtons` +
 * `PokemonSoundButton` + `PokemonCarousel` comparten el mismo
 * estado del `CarouselController`:
 *
 *  - Pulsar un LED cambia la slide activa.
 *  - Pulsar "siguiente" avanza y deshabilita el botón al llegar al
 *    final.
 *  - Pulsar "anterior" retrocede.
 *  - El botón de sonido aparece sólo cuando hay `cryLatestUrl`.
 */

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  fetchPokemonDetail: vi.fn(),
}));

import { fetchPokemonDetail } from "@/src/lib/pokemon/cachedPokemonApi";
const mockedFetch = vi.mocked(fetchPokemonDetail);

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
    stats: [],
    abilities: [],
    sprites: {
      frontDefault: "https://example.test/pika-front.png",
      frontShiny: "https://example.test/pika-shiny.png",
      backDefault: null,
      backShiny: null,
      officialArtwork: null,
      officialArtworkShiny: null,
      homeFront: null,
      homeShiny: null,
    },
    cryLatestUrl: "https://example.test/pika.cry.ogg",
    flavorText: "pika pika",
    flavorTextVersion: null,
    evolutionChain: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Carousel integration (Plan 06.3-06.6)", () => {
  it("el carousel, los LEDs, los botones y el sonido comparten estado", async () => {
    mockedFetch.mockResolvedValueOnce(makeDetail());

    render(
      <CarouselProvider pokemonName="pikachu">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <CarouselDotsAndControls />
          <PokemonCarousel />
          <PokemonSoundButton
            pokemonName="pikachu"
            cryUrl="https://example.test/pika.cry.ogg"
          />
        </div>
      </CarouselProvider>,
    );

    await waitFor(() => {
      // 4 sprites -> 4 slides (hero + flavor + shiny + ...).
      expect(
        screen.getAllByTestId("pokemon-carousel-slide").length,
      ).toBeGreaterThanOrEqual(2);
    });

    // El LED 0 está activo inicialmente.
    const dots = screen.getAllByTestId("carousel-dot");
    expect(dots[0]!.getAttribute("data-active")).toBe("true");

    // Pulsar LED 2 cambia la slide activa.
    fireEvent.click(dots[2]!);
    expect(dots[2]!.getAttribute("data-active")).toBe("true");
    expect(
      screen.getByTestId("pokemon-carousel-track").getAttribute("data-active"),
    ).toBe("2");

    // Pulsar "anterior" vuelve una slide.
    fireEvent.click(screen.getByTestId("carousel-prev"));
    expect(
      screen.getByTestId("pokemon-carousel-track").getAttribute("data-active"),
    ).toBe("1");

    // Pulsar "anterior" hasta el inicio lo deja en 0 y deshabilita prev.
    fireEvent.click(screen.getByTestId("carousel-prev"));
    expect(
      screen.getByTestId("pokemon-carousel-track").getAttribute("data-active"),
    ).toBe("0");
    expect(screen.getByTestId("carousel-prev")).toBeDisabled();

    // Avanzar hasta el final deshabilita next.
    while (!screen.getByTestId("carousel-next").hasAttribute("disabled")) {
      fireEvent.click(screen.getByTestId("carousel-next"));
    }
    expect(screen.getByTestId("carousel-next")).toBeDisabled();

    // El botón de sonido está presente.
    expect(screen.getByTestId("pokemon-sound-button")).toBeInTheDocument();
  });

  it("sin cry el botón de sonido NO se renderiza", async () => {
    mockedFetch.mockResolvedValueOnce(
      makeDetail({ cryLatestUrl: null }),
    );

    render(
      <CarouselProvider pokemonName="missingno">
        <PokemonSoundButton pokemonName="missingno" cryUrl={null} />
      </CarouselProvider>,
    );

    expect(screen.queryByTestId("pokemon-sound-button")).toBeNull();
  });
});

/**
 * Wrapper mínimo que monta los LEDs y los botones de navegación
 * del carrusel. Es lo que harían los slots `PUNTOS_CARRUSEL` y
 * `BOTONES_CARRUSEL` en producción.
 */
function CarouselDotsAndControls() {
  const { totalSlides, activeIndex, goTo, goPrev, goNext, canPrev, canNext } =
    useCarousel();
  if (totalSlides === 0) return null;
  return (
    <div>
      <CarouselDots
        count={totalSlides}
        activeIndex={activeIndex}
        onSelect={goTo}
      />
      <CarouselButtons
        onPrev={goPrev}
        onNext={goNext}
        canPrev={canPrev}
        canNext={canNext}
      />
    </div>
  );
}