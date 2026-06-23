import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  PokedexPageProvider,
  usePokedexPage,
} from "@/src/components/pokedex/PokedexPageProvider";
import {
  AppShellProvider,
} from "@/src/components/app/ViewContext";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { Mode3DHabitatOverlay } from "@/src/components/pokedex/3d/Mode3DHabitatOverlay";
import type { PokemonDetail } from "@/src/lib/types/pokemon";

/*
 * Plan 09 — TDD del Mode3DHabitatOverlay (overlay de habitat + futuro 3D).
 *
 * Cobertura:
 *  - Cuando mode3D=false, no renderiza nada.
 *  - Cuando mode3D=true, renderiza un portal con data-testid.
 *  - Muestra un botón de flecha para cerrar.
 *  - Al pulsar la flecha, setMode3D(false).
 *  - Muestra la imagen del habitat cuando el detalle carga.
 *  - Gesto swipe-up cierra el modo 3D.
 */

const MOCK_DETAIL: PokemonDetail = {
  id: 1,
  name: "bulbasaur",
  height: 7,
  weight: 69,
  baseExperience: 64,
  isLegendary: false,
  isMythical: false,
  captureRate: 45,
  baseHappiness: 50,
  generation: "generation-i",
  habitat: "bosque",
  types: [{ slot: 1, name: "grass" }, { slot: 2, name: "poison" }],
  stats: [],
  abilities: [],
  sprites: {
    frontDefault: null,
    frontShiny: null,
    backDefault: null,
    backShiny: null,
    officialArtwork: null,
    homeFront: null,
    homeShiny: null,
    officialArtworkShiny: null,
  },
  cryLatestUrl: null,
  flavorText: null,
  flavorTextVersion: null,
  evolutionChain: [],
};

