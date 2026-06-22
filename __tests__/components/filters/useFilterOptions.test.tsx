import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useFilterOptions,
  __resetFilterOptionsCache,
} from "@/src/components/filters/useFilterOptions";
import type { ReactNode } from "react";

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  fetchTypeOptions: vi.fn(),
  fetchGenerationOptions: vi.fn(),
  fetchColorOptions: vi.fn(),
  fetchHabitatOptions: vi.fn(),
  fetchAbilityOptions: vi.fn(),
  fetchHeightBuckets: vi.fn(),
  fetchWeightBuckets: vi.fn(),
}));

import * as api from "@/src/lib/pokemon/cachedPokemonApi";

function wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

describe("useFilterOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetFilterOptionsCache();
  });

  it("carga opciones de tipo bajo demanda", async () => {
    const mockTypes = [
      { value: "fire", label: "Fuego" },
      { value: "water", label: "Agua" },
    ];
    vi.mocked(api.fetchTypeOptions).mockResolvedValueOnce(mockTypes);

    const { result } = renderHook(() => useFilterOptions("type"), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(result.current.options).toEqual(mockTypes);
    expect(api.fetchTypeOptions).toHaveBeenCalledTimes(1);
  });

  it("reutiliza la caché cliente: dos llamadas en el mismo render → una sola request", async () => {
    const mockTypes = [{ value: "fire", label: "Fuego" }];
    vi.mocked(api.fetchTypeOptions).mockResolvedValueOnce(mockTypes);

    const first = renderHook(() => useFilterOptions("type"), { wrapper });
    await waitFor(() => expect(first.result.current.status).toBe("ready"));

    const second = renderHook(() => useFilterOptions("type"), { wrapper });
    await waitFor(() => expect(second.result.current.status).toBe("ready"));

    expect(api.fetchTypeOptions).toHaveBeenCalledTimes(1);
    expect(second.result.current.options).toEqual(mockTypes);
  });

  it("carga opciones de habitat", async () => {
    const mockHabitats = [{ value: "caverna", label: "Caverna" }];
    vi.mocked(api.fetchHabitatOptions).mockResolvedValueOnce(mockHabitats);

    const { result } = renderHook(() => useFilterOptions("habitat"), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.options).toEqual(mockHabitats);
    expect(api.fetchHabitatOptions).toHaveBeenCalledTimes(1);
  });

  it("carga buckets de altura", async () => {
    const mockBuckets = [
      { value: "xs", label: "XS", min: -Infinity, max: 3 },
    ];
    vi.mocked(api.fetchHeightBuckets).mockReturnValueOnce(mockBuckets);

    const { result } = renderHook(() => useFilterOptions("height"), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.options).toEqual(mockBuckets);
  });

  it("reporta estado 'error' cuando la carga falla", async () => {
    vi.mocked(api.fetchTypeOptions).mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useFilterOptions("type"), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error).toBeInstanceOf(Error);
  });
});