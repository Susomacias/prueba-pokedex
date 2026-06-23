import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { ResetFilterButtons } from "@/src/components/filters/ResetFilterButtons";

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

const goToPokedexMock = vi.fn();

vi.mock("@/src/components/app/ViewContext", () => ({
  useAppShell: () => ({
    goToPokemon: vi.fn(),
    goToPokedex: goToPokedexMock,
    goToHome: vi.fn(),
    pathname: "/pokedex",
    view: "pokedex",
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <FiltersProvider>{children}</FiltersProvider>;
}

describe("ResetFilterButtons (Plan 07.4)", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
    vi.clearAllMocks();
    goToPokedexMock.mockClear();
  });

  it("reset vacia los filtros (clearAll)", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    harnessRef.__harness!.setSearch("type1=fire&habitat=pradera");

    render(<ResetFilterButtons />, { wrapper });

    const resetBtn = screen.getByRole("button", { name: /reset/i });
    act(() => {
      fireEvent.click(resetBtn);
    });

    expect(replace).toHaveBeenCalled();
    expect(replace.mock.calls[0][0]).toBe("/pokedex");
  });

  it("filtrar con pokemon seleccionado vuelve a la lista (mantiene filtros)", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    harnessRef.__harness!.setPathname("/pokemon/pikachu");
    harnessRef.__harness!.setSearch("type1=fire");

    render(<ResetFilterButtons />, { wrapper });

    const filterBtn = screen.getByRole("button", { name: /filtrar/i });
    act(() => {
      fireEvent.click(filterBtn);
    });

    expect(goToPokedexMock).toHaveBeenCalled();
  });

  it("reset sin filtros aplicados no llama replace", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    render(<ResetFilterButtons />, { wrapper });

    const resetBtn = screen.getByRole("button", { name: /reset/i });
    act(() => {
      fireEvent.click(resetBtn);
    });

    expect(replace).not.toHaveBeenCalled();
  });
});
