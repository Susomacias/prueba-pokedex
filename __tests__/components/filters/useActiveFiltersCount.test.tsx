import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import {
  FiltersProvider,
  useActiveFiltersCount,
} from "@/src/components/filters/FiltersProvider";

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

function wrapper({ children }: { children: ReactNode }) {
  return <FiltersProvider>{children}</FiltersProvider>;
}

describe("useActiveFiltersCount (FiltersProvider)", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("devuelve 0 cuando no hay filtros activos", () => {
    const { result } = renderHook(() => useActiveFiltersCount(), { wrapper });
    expect(result.current).toBe(0);
  });

  it("cuenta los filtros activos desde la URL inicial", () => {
    harnessRef.__harness!.setSearch("type1=fire&habitat=pradera&generation=generation-i");

    const { result } = renderHook(() => useActiveFiltersCount(), { wrapper });

    expect(result.current).toBe(3);
  });

  it("reacciona a cambios posteriores en la URL", () => {
    harnessRef.__harness!.setSearch("type1=fire");

    const { result } = renderHook(() => useActiveFiltersCount(), { wrapper });
    expect(result.current).toBe(1);

    act(() => {
      harnessRef.__harness!.setSearch("type1=fire&habitat=pradera");
    });
    expect(result.current).toBe(2);
  });
});