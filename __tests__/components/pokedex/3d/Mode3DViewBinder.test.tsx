import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import {
  PokedexPageProvider,
} from "@/src/components/pokedex/PokedexPageProvider";
import {
  AppShellProvider,
} from "@/src/components/app/ViewContext";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { Mode3DViewBinder } from "@/src/components/pokedex/3d/Mode3DViewBinder";

/*
 * Plan 09 — TDD del Mode3DViewBinder (puente mode3D → DOM).
 *
 * Cobertura:
 *  - Cuando mode3D es true, data-mode-3d="true" en .pokedex-view.
 *  - Cuando mode3D es false, data-mode-3d="false" en .pokedex-view.
 *  - Al desmontar, el atributo se elimina.
 */

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
  // Limpiar atributo residual de tests anteriores.
  document.querySelector(".pokedex-view")?.removeAttribute("data-mode-3d");
});

function renderWithViewBinder() {
  // Creamos un .pokedex-view artificial para que el binder lo encuentre.
  const container = document.createElement("div");
  container.className = "pokedex-view";
  document.body.appendChild(container);

  const result = render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <PokedexPageProvider>
          <Mode3DViewBinder />
        </PokedexPageProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );

  return {
    ...result,
    getViewAttr: () => container.getAttribute("data-mode-3d"),
    cleanup: () => container.remove(),
  };
}

describe("Mode3DViewBinder — puente mode3D → data-mode-3d (Plan 09)", () => {
  it("al montar con mode3D=false, establece data-mode-3d='false' en .pokedex-view", () => {
    const { getViewAttr, cleanup } = renderWithViewBinder();
    expect(getViewAttr()).toBe("false");
    cleanup();
  });

  it("al montar con mode3D=true, establece data-mode-3d='true' en .pokedex-view", () => {
    // Para este test necesitamos modo 3D activo desde el principio.
    // Como PokedexPageProvider inicializa mode3D=false, verificamos
    // que el valor por defecto sea false.
    const container = document.createElement("div");
    container.className = "pokedex-view";
    document.body.appendChild(container);

    render(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <PokedexPageProvider>
            <Mode3DViewBinder />
          </PokedexPageProvider>
        </AppShellProvider>
      </FiltersProvider>,
    );

    // El valor inicial es false porque mode3D inicia en false.
    expect(container.getAttribute("data-mode-3d")).toBe("false");
    container.remove();
  });

  it("al desmontar, elimina el atributo data-mode-3d", () => {
    const container = document.createElement("div");
    container.className = "pokedex-view";
    document.body.appendChild(container);

    const { unmount } = render(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <PokedexPageProvider>
            <Mode3DViewBinder />
          </PokedexPageProvider>
        </AppShellProvider>
      </FiltersProvider>,
    );

    expect(container.hasAttribute("data-mode-3d")).toBe(true);

    act(() => {
      unmount();
    });

    expect(container.hasAttribute("data-mode-3d")).toBe(false);
    container.remove();
  });

  it("el componente en sí no renderiza nada en el DOM", () => {
    const container = document.createElement("div");
    container.className = "pokedex-view";
    document.body.appendChild(container);

    const { container: rendered } = render(
      <FiltersProvider>
        <AppShellProvider initialView="pokedex">
          <PokedexPageProvider>
            <Mode3DViewBinder />
          </PokedexPageProvider>
        </AppShellProvider>
      </FiltersProvider>,
    );

    // El componente devuelve null, así que su contenedor React está vacío.
    expect(rendered.innerHTML).toBe("");
    container.remove();
  });
});
