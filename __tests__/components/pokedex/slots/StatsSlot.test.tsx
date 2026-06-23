import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StatsSlot } from "@/src/components/pokedex/slots/StatsSlot";
import { CarouselProvider } from "@/src/components/pokedex/carousel/CarouselController";
import {
  AppShellProvider,
} from "@/src/components/app/ViewContext";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import type { PokemonDetail, PokemonTypeRef, PokemonStat, PokemonAbility, EvolutionNode } from "@/src/lib/types/pokemon";

/*
 * Fase 08.3 — TDD del slot STATS (panel LCD verde).
 *
 * Cobertura:
 *  - Renderiza los 6 stats con nombres canónicos.
 *  - Las barras se llenan proporcionalmente (base_stat / 255).
 *  - Stats bajos: barras casi vacías (magikarp).
 *  - Stats altos: barras casi llenas (mewtwo).
 *  - Modo abilities: lista de habilidades.
 */

/* ---------- Fixture-based detail data ---------- */

function emptyDetail(): PokemonDetail {
  return {
    id: 0, name: "", height: null, weight: null, baseExperience: null,
    isLegendary: false, isMythical: false, captureRate: null, baseHappiness: null,
    generation: null, habitat: null,
    types: [] as PokemonTypeRef[],
    stats: [] as PokemonStat[],
    abilities: [] as PokemonAbility[],
    sprites: {
      frontDefault: null, frontShiny: null, backDefault: null, backShiny: null,
      officialArtwork: null, homeFront: null, homeShiny: null, officialArtworkShiny: null,
    },
    cryLatestUrl: null, flavorText: null, flavorTextVersion: null,
    evolutionChain: [] as EvolutionNode[],
  };
}

// Stats reales de PokeAPI (capturados con fixtures)
const pikachuDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 25,
  name: "pikachu",
  generation: "generation-i",
  types: [{ slot: 1, name: "electric" }] as PokemonTypeRef[],
  stats: [
    { name: "hp", baseStat: 35 },
    { name: "attack", baseStat: 55 },
    { name: "defense", baseStat: 40 },
    { name: "special-attack", baseStat: 50 },
    { name: "special-defense", baseStat: 50 },
    { name: "speed", baseStat: 90 },
  ] as PokemonStat[],
  abilities: [
    { name: "static", isHidden: false, slot: 1 },
    { name: "lightning-rod", isHidden: true, slot: 3 },
  ] as PokemonAbility[],
};

const mewtwoDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 150,
  name: "mewtwo",
  generation: "generation-i",
  types: [{ slot: 1, name: "psychic" }] as PokemonTypeRef[],
  stats: [
    { name: "hp", baseStat: 106 },
    { name: "attack", baseStat: 110 },
    { name: "defense", baseStat: 90 },
    { name: "special-attack", baseStat: 154 },
    { name: "special-defense", baseStat: 90 },
    { name: "speed", baseStat: 130 },
  ] as PokemonStat[],
  abilities: [
    { name: "pressure", isHidden: false, slot: 1 },
    { name: "unnerve", isHidden: true, slot: 3 },
  ] as PokemonAbility[],
};

const magikarpDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 129,
  name: "magikarp",
  generation: "generation-i",
  types: [{ slot: 1, name: "water" }] as PokemonTypeRef[],
  stats: [
    { name: "hp", baseStat: 20 },
    { name: "attack", baseStat: 10 },
    { name: "defense", baseStat: 55 },
    { name: "special-attack", baseStat: 15 },
    { name: "special-defense", baseStat: 20 },
    { name: "speed", baseStat: 80 },
  ] as PokemonStat[],
  abilities: [
    { name: "swift-swim", isHidden: false, slot: 1 },
    { name: "rattled", isHidden: true, slot: 3 },
  ] as PokemonAbility[],
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

beforeEach(() => {
  vi.clearAllMocks();
  mockDetail = null;
});

function renderStats(pokemonName: string | null = null, mode: "stats" | "abilities" = "stats") {
  return render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <CarouselProvider pokemonName={pokemonName}>
          <StatsSlot pokemonName={pokemonName} mode={mode} />
        </CarouselProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );
}

/* ---------- Helpers ---------- */

const STAT_MAX = 255;
const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "ATQ",
  defense: "DEF",
  "special-attack": "AT.ESP",
  "special-defense": "DF.ESP",
  speed: "VEL",
};

/* ---------- Tests ---------- */

