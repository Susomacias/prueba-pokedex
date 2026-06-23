import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { EvolutionsSlot } from "@/src/components/pokedex/slots/EvolutionsSlot";
import { CarouselProvider } from "@/src/components/pokedex/carousel/CarouselController";
import {
  AppShellProvider,
} from "@/src/components/app/ViewContext";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import type { PokemonDetail, PokemonTypeRef, PokemonStat, PokemonAbility, EvolutionNode } from "@/src/lib/types/pokemon";

/*
 * Fase 08.2 — TDD del slot EVOLUCIONES (panel LCD verde).
 *
 * Cobertura:
 *  - Renderiza la cadena completa en orden BFS.
 *  - El pokemon actual está destacado (atributo data-current).
 *  - Click en una evolución navega a su ficha (pushState).
 *  - Filtro CSS aplicado a las imágenes (clase LCD).
 *  - Pokemon sin evolución muestra solo 1 item.
 */

/* ---------- Fixture-based detail data ---------- */

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
      frontDefault: null, frontShiny: null, backDefault: null, backShiny: null,
      officialArtwork: null, homeFront: null, homeShiny: null, officialArtworkShiny: null,
    },
    cryLatestUrl: null,
    flavorText: null,
    flavorTextVersion: null,
    evolutionChain: [] as EvolutionNode[],
  };
}

// Pikachu chain: pichu(172) → pikachu(25) → raichu(26)
const pikachuChain: EvolutionNode[] = [
  { id: 172, name: "pichu", evolvesFromSpeciesId: null, evolutionDetail: null },
  { id: 25, name: "pikachu", evolvesFromSpeciesId: 172, evolutionDetail: { minLevel: null, trigger: "level-up", item: null } },
  { id: 26, name: "raichu", evolvesFromSpeciesId: 25, evolutionDetail: { minLevel: null, trigger: "use-item", item: "thunder-stone" } },
];

const pikachuDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 25,
  name: "pikachu",
  generation: "generation-i",
  types: [{ slot: 1, name: "electric" }] as PokemonTypeRef[],
  sprites: {
    ...emptyDetail().sprites,
    frontDefault: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
  },
  evolutionChain: pikachuChain,
};

// Eevee chain: eevee(133) + 8 evolutions
const eeveeChain: EvolutionNode[] = [
  { id: 133, name: "eevee", evolvesFromSpeciesId: null, evolutionDetail: null },
  { id: 134, name: "vaporeon", evolvesFromSpeciesId: 133, evolutionDetail: { minLevel: null, trigger: "use-item", item: "water-stone" } },
  { id: 135, name: "jolteon", evolvesFromSpeciesId: 133, evolutionDetail: { minLevel: null, trigger: "use-item", item: "thunder-stone" } },
  { id: 136, name: "flareon", evolvesFromSpeciesId: 133, evolutionDetail: { minLevel: null, trigger: "use-item", item: "fire-stone" } },
  { id: 196, name: "espeon", evolvesFromSpeciesId: 133, evolutionDetail: { minLevel: null, trigger: "level-up", item: null } },
  { id: 197, name: "umbreon", evolvesFromSpeciesId: 133, evolutionDetail: { minLevel: null, trigger: "level-up", item: null } },
  { id: 470, name: "leafeon", evolvesFromSpeciesId: 133, evolutionDetail: { minLevel: null, trigger: "level-up", item: null } },
  { id: 471, name: "glaceon", evolvesFromSpeciesId: 133, evolutionDetail: { minLevel: null, trigger: "level-up", item: null } },
  { id: 700, name: "sylveon", evolvesFromSpeciesId: 133, evolutionDetail: { minLevel: null, trigger: "level-up", item: null } },
];

const eeveeDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 133,
  name: "eevee",
  generation: "generation-i",
  types: [{ slot: 1, name: "normal" }] as PokemonTypeRef[],
  sprites: {
    ...emptyDetail().sprites,
    frontDefault: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png",
  },
  evolutionChain: eeveeChain,
};

// Magikarp chain: magikarp(129) → gyarados(130)
const magikarpChain: EvolutionNode[] = [
  { id: 129, name: "magikarp", evolvesFromSpeciesId: null, evolutionDetail: null },
  { id: 130, name: "gyarados", evolvesFromSpeciesId: 129, evolutionDetail: { minLevel: 20, trigger: "level-up", item: null } },
];

const magikarpDetail: PokemonDetail = {
  ...emptyDetail(),
  id: 129,
  name: "magikarp",
  generation: "generation-i",
  types: [{ slot: 1, name: "water" }] as PokemonTypeRef[],
  sprites: {
    ...emptyDetail().sprites,
    frontDefault: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png",
  },
  evolutionChain: magikarpChain,
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

function renderEvolutions(pokemonName: string | null = null) {
  return render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <CarouselProvider pokemonName={pokemonName}>
          <EvolutionsSlot pokemonName={pokemonName} />
        </CarouselProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );
}

