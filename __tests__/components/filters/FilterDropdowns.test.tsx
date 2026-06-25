import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import {
  FiltersProvider,
} from "@/src/components/filters/FiltersProvider";
import { __resetFilterOptionsCache } from "@/src/components/filters/useFilterOptions";
import { __resetFilterAvailabilityCache } from "@/src/components/filters/useFilterAvailability";
import { FilterDropdowns } from "@/src/components/filters/FilterDropdowns";

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

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  fetchTypeOptions: vi.fn().mockResolvedValue([
    { value: "fire", label: "Fuego", image: undefined },
    { value: "water", label: "Agua", image: undefined },
    { value: "grass", label: "Planta", image: undefined },
    { value: "electric", label: "Eléctrico", image: undefined },
  ]),
  fetchGenerationOptions: vi.fn().mockResolvedValue([
    { value: "generation-i", label: "Kanto", image: undefined },
    { value: "generation-ii", label: "Johto", image: undefined },
  ]),
  fetchColorOptions: vi.fn().mockResolvedValue([
    { value: "red", label: "Rojo", image: undefined },
    { value: "blue", label: "Azul", image: undefined },
  ]),
  fetchHabitatOptions: vi.fn().mockResolvedValue([
    { value: "bosque", label: "Bosque", image: undefined },
    { value: "caverna", label: "Caverna", image: undefined },
  ]),
  fetchAbilityOptions: vi.fn().mockResolvedValue([
    { value: "overgrow", label: "Overgrow", image: undefined },
    { value: "blaze", label: "Blaze", image: undefined },
  ]),
  fetchHeightBuckets: vi.fn().mockResolvedValue([
    { value: "0-5", label: "0-5 dm", min: 0, max: 5 },
    { value: "5-10", label: "5-10 dm", min: 5, max: 10 },
  ]),
  fetchWeightBuckets: vi.fn().mockResolvedValue([
    { value: "0-10", label: "0-10 hg", min: 0, max: 10 },
    { value: "10-50", label: "10-50 hg", min: 10, max: 50 },
  ]),
  fetchAllPokemonFilterFields: vi.fn().mockResolvedValue([]),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <FiltersProvider>{children}</FiltersProvider>;
}

describe("FilterDropdowns (Plan 07.2)", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
    __resetFilterOptionsCache();
    __resetFilterAvailabilityCache();
  });

  it("renderiza 8 botones en un grid", () => {
    render(<FilterDropdowns />, { wrapper });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(8);
  });

  it("renderiza los nombres de los filtros en los botones", () => {
    render(<FilterDropdowns />, { wrapper });
    expect(screen.getByRole("button", { name: /tipo 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tipo 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generación/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /color/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hábitat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /habilidad/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /altura/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /peso/i })).toBeInTheDocument();
  });

  it("al hacer clic en un botón se abre un panel con opciones", async () => {
    render(<FilterDropdowns />, { wrapper });
    const btn = screen.getByRole("button", { name: /tipo 1/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("filter-dropdown-panel")).toBeInTheDocument();
    });
  });

  it("el panel de opciones tiene un buscador interno que filtra las opciones", async () => {
    const user = userEvent.setup();
    render(<FilterDropdowns />, { wrapper });
    const btn = screen.getByRole("button", { name: /tipo 1/i });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Fuego/)).toBeInTheDocument();
      expect(screen.getByText(/Agua/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, "fue");

    await waitFor(() => {
      expect(screen.getByText(/Fuego/)).toBeInTheDocument();
      expect(screen.queryByText(/Agua/)).not.toBeInTheDocument();
    });
  });

  it("al seleccionar una opción se aplica el filtro y se cierra el panel", async () => {
    const user = userEvent.setup();
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    render(<FilterDropdowns />, { wrapper });
    const btn = screen.getByRole("button", { name: /tipo 1/i });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Fuego/)).toBeInTheDocument();
    });

    const option = screen.getByText(/Fuego/);
    await user.click(option);

    expect(replace).toHaveBeenCalledTimes(1);
    const url = replace.mock.calls[0][0] as string;
    expect(url).toContain("type1=Fuego");

    await waitFor(() => {
      expect(screen.queryByTestId("filter-dropdown-panel")).not.toBeInTheDocument();
    });
  });

  it("el botón con filtro aplicado muestra estado visual activo", async () => {
    harnessRef.__harness!.setSearch("type1=fire");
    render(<FilterDropdowns />, { wrapper });

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /tipo 1/i });
      expect(btn.getAttribute("data-active")).toBe("true");
    });

    const otherBtn = screen.getByRole("button", { name: /tipo 2/i });
    expect(otherBtn.getAttribute("data-active")).toBe("false");
  });

  it("al hacer clic fuera del panel se cierra", async () => {
    const user = userEvent.setup();
    render(<FilterDropdowns />, { wrapper });
    const btn = screen.getByRole("button", { name: /tipo 1/i });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("filter-dropdown-panel")).toBeInTheDocument();
    });

    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId("filter-dropdown-panel")).not.toBeInTheDocument();
    });
  });

  it("al pulsar Escape se cierra el panel", async () => {
    const user = userEvent.setup();
    render(<FilterDropdowns />, { wrapper });
    const btn = screen.getByRole("button", { name: /tipo 1/i });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("filter-dropdown-panel")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByTestId("filter-dropdown-panel")).not.toBeInTheDocument();
    });
  });

  it("las opciones muestran indicador de carga mientras se cargan", async () => {
    render(<FilterDropdowns />, { wrapper });
    const btn = screen.getByRole("button", { name: /tipo 1/i });
    fireEvent.click(btn);

    expect(screen.getByTestId("filter-dropdown-loading")).toBeInTheDocument();
  });
});
