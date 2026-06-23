import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePokemonModel, clearModelCache } from "@/src/components/pokedex/3d/usePokemonModel";

/*
 * Plan 09.1 — TDD del hook usePokemonModel.
 *
 * Cobertura:
 *  - Construye la URL correcta con el id real del fixture.
 *  - Estados progresan idle → loading → ready.
 *  - Ante error, estado es error (sin lanzar excepción).
 *  - Cache: misma id → solo una carga.
 *  - Cambiar de id carga nuevo modelo.
 */

const MODEL_BASE =
  "https://raw.githubusercontent.com/Pokemon-3D-api/assets/refs/heads/main/models/opt/regular";

// IDs reales de los fixtures (capturados de PokeAPI v1beta)
const PIKACHU_ID = 25;
const EEVEE_ID = 133;
const MAGIKARP_ID = 129;
const NONEXISTENT_ID = 10000;

const state = vi.hoisted(() => ({
  loadCallCount: 0,
  capturedUrls: [] as string[],
  shouldError: false,
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    load: (
      url: string,
      onLoad: (gltf: unknown) => void,
      _onProgress: unknown,
      onError: (err: unknown) => void,
    ) => void;
    constructor() {
      this.load = (
        url: string,
        onLoad: (gltf: unknown) => void,
        _onProgress: unknown,
        onError: (err: unknown) => void,
      ) => {
        state.loadCallCount++;
        state.capturedUrls.push(url);
        if (state.shouldError) {
          onError(new Error("Failed to fetch"));
        } else {
          onLoad({ scene: { type: "Group", name: "mock-scene" } });
        }
      };
    }
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.loadCallCount = 0;
  state.capturedUrls.length = 0;
  state.shouldError = false;
  clearModelCache();
});

describe("usePokemonModel (Plan 09.1)", () => {
  it("construye la URL correcta para el id real de pikachu (id=25)", async () => {
    const { result } = renderHook(() => usePokemonModel(PIKACHU_ID));

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(state.capturedUrls[0]).toBe(`${MODEL_BASE}/${PIKACHU_ID}.glb`);
  });

  it("construye la URL correcta para eevee (id=133)", async () => {
    const { result } = renderHook(() => usePokemonModel(EEVEE_ID));

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(state.capturedUrls[0]).toBe(`${MODEL_BASE}/${EEVEE_ID}.glb`);
  });

  it("construye la URL correcta para magikarp (id=129)", async () => {
    const { result } = renderHook(() => usePokemonModel(MAGIKARP_ID));

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(state.capturedUrls[0]).toBe(`${MODEL_BASE}/${MAGIKARP_ID}.glb`);
  });

  it("progresa idle → loading → ready al cargar correctamente", async () => {
    const { result } = renderHook(() => usePokemonModel(PIKACHU_ID));

    expect(result.current.status).toBe("loading");

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(result.current.model).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("con pokemonId null, se queda en idle", () => {
    const { result } = renderHook(() => usePokemonModel(null));

    expect(result.current.status).toBe("idle");
    expect(result.current.model).toBeNull();
    expect(state.loadCallCount).toBe(0);
  });

  it("ante error en la carga, estado es error sin lanzar excepción", async () => {
    state.shouldError = true;

    const { result } = renderHook(() => usePokemonModel(NONEXISTENT_ID));

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.model).toBeNull();
  });

  it("dos llamadas con el mismo id solo cargan una vez (cache)", async () => {
    const { result: r1, unmount: u1 } = renderHook(() =>
      usePokemonModel(PIKACHU_ID),
    );

    await waitFor(() => {
      expect(r1.current.status).toBe("ready");
    });

    expect(state.loadCallCount).toBe(1);

    u1();

    const { result: r2 } = renderHook(() => usePokemonModel(PIKACHU_ID));

    expect(r2.current.status).toBe("ready");
    expect(r2.current.model).not.toBeNull();
    expect(state.loadCallCount).toBe(1);
  });

  it("cambiar de id carga un nuevo modelo", async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: number | null }) => usePokemonModel(id),
      { initialProps: { id: PIKACHU_ID } },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    const firstLoadCount = state.loadCallCount;

    rerender({ id: EEVEE_ID });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(state.loadCallCount).toBe(firstLoadCount + 1);
  });

  it("el error se limpia al cambiar a un id válido", async () => {
    state.shouldError = true;

    const { result, rerender } = renderHook(
      ({ id }: { id: number | null }) => usePokemonModel(id),
      { initialProps: { id: NONEXISTENT_ID } },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    state.shouldError = false;
    clearModelCache();
    rerender({ id: PIKACHU_ID });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.model).not.toBeNull();
  });
});
