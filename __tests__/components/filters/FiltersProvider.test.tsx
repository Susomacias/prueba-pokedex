import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import {
  FiltersProvider,
  useFiltersContext,
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

describe("FiltersProvider", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("provee el mismo estado de filtros a múltiples consumidores", () => {
    harnessRef.__harness!.setSearch("type1=fire");

    const a = renderHook(() => useFiltersContext(), { wrapper });
    const b = renderHook(() => useFiltersContext(), { wrapper });

    expect(a.result.current.filters.type1).toBe("fire");
    expect(b.result.current.filters.type1).toBe("fire");
  });

  it("mutar vía setFilter se propaga a todos los consumidores vía URL", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    const a = renderHook(() => useFiltersContext(), { wrapper });
    const b = renderHook(() => useFiltersContext(), { wrapper });

    act(() => {
      a.result.current.setFilter("habitat", "pradera");
    });

    expect(replace).toHaveBeenCalled();

    act(() => {
      harnessRef.__harness!.setSearch("habitat=pradera");
    });

    expect(b.result.current.filters.habitat).toBe("pradera");
  });

  it("fuera del provider lanza error claro", () => {
    expect(() => {
      renderHook(() => useFiltersContext());
    }).toThrow(/FiltersProvider/);
  });
});