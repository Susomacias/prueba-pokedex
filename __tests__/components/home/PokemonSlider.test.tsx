import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PokemonSlider } from "@/src/components/home/PokemonSlider";

/**
 * Plan 03.3 — TDD del slider de pokemons de la pantalla de inicio.
 *
 * Comportamiento esperado:
 *   - Lista de 10 pokemons en orden.
 *   - Cada pokemon: entra (600ms) → permanece (3s) → sale (600ms) → siguiente.
 *   - Tras el último, vuelve al primero.
 *   - Pausa cuando la pestaña pierde foco (`visibilitychange`).
 *   - Sin transiciones CSS activas cuando `prefers-reduced-motion: reduce`.
 */

const POKEMONS_IN_ORDER = [
  "charmander",
  "ponita",
  "caterpi",
  "squirtle",
  "pikachu",
  "rinomer",
  "bulbasur",
  "onix",
  "abra",
  "magicarp",
] as const;

const ENTER_MS = 600;
const HOLD_MS = 3000;
const EXIT_MS = 600;
const CYCLE_MS = ENTER_MS + HOLD_MS + EXIT_MS;

function setupMatchMedia({ reducedMotion = false }: { reducedMotion?: boolean } = {}) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({
      matches:
        reducedMotion && query.includes("prefers-reduced-motion") ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

describe("PokemonSlider (Plan 03.3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMatchMedia();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renderiza el slider con la región accesible y un primer pokemon Charmander", () => {
    render(<PokemonSlider />);

    const slider = screen.getByRole("region", { name: /slider de pok[eé]mons/i });
    expect(slider).toBeInTheDocument();

    const firstPokemon = screen.getByRole("img", { name: /charmander/i });
    expect(firstPokemon).toBeInTheDocument();
    expect(firstPokemon).toHaveAttribute("src", "/pagina_inicio/charmander.svg");
  });

  it("contiene los 10 SVG de pokemons (precargados para evitar saltos visuales)", () => {
    const { container } = render(<PokemonSlider />);

    for (const name of POKEMONS_IN_ORDER) {
      const img = container.querySelector(
        `img[src="/pagina_inicio/${name}.svg"]`,
      );
      expect(img, `debe precargar el SVG de ${name}`).not.toBeNull();
    }
  });

  it("avanza al siguiente pokemon tras completar el ciclo (enter + hold + exit)", () => {
    render(<PokemonSlider />);

    expect(screen.getByRole("img", { name: /charmander/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(ENTER_MS);
    });
    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    act(() => {
      vi.advanceTimersByTime(EXIT_MS);
    });

    expect(screen.getByRole("img", { name: /ponita/i })).toBeInTheDocument();
  });

  it("cicla en el orden definido del borrador y vuelve al primero tras el último", () => {
    render(<PokemonSlider />);

    // Recorre los 9 siguientes
    for (let i = 1; i < POKEMONS_IN_ORDER.length; i++) {
      const name = POKEMONS_IN_ORDER[i];
      act(() => {
        vi.advanceTimersByTime(ENTER_MS);
      });
      act(() => {
        vi.advanceTimersByTime(HOLD_MS);
      });
      act(() => {
        vi.advanceTimersByTime(EXIT_MS);
      });
      expect(
        screen.getByRole("img", { name: new RegExp(name!, "i") }),
      ).toBeInTheDocument();
    }

    // Tras Magicarp, debe volver a Charmander
    act(() => {
      vi.advanceTimersByTime(ENTER_MS);
    });
    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    act(() => {
      vi.advanceTimersByTime(EXIT_MS);
    });
    expect(screen.getByRole("img", { name: /charmander/i })).toBeInTheDocument();
  });

  it("marca el pokemon visible con aria-hidden false y los ocultos con aria-hidden true", () => {
    const { container } = render(<PokemonSlider />);

    const slides = Array.from(
      container.querySelectorAll('[data-testid^="home-slider-slide-"]'),
    );
    expect(slides.length).toBe(POKEMONS_IN_ORDER.length);

    const visibles = slides.filter(
      (el) => el.getAttribute("aria-hidden") === "false",
    );
    const ocultos = slides.filter(
      (el) => el.getAttribute("aria-hidden") === "true",
    );
    expect(visibles.length).toBe(1);
    expect(ocultos.length).toBe(POKEMONS_IN_ORDER.length - 1);
  });

  it("pausa el ciclo cuando la pestaña pierde el foco (visibilitychange hidden)", () => {
    render(<PokemonSlider />);

    // Simulamos que la pestaña se oculta a mitad de la fase enter
    act(() => {
      vi.advanceTimersByTime(ENTER_MS / 2);
    });

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Aunque avancemos el reloj, NO debe cambiar de pokemon
    act(() => {
      vi.advanceTimersByTime(CYCLE_MS * 2);
    });

    expect(screen.getByRole("img", { name: /charmander/i })).toBeInTheDocument();

    // Reanuda al volver
    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Tras reanudar, el ciclo continúa hasta completar enter+hold+exit → ponita
    act(() => {
      vi.advanceTimersByTime(ENTER_MS);
    });
    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    act(() => {
      vi.advanceTimersByTime(EXIT_MS);
    });
    expect(screen.getByRole("img", { name: /ponita/i })).toBeInTheDocument();
  });

  it("limpia el listener de visibilitychange al desmontar", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<PokemonSlider />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    removeSpy.mockRestore();
  });
});

describe("PokemonSlider con prefers-reduced-motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMatchMedia({ reducedMotion: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("no aplica transiciones CSS (animation/transition: none) en cada slide", () => {
    const { container } = render(<PokemonSlider />);
    const slides = Array.from(
      container.querySelectorAll('[data-testid^="home-slider-slide-"]'),
    );
    expect(slides.length).toBeGreaterThan(0);
    for (const slide of slides) {
      const style = (slide as HTMLElement).style;
      // Las animaciones CSS se desactivan vía animation: none.
      // Aceptamos o "none" o string vacío (significa que no hay anim inline
      // y por tanto la regla global de prefers-reduced-motion aplica).
      const anim = style.animation || "";
      expect(
        anim === "none" || anim === "",
        `slide con style.animation="${anim}" no debe tener animación`,
      ).toBe(true);
    }
  });

  it("cambia instantáneamente al siguiente pokemon tras el ciclo", () => {
    render(<PokemonSlider />);
    expect(screen.getByRole("img", { name: /charmander/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(ENTER_MS);
    });
    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    act(() => {
      vi.advanceTimersByTime(EXIT_MS);
    });

    expect(screen.getByRole("img", { name: /ponita/i })).toBeInTheDocument();
  });
});
