import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { HomeNavigationProvider, useHomeNavigation } from "@/src/components/home/HomeNavigationContext";

/**
 * Plan 03.5 — TDD del contexto que centraliza la navegación de la
 * pantalla de inicio.
 *
 * La pantalla de inicio debe poder navegar a `/pokedex` desde varios
 * puntos de entrada:
 *
 *   - Click en cualquier zona del contenedor principal.
 *   - Pulsar Enter, Space o cualquier letra A–Z.
 *   - Click en el botón PRESS START (que es un `<Link>`).
 *
 * Centralizamos la navegación en un único punto para:
 *   - Evitar dobles navegaciones (flag `isNavigating`).
 *   - Exponer el estado de loading al overlay (`isLoading`).
 *   - Permitir que el Plan 04 sustituya la implementación real de
 *     `navigate()` (con una transición animada) sin tocar los
 *     consumidores.
 */

function makeRouterMock() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  };
}

function renderWithProvider(ui: ReactNode, router = makeRouterMock()) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <HomeNavigationProvider router={router}>{children}</HomeNavigationProvider>
    );
  }
  return { Wrapper, router };
}

describe("HomeNavigationContext (Plan 03.5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("estado inicial: no navegando y sin loading", () => {
    const { Wrapper } = renderWithProvider(<></>);
    function Display() {
      const { isNavigating, isLoading } = useHomeNavigation();
      return (
        <>
          <span data-testid="navigating">{String(isNavigating)}</span>
          <span data-testid="loading">{String(isLoading)}</span>
        </>
      );
    }
    render(
      <Wrapper>
        <Display />
      </Wrapper>,
    );
    expect(screen.getByTestId("navigating")).toHaveTextContent("false");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("navigate() llama a router.push('/pokedex')", () => {
    const router = makeRouterMock();
    const { Wrapper } = renderWithProvider(<></>, router);
    function Button() {
      const { navigate } = useHomeNavigation();
      return (
        <button type="button" onClick={() => navigate()}>
          go
        </button>
      );
    }
    render(
      <Wrapper>
        <Button />
      </Wrapper>,
    );

    act(() => {
      screen.getByRole("button", { name: /go/i }).click();
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("evita doble navegación: una segunda llamada mientras isNavigating es true NO llama a router.push", () => {
    const router = makeRouterMock();
    const { Wrapper } = renderWithProvider(<></>, router);
    let navigateRef!: () => void;
    function Trigger() {
      const { navigate } = useHomeNavigation();
      navigateRef = navigate;
      return <button type="button" onClick={navigate}>go</button>;
    }
    render(
      <Wrapper>
        <Trigger />
      </Wrapper>,
    );

    act(() => {
      navigateRef();
    });
    expect(router.push).toHaveBeenCalledTimes(1);

    act(() => {
      navigateRef();
    });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("muestra isLoading=true mientras navigate() no haya completado y lo desactiva al completar", async () => {
    vi.useRealTimers();
    let resolvePush: (() => void) | null = null;
    const router = {
      ...makeRouterMock(),
      push: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePush = resolve;
          }),
      ),
    };
    const { Wrapper } = renderWithProvider(<></>, router);
    function Display() {
      const { isLoading, navigate } = useHomeNavigation();
      return (
        <>
          <span data-testid="loading">{String(isLoading)}</span>
          <button type="button" onClick={() => navigate()}>
            go
          </button>
        </>
      );
    }
    render(
      <Wrapper>
        <Display />
      </Wrapper>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("false");

    await userEvent.setup().click(screen.getByRole("button", { name: /go/i }));

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(router.push).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePush?.();
      // Dejamos que las microtasks pendientes se ejecuten.
      await Promise.resolve();
    });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });
});

describe("useHomeNavigation fuera del provider", () => {
  it("lanza error informativo", () => {
    expect(() => render(<Probe />)).toThrow(/HomeNavigationProvider/i);
  });

  function Probe() {
    useHomeNavigation();
    return null;
  }
});
