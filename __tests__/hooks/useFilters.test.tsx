import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "./harness";
import { useFilters } from "@/src/hooks/useFilters";

const harnessRef = globalThis as unknown as { __harness?: NavigationHarness };

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => {
    const h = harnessRef.__harness;
    if (!h) {
      throw new Error("harness not initialized");
    }
    // Forzamos un re-render del consumidor en cada notify del harness.
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
  return <>{children}</>;
}

describe("useFilters (bidireccional con URL)", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("expone los filtros actuales parseados desde la URL", () => {
    harnessRef.__harness!.setSearch("type1=fire&habitat=pradera");
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.filters.type1).toBe("fire");
    expect(result.current.filters.habitat).toBe("pradera");
    expect(result.current.filters.generation).toBeUndefined();
  });

  it("setFilter actualiza la URL con router.replace (sin scroll, sin recarga)", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.setFilter("type1", "water");
    });

    expect(replace).toHaveBeenCalledTimes(1);
    const url = replace.mock.calls[0][0] as string;
    expect(url).toBe("/pokedex?type1=Agua");
  });

  it("removeFilter elimina la clave de la URL", () => {
    harnessRef.__harness!.setSearch("type1=fire&habitat=pradera");
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.removeFilter("type1");
    });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toBe("/pokedex?habitat=pradera");
  });

  it("clearAll elimina todas las claves", () => {
    harnessRef.__harness!.setSearch(
      "type1=fire&habitat=pradera&generation=generation-i",
    );
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.clearAll();
    });

    expect(replace.mock.calls[0][0]).toBe("/pokedex");
  });

  it("clearAll con la búsqueda vacía no llama replace", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.clearAll();
    });

    expect(replace).not.toHaveBeenCalled();
  });

  it("los filtros se conservan al cambiar el path (p. ej. /pokemon/[name])", () => {
    harnessRef.__harness!.setSearch("type1=fire");
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      harnessRef.__harness!.setPathname("/pokemon/charmander");
    });

    expect(result.current.filters.type1).toBe("fire");

    act(() => {
      result.current.setFilter("habitat", "pradera");
    });

    expect(replace.mock.calls[0][0]).toBe(
      "/pokemon/charmander?type1=Fuego&habitat=pradera",
    );
  });

  it("summary devuelve una entrada por filtro activo", () => {
    harnessRef.__harness!.setSearch("type1=fire&habitat=pradera");

    const { result } = renderHook(() => useFilters(), { wrapper });

    const keys = result.current.summary().map((s) => s.key).sort();
    expect(keys).toEqual(["habitat", "type1"]);
    expect(
      result.current.summary().find((s) => s.key === "type1")?.display,
    ).toBe("Fuego");
  });

  it("activeCount cuenta los filtros activos", () => {
    harnessRef.__harness!.setSearch(
      "type1=fire&habitat=pradera&generation=generation-i",
    );

    const { result } = renderHook(() => useFilters(), { wrapper });

    expect(result.current.activeCount).toBe(3);
  });

  it("reacciona a back/forward (cambios en useSearchParams)", () => {
    harnessRef.__harness!.setSearch("type1=fire");
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.filters.type1).toBe("fire");

    act(() => {
      harnessRef.__harness!.setSearch("type1=water");
    });

    expect(result.current.filters.type1).toBe("water");
  });
});