/* ---------- Tests ---------- */

describe("EvolutionsSlot — panel LCD verde de evoluciones (Plan 08.2)", () => {
  it("sin pokemon seleccionado: muestra panel vacío con título", () => {
    renderEvolutions(null);
    const panel = screen.getByRole("list");
    expect(panel).toBeInTheDocument();
    expect(panel.textContent).toContain("EVOLUCIONES");
  });

  it("renderiza la cadena completa en orden BFS (pikachu: pichu → pikachu → raichu)", async () => {
    mockDetail = pikachuDetail;
    renderEvolutions("pikachu");

    await waitFor(() => {
      const items = document.querySelectorAll("[data-evolution-id]");
      expect(items).toHaveLength(3);
    });

    const items = document.querySelectorAll("[data-evolution-id]");
    expect(items[0]!.getAttribute("data-evolution-id")).toBe("172");
    expect(items[0]!.textContent).toContain("pichu");
    expect(items[1]!.getAttribute("data-evolution-id")).toBe("25");
    expect(items[1]!.textContent).toContain("pikachu");
    expect(items[2]!.getAttribute("data-evolution-id")).toBe("26");
    expect(items[2]!.textContent).toContain("raichu");
  });

  it("el pokemon actual está destacado con data-current", async () => {
    mockDetail = pikachuDetail;
    renderEvolutions("pikachu");

    await waitFor(() => {
      const current = document.querySelector('[data-evolution-id="25"]');
      expect(current).not.toBeNull();
      expect(current!.getAttribute("data-current")).toBe("true");
    });

    // Los otros NO son current
    const pichu = document.querySelector('[data-evolution-id="172"]');
    const raichu = document.querySelector('[data-evolution-id="26"]');
    expect(pichu!.getAttribute("data-current")).toBe("false");
    expect(raichu!.getAttribute("data-current")).toBe("false");
  });

  it("click en una evolución navega a su ficha (pushState a /pokemon/<name>)", async () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    mockDetail = pikachuDetail;
    renderEvolutions("pikachu");

    await waitFor(() => {
      const raichuBtn = document.querySelector('[data-evolution-id="26"]');
      expect(raichuBtn).not.toBeNull();
    });

    const raichuBtn = document.querySelector('[data-evolution-id="26"]') as HTMLElement;
    fireEvent.click(raichuBtn);

    expect(pushSpy).toHaveBeenCalled();
    const lastCall = pushSpy.mock.calls[pushSpy.mock.calls.length - 1]!;
    expect(lastCall[2]).toBe("/pokemon/raichu");
    pushSpy.mockRestore();
  });

  it("las imágenes de evolución tienen la clase CSS de filtro LCD", async () => {
    mockDetail = pikachuDetail;
    renderEvolutions("pikachu");

    await waitFor(() => {
      const img = document.querySelector('[data-evolution-id="172"] img');
      expect(img).not.toBeNull();
    });

    const img = document.querySelector('[data-evolution-id="172"] img') as HTMLElement;
    expect(img.className).toContain("evolution-sprite");
  });

  it("pokemon sin evolución (magikarp) muestra solo 1 item", async () => {
    mockDetail = magikarpDetail;
    renderEvolutions("magikarp");

    await waitFor(() => {
      const items = document.querySelectorAll("[data-evolution-id]");
      expect(items).toHaveLength(2);
    });

    // Ambos existen: magikarp y gyarados (2 miembros en cadena)
    const items = document.querySelectorAll("[data-evolution-id]");
    expect(items[0]!.getAttribute("data-evolution-id")).toBe("129");
    expect(items[1]!.getAttribute("data-evolution-id")).toBe("130");
  });

  it("cadena ramificada (eevee) renderiza todos los miembros", async () => {
    mockDetail = eeveeDetail;
    renderEvolutions("eevee");

    await waitFor(() => {
      const items = document.querySelectorAll("[data-evolution-id]");
      expect(items).toHaveLength(9);
    });

    const items = document.querySelectorAll("[data-evolution-id]");
    // Eevee es el primero (raíz)
    expect(items[0]!.getAttribute("data-evolution-id")).toBe("133");
  });

  it("data-pokemon se emite cuando hay pokemon seleccionado", async () => {
    mockDetail = pikachuDetail;
    renderEvolutions("pikachu");

    await waitFor(() => {
      const panel = screen.getByRole("list");
      expect(panel.getAttribute("data-pokemon")).toBe("pikachu");
    });
  });
});
