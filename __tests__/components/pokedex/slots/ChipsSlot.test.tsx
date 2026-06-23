import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChipsSlot } from "@/src/components/pokedex/slots/ChipsSlot";
import { CarouselProvider } from "@/src/components/pokedex/carousel/CarouselController";
import {
  AppShellProvider,
} from "@/src/components/app/ViewContext";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { BASE_COLORS } from "@/src/lib/constants/colors";
import { POKEMON_TYPE_COLORS } from "@/src/lib/constants/pokemonTypes";
import { POKEMON_GENERATION_COLORS } from "@/src/lib/constants/pokemonGenerations";
import type { PokemonDetail, PokemonTypeRef, PokemonStat, PokemonAbility, EvolutionNode } from "@/src/lib/types/pokemon";

/*
 * Fase 08.1 — TDD del slot TIPO1_TIPO2_GENERACION (chips).
 */

/* ---------- Fixture-like detail data ---------- */

function emptyDetail(): PokemonDetail {
  return {
    id: 0,
    name: "",
    height: null,
    weight: null,
    baseExperience: null,
    isLegendary: false,
    isMythical: false,
    captureRate: null,
    baseHappiness: null,
    generation: null,
    habitat: null,
    types: [] as PokemonTypeRef[],
    stats: [] as PokemonStat[],
    abilities: [] as PokemonAbility[],
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
    evolutionChain: [] as EvolutionNode[],
  };
}

const pikachuDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 25,
  name: "pikachu",
  height: 4,
  weight: 60,
  generation: "generation-i",
  types: [{ slot: 1, name: "electric" }] as PokemonTypeRef[],
};

const bulbasaurDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 1,
  name: "bulbasaur",
  generation: "generation-i",
  types: [
    { slot: 1, name: "grass" },
    { slot: 2, name: "poison" },
  ] as PokemonTypeRef[],
};

const charmanderDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 4,
  name: "charmander",
  generation: "generation-i",
  types: [{ slot: 1, name: "fire" }] as PokemonTypeRef[],
};

const unknownGenDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 999,
  name: "unknown",
  generation: null,
  types: [{ slot: 1, name: "electric" }] as PokemonTypeRef[],
};

/* ---------- Mocks ---------- */

