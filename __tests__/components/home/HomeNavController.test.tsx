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
 *   - El listener de keydown se registra en `document` en fase de
 *     captura para ganar al `<a>`/`<button>` con foco (corrección
 *     del bug del e2e "pulsa Space" en el que el `<a>` PRESS START
 *     con `transform: scale` animado cancelaba su propia acción
 *     por defecto y la URL quedaba en `/`).
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
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("Pulsa Space y dispara router.push('/pokedex')", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("Pulsa Space con el foco en un <a> interno: navega por el listener global (capture), no por el <a>", () => {
    // Garantía post-corrección del bug del e2e "pulsa Space":
    // el listener está en fase de captura en `document` y consume
    // el evento antes de que el <a> (PRESS START) ejecute su
    // acción por defecto. Sin esto, el <a> con `transform: scale`
    // animado cancela su propia navegación y la página quedaba
    // en `/`.
    const router = makeRouter();
    renderWithProviders(
      <main>
        <a href="/pokedex" data-testid="link">
          PRESS START
        </a>
      </main>,
      router,
    );

    const link = screen.getByTestId("link");
    link.focus();
    expect(document.activeElement).toBe(link);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("El listener de keydown se registra en `document` y en fase de captura para ganar al <a>/<button> con foco", () => {
    const router = makeRouter();
    const addSpy = vi.spyOn(document, "addEventListener");
    renderWithProviders(<div />, router);

    const keydownCall = addSpy.mock.calls.find(
      ([type]) => type === "keydown",
    );
    expect(keydownCall).toBeDefined();
    // El tercer argumento del `addEventListener` es el `options` y
    // debe llevar `capture: true`.
    expect(keydownCall?.[2]).toMatchObject({ capture: true });

    addSpy.mockRestore();
  });

  it("Pulsa varias letras A–Z seguidas: solo la primera dispara navegación (el resto son no-ops)", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    for (const key of ["a", "m", "Z"]) {
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key }));
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
        document.dispatchEvent(new KeyboardEvent("keydown", { key }));
      });
    }

    expect(router.push).not.toHaveBeenCalled();
  });

  it("Pulsa números u otros símbolos no imprimibles: NO navega (solo letras, Enter, Space)", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    for (const key of ["1", "0", "!", "?", "ArrowUp"]) {
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key }));
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

  it("Click cuyo target es un <svg> hijo de un <button>: NO navega (regresión del bug del botón de sonido)", () => {
    // Regresión del bug detectado en el e2e: cuando el icono SVG
    // interno del <button> de sonido (lucide) era el `event.target`,
    // `target.closest("button")` devolvía `null` en algunos casos
    // (SVG dentro de Shadow DOM del dev overlay de Next) y el
    // handler global navegaba a /pokedex aunque el usuario hubiera
    // pulsado el botón de sonido. La corrección recorre
    // `composedPath()` para encontrar el <button> ancestro real.
    const router = makeRouter();
    renderWithProviders(
      <main>
        <button type="button" data-testid="sound">
          <svg data-testid="sound-icon" />
        </button>
      </main>,
      router,
    );

    const icon = screen.getByTestId("sound-icon");
    const button = screen.getByTestId("sound");

    act(() => {
      icon.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    // Sanity check: el botón sigue ahí y NO se ha navegado.
    expect(button).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("Click directo en el <button> de sonido: NO navega (deja al toggle actuar)", () => {
    const router = makeRouter();
    renderWithProviders(
      <main>
        <button type="button" data-testid="sound">
          sonido
        </button>
      </main>,
      router,
    );

    const button = screen.getByTestId("sound");

    act(() => {
      button.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(router.push).not.toHaveBeenCalled();
  });

  it("El flag isNavigating evita una segunda navegación mientras la primera no termina", () => {
    const router = makeRouter();
    renderWithProviders(<div />, router);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("Elimina los listeners de keydown y click al desmontar", () => {
    const router = makeRouter();
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderWithProviders(<div />, router);

    unmount();

    const keydownCall = removeSpy.mock.calls.find(
      ([type]) => type === "keydown",
    );
    const clickCall = removeSpy.mock.calls.find(
      ([type]) => type === "click",
    );
    // Ambos listeners deben limpiarse con `capture: true` para
    // que coincida con cómo se registraron (asignetría entre
    // add y remove rompe el cleanup y deja handlers zombi).
    expect(keydownCall?.[2]).toMatchObject({ capture: true });
    expect(clickCall?.[2]).toMatchObject({ capture: true });
    removeSpy.mockRestore();
  });
});
