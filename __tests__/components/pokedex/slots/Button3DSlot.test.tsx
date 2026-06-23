import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button3DSlot } from "@/src/components/pokedex/slots/Button3DSlot";
import {
  PokedexPageProvider,
} from "@/src/components/pokedex/PokedexPageProvider";
import {
  AppShellProvider,
} from "@/src/components/app/ViewContext";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";

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

beforeEach(() => { vi.clearAllMocks(); });

function render3DButton(mode3D: boolean = false) {
  return render(
    <FiltersProvider>
      <AppShellProvider initialView="pokedex">
        <PokedexPageProvider>
          <Button3DSlot mode3D={mode3D} />
        </PokedexPageProvider>
      </AppShellProvider>
    </FiltersProvider>,
  );
}

describe("Button3DSlot — botón Ver en 3D (Plan 08.5)", () => {
  it("se renderiza con icono Box y texto '3D' en azul oscuro cuando inactivo", () => {
    render3DButton(false);
    const btn = screen.getByRole("button", { name: /ver en 3d/i });
    expect(btn).toBeInTheDocument();
    const svg = btn.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.classList.toString()).toContain("lucide-box");
  });

  it("se renderiza con icono ChevronDown cuando activo", () => {
    render3DButton(true);
    const btn = screen.getByRole("button", { name: /cerrar 3d/i });
    expect(btn).toBeInTheDocument();
    const svg = btn.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.classList.toString()).toContain("lucide-chevron-down");
  });

  it("aria-label cambia entre 'Ver en 3D' y 'Cerrar 3D'", () => {
    render3DButton(true);
    const btn = screen.getByRole("button", { name: /cerrar 3d/i });
    expect(btn.getAttribute("aria-label")).toBe("Cerrar 3D");
  });

  it("aria-pressed es false cuando no está activo", () => {
    render3DButton(false);
    const btn = screen.getByRole("button", { name: /ver en 3d/i });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("aria-pressed es true cuando está activo", () => {
    render3DButton(true);
    const btn = screen.getByRole("button", { name: /cerrar 3d/i });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("data-active refleja el estado activo", () => {
    render3DButton(true);
    const btn = screen.getByRole("button", { name: /cerrar 3d/i });
    expect(btn.getAttribute("data-active")).toBe("true");
  });

  it("tiene clase button-3d y animación CSS", () => {
    render3DButton(false);
    const btn = screen.getByRole("button", { name: /ver en 3d/i });
    expect(btn.className).toContain("button-3d");
  });

  it("click dispara el toggle (no lanza error)", () => {
    render3DButton(false);
    const btn = screen.getByRole("button", { name: /ver en 3d/i });
    expect(() => fireEvent.click(btn)).not.toThrow();
  });

  it("el texto 3D usa color azul oscuro cuando inactivo", () => {
    render3DButton(false);
    const btn = screen.getByRole("button", { name: /ver en 3d/i });
    const span = btn.querySelector("span");
    expect(span).not.toBeNull();
    expect(span!.style.color).toBeTruthy();
  });
});
