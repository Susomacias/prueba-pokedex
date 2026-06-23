import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { SearchInput } from "@/src/components/filters/SearchInput";

const harnessRef = globalThis as unknown as { __harness?: NavigationHarness };

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => {
    const h = harnessRef.__harness;
    if (!h) {
      throw new Error("harness not initialized");
    }
    const [, setTick] = useState(0);
    useEffect(() => h.subscribe(() => setTick((t) => t + 1)), [h]);
    return {
      pathname: h.pathname,
      searchParams: h.searchParams(),
      router: h.router,
      subscribe: (fn: () => void) => h.subscribe(fn),
    };
  },
}));

const applyFiltersToListMock = vi.fn().mockResolvedValue({
  items: [],
  nextOffset: null,
  total: 0,
  single: false,
});

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  applyFiltersToList: (...args: unknown[]) => applyFiltersToListMock(...args),
}));

const goToPokemonMock = vi.fn();

vi.mock("@/src/components/app/ViewContext", () => ({
  useAppShell: () => ({
    goToPokemon: goToPokemonMock,
    goToPokedex: vi.fn(),
    goToHome: vi.fn(),
    pathname: "/pokedex",
    view: "pokedex",
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <FiltersProvider>{children}</FiltersProvider>;
}

describe("SearchInput (Plan 07.3)", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
    vi.clearAllMocks();
    goToPokemonMock.mockClear();
    applyFiltersToListMock.mockResolvedValue({
      items: [],
      nextOffset: null,
      total: 0,
      single: false,
    });
  });

  it("renderiza un input con role combobox", () => {
    render(<SearchInput />, { wrapper });
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("al escribir 'pika' aplica busqueda con debounce", async () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    render(<SearchInput />, { wrapper });
    const input = screen.getByRole("combobox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "pika" } });
    });

    await waitFor(
      () => {
        expect(replace).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
    const url = replace.mock.calls[0][0] as string;
    expect(url).toContain("search=pika");
  }, 5000);

  it("muestra sugerencias cuando applyFiltersToList devuelve resultados", async () => {
    applyFiltersToListMock.mockResolvedValue({
      items: [
        { id: 25, name: "pikachu", height: 4, weight: 60, spriteFront: null, types: [], habitat: null, generation: null },
        { id: 172, name: "pichu", height: 3, weight: 20, spriteFront: null, types: [], habitat: null, generation: null },
      ],
      nextOffset: null,
      total: 2,
      single: false,
    });

    render(<SearchInput />, { wrapper });
    const input = screen.getByRole("combobox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "pika" } });
    });

    await waitFor(
      () => {
        expect(screen.getByText("pikachu")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    expect(screen.getByText("pichu")).toBeInTheDocument();
  });

  it("al seleccionar una sugerencia, navega a la ficha del pokemon", async () => {
    applyFiltersToListMock.mockResolvedValue({
      items: [
        { id: 25, name: "pikachu", height: 4, weight: 60, spriteFront: null, types: [], habitat: null, generation: null },
      ],
      nextOffset: null,
      total: 1,
      single: false,
    });

    render(<SearchInput />, { wrapper });
    const input = screen.getByRole("combobox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "pika" } });
    });

    await waitFor(
      () => {
        expect(screen.getByText("pikachu")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await act(async () => {
      fireEvent.click(screen.getByText("pikachu"));
    });

    expect(goToPokemonMock).toHaveBeenCalledWith("pikachu");
  });
});