const mockFetchPokemonDetail = vi.fn();

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  applyFiltersToList: vi.fn().mockResolvedValue({ items: [], nextOffset: null, total: 0, single: false }),
  fetchPokemonDetail: (...args: unknown[]) => mockFetchPokemonDetail(...args),
}));

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => ({
    pathname: "/pokemon/bulbasaur",
    searchParams: new URLSearchParams(),
    router: { replace: () => undefined, push: () => undefined, back: () => undefined, forward: () => undefined, refresh: () => undefined },
    subscribe: () => () => undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pokemon/bulbasaur",
  useRouter: () => ({ push: () => undefined, replace: () => undefined, back: () => undefined, forward: () => undefined, refresh: () => undefined, prefetch: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchPokemonDetail.mockResolvedValue(MOCK_DETAIL);
});

function Mode3DActivator() {
  const { setMode3D } = usePokedexPage();
  // Activar modo 3D al montar para testear el overlay.
  // Usamos requestAnimationFrame para evitar setState en render.
  const activated = React.useRef(false);
  if (!activated.current) {
    activated.current = true;
    queueMicrotask(() => setMode3D(true));
  }
  return null;
}

// Necesitamos importar React para JSX y useRef.
import React from "react";

function renderOverlay() {
  return render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <PokedexPageProvider>
          <Mode3DActivator />
          <Mode3DHabitatOverlay />
        </PokedexPageProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );
}

describe("Mode3DHabitatOverlay — overlay habitat + futuro 3D (Plan 09)", () => {
  it("cuando mode3D es false, no renderiza nada", () => {
    const { container } = render(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <PokedexPageProvider>
            <Mode3DHabitatOverlay />
          </PokedexPageProvider>
        </AppShellProvider>
      </FiltersProvider>,
    );

    // El portal no debe estar en document.body.
    expect(
      document.body.querySelector("[data-testid='mode3d-habitat-overlay']"),
    ).toBeNull();
   
    // El componente devuelve null, React container vacío.
    expect(container.innerHTML).toBe("");
  });

  it("cuando mode3D es true, renderiza el overlay en un portal", async () => {
    renderOverlay();

    await waitFor(() => {
      const overlay = document.body.querySelector(
        "[data-testid='mode3d-habitat-overlay']",
      );
      expect(overlay).not.toBeNull();
    });
  });

  it("muestra el botón de flecha para cerrar", async () => {
    renderOverlay();

    await waitFor(() => {
      const arrow = screen.getByTestId("mode3d-close-arrow");
      expect(arrow).not.toBeNull();
      expect(arrow.getAttribute("aria-label")).toBe("Cerrar vista 3D");
    });
  });

  it("al pulsar la flecha se cierra el modo 3D", async () => {
    renderOverlay();

    await waitFor(() => {
      expect(
        document.body.querySelector("[data-testid='mode3d-habitat-overlay']"),
      ).not.toBeNull();
    });

    const arrow = screen.getByTestId("mode3d-close-arrow");
    fireEvent.click(arrow);

    // Tras el click, setMode3D(false) debería desmontar el overlay.
    await waitFor(() => {
      expect(
        document.body.querySelector("[data-testid='mode3d-habitat-overlay']"),
      ).toBeNull();
    });
  });

  it("carga la imagen del habitat cuando el detalle se resuelve", async () => {
    renderOverlay();

    await waitFor(() => {
      const overlay = document.body.querySelector(
        "[data-testid='mode3d-habitat-overlay']",
      );
      expect(overlay).not.toBeNull();
    });

    // La imagen debe apuntar al habitat "bosque".
    await waitFor(() => {
      const img = document.body.querySelector(
        "[data-testid='mode3d-habitat-overlay'] img",
      );
      expect(img).not.toBeNull();
      expect(img!.getAttribute("src")).toContain("bosque");
    });
  });

  it("cuando no hay pokemon seleccionado, muestra el habitat generico", async () => {
    // Renderizamos con pathname /pokedex (sin pokemon).
    vi.mocked(
      require("@/src/hooks/useNavigation").useNavigation,
    ).mockReturnValue({
      pathname: "/pokedex",
      searchParams: new URLSearchParams(),
      router: { replace: () => undefined, push: () => undefined, back: () => undefined, forward: () => undefined, refresh: () => undefined },
      subscribe: () => () => undefined,
    });

    renderOverlay();

    await waitFor(() => {
      const overlay = document.body.querySelector(
        "[data-testid='mode3d-habitat-overlay']",
      );
      expect(overlay).not.toBeNull();
    });

    // Sin pokemon seleccionado, activeKey es null: no se llama a fetchPokemonDetail,
    // y se usa habitat generico.
    const img = document.body.querySelector(
      "[data-testid='mode3d-habitat-overlay'] img",
    );
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toContain("generico");
  });

  it("el overlay tiene z-index suficiente para estar por encima de la Pokédex", async () => {
    renderOverlay();

    await waitFor(() => {
      const overlay = document.body.querySelector(
        "[data-testid='mode3d-habitat-overlay']",
      ) as HTMLElement;
      expect(overlay).not.toBeNull();
      expect(overlay.style.zIndex).toBe("25");
    });
  });

  it("el gesto swipe-up (touch) cierra el modo 3D", async () => {
    renderOverlay();

    await waitFor(() => {
      expect(
        document.body.querySelector("[data-testid='mode3d-habitat-overlay']"),
      ).not.toBeNull();
    });

    const overlay = document.body.querySelector(
      "[data-testid='mode3d-habitat-overlay']",
    ) as HTMLElement;

    // Simular touch start + end con swipe hacia arriba (deltaY negativo).
    fireEvent.touchStart(overlay, {
      touches: [{ clientY: 300 }],
    });
    fireEvent.touchEnd(overlay, {
      changedTouches: [{ clientY: 200 }],
    });

    // El swipe de -100px debería cerrar el modo 3D.
    await waitFor(() => {
      expect(
        document.body.querySelector("[data-testid='mode3d-habitat-overlay']"),
      ).toBeNull();
    });
  });
});
