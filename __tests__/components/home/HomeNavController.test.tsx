import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  HomeNavigationProvider,
  type HomeRouterLike,
} from "@/src/components/home/HomeNavigationContext";
import { HomeNavController } from "@/src/components/home/HomeNavController";
import type { ReactNode } from "react";

/**
 * Plan 03.5 — TDD del controlador global de teclado/click.
 *
 * Comportamiento esperado:
 *   - Pulsa Enter → navega a `/pokedex`.
 *   - Pulsa Space → navega a `/pokedex`.
 *   - Pulsa cualquier letra A–Z → navega a `/pokedex`.
 *   - Pulsa teclas no imprimibles (Shift, Ctrl, Tab, F1…) → NO navega.
 *   - Click en el contenedor principal → navega.
 *   - Click en un `<a>` o `<button>` hijo → NO navega con nuestro
 *     handler (deja que el `<Link>`/`<button>` haga su trabajo).
 *   - El flag `isNavigating` evita una segunda navegación mientras
 *     la primera no haya terminado.
 *   - Los listeners se eliminan al desmontar.
 */

function makeRouter(): HomeRouterLike {
  return {
    push: vi.fn(),
  };
}

function renderWithProviders(ui: ReactNode, router: HomeRouterLike) {
  return render(
    <HomeNavigationProvider router={router}>
      <HomeNavController>{ui}</HomeNavController>
    </HomeNavigationProvider>,
  );
}

describe("HomeNavController (Plan 03.5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Pulsa Enter en el documento y dispara router.push('/pokedex')", () => {
    const router = makeRouter();
    renderWithProviders(<div data-testid="child" />, router);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("Pulsa Space y dispara router.push('/pokedex')", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("Pulsa varias letras A–Z seguidas: solo la primera dispara navegación (el resto son no-ops)", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    for (const key of ["a", "m", "Z"]) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key }));
      });
    }

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("Pulsa teclas no imprimibles (Shift, Control, Tab, F1) y NO navega", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    for (const key of ["Shift", "Control", "Alt", "Meta", "Tab", "F1", "Escape"]) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key }));
      });
    }

    expect(router.push).not.toHaveBeenCalled();
  });

  it("Pulsa números u otros símbolos no imprimibles: NO navega (solo letras, Enter, Space)", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    for (const key of ["1", "0", "!", "?", "ArrowUp"]) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key }));
      });
    }

    expect(router.push).not.toHaveBeenCalled();
  });

  it("Click en el contenedor principal (sobre zona neutra) navega a /pokedex", async () => {
    vi.useRealTimers();
    const router = makeRouter();
    renderWithProviders(
      <main data-testid="container">
        <span>zona neutra</span>
      </main>,
      router,
    );

    await userEvent.click(screen.getByText("zona neutra"));

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("Click en un <a>/<button> hijo: NO navega con el handler (deja al Link/button actuar)", async () => {
    vi.useRealTimers();
    const router = makeRouter();
    renderWithProviders(
      <main>
        <a href="#dummy" data-testid="link">
          link interno
        </a>
        <button type="button" data-testid="button">
          botón interno
        </button>
      </main>,
      router,
    );

    await userEvent.click(screen.getByTestId("link"));
    await userEvent.click(screen.getByTestId("button"));

    expect(router.push).not.toHaveBeenCalled();
  });

  it("El flag isNavigating evita una segunda navegación mientras la primera no termina", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("Elimina los listeners de keydown y click al desmontar", () => {
    const router = makeRouter();
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderWithProviders(<div />, router);

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function));
    removeSpy.mockRestore();
  });
});
