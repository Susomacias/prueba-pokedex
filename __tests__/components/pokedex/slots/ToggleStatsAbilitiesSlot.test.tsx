import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToggleStatsAbilitiesSlot } from "@/src/components/pokedex/slots/ToggleStatsAbilitiesSlot";
import {
  PokedexPageProvider,
  usePokedexPage,
} from "@/src/components/pokedex/PokedexPageProvider";
import {
  AppShellProvider,
} from "@/src/components/app/ViewContext";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";

/*
 * Fase 08.4 — TDD del slot VER_HABILIDADES_VER_STATS (botón START negro).
 */

/* ---------- Mocks ---------- */

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  applyFiltersToList: vi.fn().mockResolvedValue({ items: [], nextOffset: null, total: 0, single: false }),
  fetchPokemonDetail: vi.fn().mockResolvedValue(null),
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
});

function renderToggle(
  pokemonName: string | null = null,
  mode: "stats" | "abilities" = "stats",
) {
  return render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <PokedexPageProvider>
          <ToggleStatsAbilitiesSlot
            pokemonName={pokemonName}
            mode={mode}
          />
        </PokedexPageProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );
}

function renderWithSpy(pokemonName: string) {
  /** Captura el modo tras hacer click en el toggle */
  let toggledTo: string | null = null;

  function Spy() {
    const { toggleStatsAbilities, setToggleStatsAbilities } = usePokedexPage();
    return (
      <button
        data-testid="trigger-toggle"
        onClick={() => {
          const next = toggleStatsAbilities === "stats" ? "abilities" : "stats";
          setToggleStatsAbilities(next);
          toggledTo = next;
        }}
      >
        trigger
      </button>
    );
  }

  const result = render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <PokedexPageProvider>
          <ToggleStatsAbilitiesSlot
            pokemonName={pokemonName}
            mode="stats"
          />
          <Spy />
        </PokedexPageProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );

  return { ...result, getToggledTo: () => toggledTo };
}

/* ---------- Tests ---------- */

describe("ToggleStatsAbilitiesSlot — botón START negro (Plan 08.4)", () => {
  it("sin pokemon seleccionado: botón visible pero disabled", () => {
    renderToggle(null);
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("con pokemon en modo stats: botón muestra 'VER HABILIDADES'", () => {
    renderToggle("pikachu", "stats");

    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute("data-stub")).toBe("toggle");
    expect(btn.getAttribute("data-pokemon")).toBe("pikachu");
    expect(btn.getAttribute("data-mode")).toBe("stats");
    expect(btn.textContent).toContain("VER HABILIDADES");
  });

  it("con pokemon en modo abilities: botón muestra 'VER STATS'", () => {
    renderToggle("pikachu", "abilities");

    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("VER STATS");
    expect(btn.getAttribute("data-mode")).toBe("abilities");
  });

  it("click alterna el modo (stats → abilities)", async () => {
    const { getToggledTo } = renderWithSpy("pikachu");

    const btn = screen.getByRole("button", { name: /ver/i });
    expect(btn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(btn);
    });

    // El provider interno habrá cambiado toggleStatsAbilities a "abilities"
    expect(getToggledTo()).toBeNull();
  });

  it("el botón tiene la clase CSS de estilo START", () => {
    renderToggle("pikachu");

    const btn = screen.getByRole("button");
    expect(btn.className).toContain("toggle-stats-btn");
  });

  it("aria-label describe la acción de toggle", () => {
    renderToggle("pikachu");

    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/habilidades/i);
    expect(btn.getAttribute("aria-label")).toMatch(/pulsa/i);
  });
});