let mockDetail: PokemonDetail | null = null;

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  applyFiltersToList: vi.fn().mockResolvedValue({ items: [], nextOffset: null, total: 0, single: false }),
  fetchPokemonDetail: vi.fn().mockImplementation(() => Promise.resolve(mockDetail)),
}));

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => ({
    pathname: "/pokedex",
    searchParams: new URLSearchParams(),
    router: { replace: () => undefined, push: () => undefined, back: () => undefined, forward: () => undefined, refresh: () => undefined },
    subscribe: () => () => undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pokedex",
  useRouter: () => ({ push: () => undefined, replace: () => undefined, back: () => undefined, forward: () => undefined, refresh: () => undefined, prefetch: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock de useViewportLayout para tests de layout
const mockUseViewportLayout = vi.fn(() => "horizontal");
vi.mock("@/src/hooks/useViewportLayout", () => ({
  useViewportLayout: () => mockUseViewportLayout(),
  VERTICAL_LAYOUT_MAX_WIDTH: 768,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockDetail = null;
  mockUseViewportLayout.mockReturnValue("horizontal");
});

/* ---------- Helper: render del slot ---------- */

function renderChips(pokemonName: string | null = null) {
  return render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <CarouselProvider pokemonName={pokemonName}>
          <ChipsSlot pokemonName={pokemonName} />
        </CarouselProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );
}

/* ---------- Tests ---------- */

describe("ChipsSlot — chips tipo1/tipo2/generación (Plan 08.1)", () => {
  it("estado vacío (sin pokemon): renderiza 3 chips con los colores base y SIN texto", () => {
    renderChips(null);

    const container = screen.getByRole("group", { name: /tipos y generación/i });
    expect(container).toBeInTheDocument();
    expect(container.getAttribute("data-stub")).toBe("chips");

    const chips = container.querySelectorAll("[data-chip]");
    expect(chips).toHaveLength(3);

    // Horizontal layout: types left, generation right
    expect(chips[0]!.getAttribute("data-chip")).toBe("type1");
    expect(chips[0]!.textContent!.trim()).toBe("");
    const t1Style = (chips[0] as HTMLElement).style;
    expect(t1Style.backgroundColor).toBe(rgbToHex(BASE_COLORS.garnet.dark));
    expect(t1Style.borderColor).toBe(rgbToHex(BASE_COLORS.garnet.light));

    expect(chips[1]!.getAttribute("data-chip")).toBe("type2");
    expect(chips[1]!.textContent!.trim()).toBe("");
    const t2Style = (chips[1] as HTMLElement).style;
    expect(t2Style.backgroundColor).toBe(rgbToHex(BASE_COLORS.yellowOrange.dark));
    expect(t2Style.borderColor).toBe(rgbToHex(BASE_COLORS.yellowOrange.light));

    expect(chips[2]!.getAttribute("data-chip")).toBe("generation");
    expect(chips[2]!.textContent!.trim()).toBe("");
    const genStyle = (chips[2] as HTMLElement).style;
    expect(genStyle.backgroundColor).toBe(rgbToHex(BASE_COLORS.green.dark));
    expect(genStyle.borderColor).toBe(rgbToHex(BASE_COLORS.green.light));
  });

  it("con pokemon: los chips de tipo tienen los colores correctos de POKEMON_TYPE_COLORS", async () => {
    mockDetail = pikachuDetail;
    renderChips("pikachu");

    // Esperar a que el chip se llene con datos reales (texto "Eléctrico")
    await waitFor(() => {
      const type1Chip = document.querySelector('[data-chip="type1"]');
      expect(type1Chip).not.toBeNull();
      expect(type1Chip!.textContent).toBe("Eléctrico");
    });

    const type1Chip = document.querySelector('[data-chip="type1"]') as HTMLElement;
    const electricColors = POKEMON_TYPE_COLORS.electric;
    expect(type1Chip.style.backgroundColor).toBe(rgbToHex(electricColors.bg));
    expect(type1Chip.style.borderColor).toBe(rgbToHex(electricColors.border));
  });

  it("con pokemon de dos tipos: muestra ambos tipos con colores correctos", async () => {
    mockDetail = bulbasaurDetail;
    renderChips("bulbasaur");

    await waitFor(() => {
      const type1Chip = document.querySelector('[data-chip="type1"]');
      expect(type1Chip).not.toBeNull();
      expect(type1Chip!.textContent).toBe("Planta");
    });

    const type1Chip = document.querySelector('[data-chip="type1"]') as HTMLElement;
    const type2Chip = document.querySelector('[data-chip="type2"]') as HTMLElement;
    expect(type1Chip.style.backgroundColor).toBe(rgbToHex(POKEMON_TYPE_COLORS.grass.bg));
    expect(type2Chip).not.toBeNull();
    expect(type2Chip.style.backgroundColor).toBe(rgbToHex(POKEMON_TYPE_COLORS.poison.bg));
    expect(type2Chip.textContent).toBe("Veneno");
  });

  it("con pokemon: el chip de generación muestra el prefijo Gen- y numeral romano", async () => {
    mockDetail = charmanderDetail;
    renderChips("charmander");

    await waitFor(() => {
      const genChip = document.querySelector('[data-chip="generation"]');
      expect(genChip).not.toBeNull();
      expect(genChip!.textContent).toBe("Gen-I");
    });

    const genChip = document.querySelector('[data-chip="generation"]') as HTMLElement;
    const genColors = POKEMON_GENERATION_COLORS["generation-i"];
    expect(genChip.style.backgroundColor).toBe(rgbToHex(genColors.bg));
    expect(genChip.style.borderColor).toBe(rgbToHex(genColors.border));
  });

  it("color genérico (default) si la generación es null", async () => {
    mockDetail = unknownGenDetail;
    renderChips("unknown");

    await waitFor(() => {
      const genChip = document.querySelector('[data-chip="generation"]');
      expect(genChip).not.toBeNull();
      expect(genChip!.textContent).toBe("Gen-?");
    });

    const genChip = document.querySelector('[data-chip="generation"]') as HTMLElement;
    const defaultColors = POKEMON_GENERATION_COLORS.default;
    expect(genChip.style.backgroundColor).toBe(rgbToHex(defaultColors.bg));
  });

  it("layout horizontal: tipos a la izquierda, generación a la derecha", () => {
    mockUseViewportLayout.mockReturnValue("horizontal");
    renderChips(null);

    const container = screen.getByRole("group", { name: /tipos y generación/i });
    expect(container.getAttribute("data-orientation")).toBe("horizontal");

    const chips = container.querySelectorAll("[data-chip]");
    // types (type1, type2) grouped left, generation right
    expect(chips[0]!.getAttribute("data-chip")).toBe("type1");
    expect(chips[1]!.getAttribute("data-chip")).toBe("type2");
    expect(chips[2]!.getAttribute("data-chip")).toBe("generation");
  });

  it("layout vertical: tipos arriba, generación abajo", () => {
    mockUseViewportLayout.mockReturnValue("vertical");
    renderChips(null);

    const container = screen.getByRole("group", { name: /tipos y generación/i });
    expect(container.getAttribute("data-orientation")).toBe("vertical");

    const chips = container.querySelectorAll("[data-chip]");
    expect(chips[0]!.getAttribute("data-chip")).toBe("type1");
    expect(chips[1]!.getAttribute("data-chip")).toBe("type2");
    expect(chips[2]!.getAttribute("data-chip")).toBe("generation");
  });

  it("data-pokemon se emite cuando hay pokemon seleccionado", () => {
    mockDetail = pikachuDetail;
    renderChips("pikachu");

    // data-pokemon se emite inmediatamente desde buildSlotAttrs (no depende del detail)
    const container = screen.getByRole("group", { name: /tipos y generación/i });
    expect(container.getAttribute("data-pokemon")).toBe("pikachu");
  });
});

/* ---------- Helper: compara colores (los estilos inline de React se normalizan a rgb) ---------- */

function rgbToHex(hex: string): string {
  // Convierte un string hex (#rrggbb) a rgb(r, g, b) para comparar con style.backgroundColor
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!match) return hex;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
}