describe("StatsSlot — panel LCD verde de stats (Plan 08.3)", () => {
  it("sin pokemon seleccionado: muestra panel vacío con título", () => {
    renderStats(null);
    const panel = screen.getByRole("list");
    expect(panel).toBeInTheDocument();
    expect(panel.textContent).toContain("STATS");
  });

  it("renderiza los 6 stats con nombres canónicos (modo stats)", async () => {
    mockDetail = pikachuDetail;
    renderStats("pikachu", "stats");

    await waitFor(() => {
      const statItems = document.querySelectorAll("[data-stat]");
      expect(statItems).toHaveLength(6);
    });

    const statItems = document.querySelectorAll("[data-stat]");
    const expectedStats = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
    expectedStats.forEach((statName, i) => {
      expect(statItems[i]!.getAttribute("data-stat")).toBe(statName);
      expect(statItems[i]!.textContent).toContain(STAT_LABELS[statName]);
    });
  });

  it("las barras se llenan proporcionalmente (base_stat / 255)", async () => {
    mockDetail = pikachuDetail;
    renderStats("pikachu", "stats");

    await waitFor(() => {
      const statItems = document.querySelectorAll("[data-stat]");
      expect(statItems).toHaveLength(6);
    });

    const statItems = document.querySelectorAll("[data-stat]");
    // Pikachu hp=35 → width ≈ 35/255 ≈ 13.7%
    const hpBar = statItems[0]!.querySelector("[data-stat-bar-fill]") as HTMLElement;
    expect(hpBar).not.toBeNull();
    const hpPercent = Math.round((35 / STAT_MAX) * 100);
    expect(hpBar.style.width).toBe(`${hpPercent}%`);

    // Pikachu speed=90 → width ≈ 90/255 ≈ 35.3%
    const speedBar = statItems[5]!.querySelector("[data-stat-bar-fill]") as HTMLElement;
    const speedPercent = Math.round((90 / STAT_MAX) * 100);
    expect(speedBar.style.width).toBe(`${speedPercent}%`);
  });

  it("stats bajos (magikarp): barras casi vacías", async () => {
    mockDetail = magikarpDetail;
    renderStats("magikarp", "stats");

    await waitFor(() => {
      const statItems = document.querySelectorAll("[data-stat]");
      expect(statItems).toHaveLength(6);
    });

    const statItems = document.querySelectorAll("[data-stat]");
    // Magikarp attack=10 → width ≈ 10/255 ≈ 4%
    const atkBar = statItems[1]!.querySelector("[data-stat-bar-fill]") as HTMLElement;
    const atkPercent = Math.round((10 / STAT_MAX) * 100);
    expect(atkBar.style.width).toBe(`${atkPercent}%`);
    // Should be very small
    expect(parseInt(atkBar.style.width)).toBeLessThan(10);
  });

  it("stats altos (mewtwo): barras casi llenas", async () => {
    mockDetail = mewtwoDetail;
    renderStats("mewtwo", "stats");

    await waitFor(() => {
      const statItems = document.querySelectorAll("[data-stat]");
      expect(statItems).toHaveLength(6);
    });

    const statItems = document.querySelectorAll("[data-stat]");
    // Mewtwo special-attack=154 → width ≈ 154/255 ≈ 60%
    const spaBar = statItems[3]!.querySelector("[data-stat-bar-fill]") as HTMLElement;
    const spaPercent = Math.round((154 / STAT_MAX) * 100);
    expect(spaBar.style.width).toBe(`${spaPercent}%`);
    // Should be > 50%
    expect(parseInt(spaBar.style.width)).toBeGreaterThan(50);
  });

  it("modo abilities: lista de habilidades con nombre y tipo", async () => {
    mockDetail = pikachuDetail;
    renderStats("pikachu", "abilities");

    await waitFor(() => {
      const abilityItems = document.querySelectorAll("[data-ability]");
      expect(abilityItems).toHaveLength(2);
    });

    const items = document.querySelectorAll("[data-ability]");
    expect(items[0]!.getAttribute("data-ability")).toBe("static");
    expect(items[0]!.textContent).toContain("static");
    // No oculta
    expect(items[0]!.getAttribute("data-hidden")).toBe("false");

    expect(items[1]!.getAttribute("data-ability")).toBe("lightning-rod");
    // Texto muestra "lightning rod" (guiones reemplazados por espacios)
    expect(items[1]!.textContent).toContain("lightning rod");
    // Oculta
    expect(items[1]!.getAttribute("data-hidden")).toBe("true");
  });

  it("data-pokemon se emite cuando hay pokemon seleccionado", async () => {
    mockDetail = pikachuDetail;
    renderStats("pikachu");

    await waitFor(() => {
      const panel = screen.getByRole("list");
      expect(panel.getAttribute("data-pokemon")).toBe("pikachu");
    });
  });

  it("data-stub cambia entre stats y abilities según el modo", async () => {
    mockDetail = pikachuDetail;
    const { unmount } = renderStats("pikachu", "stats");

    await waitFor(() => {
      const panel = screen.getByRole("list");
      expect(panel.getAttribute("data-stub")).toBe("stats");
    });
    unmount();

    // Fresh render en modo abilities
    renderStats("pikachu", "abilities");
    await waitFor(() => {
      const abilitiesPanel = screen.getByRole("list");
      expect(abilitiesPanel.getAttribute("data-stub")).toBe("abilities");
    });
  });
});
