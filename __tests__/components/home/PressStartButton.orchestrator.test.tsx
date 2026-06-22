import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PressStartButton } from "@/src/components/home/PressStartButton";
import {
  TransitionOrchestratorProvider,
  useTransitionOrchestrator,
} from "@/src/components/transitions/TransitionOrchestratorContext";
import type { ReactNode } from "react";
import * as assetPreloader from "@/src/components/transitions/assetPreloader";

/**
 * Plan 04.1 — TDD de la interceptación del botón PRESS START por el
 * orquestador.
 *
 * El botón PRESS START sigue siendo un `<Link>` de Next (mantiene
 * prefetch, accesibilidad, href real para el navegador), PERO su
 * `onClick` debe disparar el orquestador y cancelar la navegación
 * nativa. El orquestador es quien decide cuándo hacer `router.push`.
 *
 * Si el orquestador no está disponible (no hay provider, modo SSR
 * puro, etc.) el botón debe seguir funcionando como un enlace nativo:
 * NO lo rompemos en escenarios sin provider.
 */

interface FakeRouter {
  push: ReturnType<typeof vi.fn>;
}

function makeRouter(): FakeRouter {
  return { push: vi.fn() };
}

function Probe() {
  const { isTransitioning } = useTransitionOrchestrator();
  return <span data-testid="probe">{String(isTransitioning)}</span>;
}

function renderWithOrchestrator(ui: ReactNode, router: FakeRouter) {
  return render(
    <TransitionOrchestratorProvider router={router}>
      <Probe />
      {ui}
    </TransitionOrchestratorProvider>,
  );
}

describe("PressStartButton interceptado por orquestador (Plan 04.1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("dentro del provider: el click llama al orquestador y NO navega por sí mismo", async () => {
    vi.useRealTimers();
    const router = makeRouter();
    function Trigger() {
      const { transitionTo } = useTransitionOrchestrator();
      return (
        <button type="button" onClick={() => void transitionTo("pokedex")}>
          go
        </button>
      );
    }
    renderWithOrchestrator(<Trigger />, router);
    await userEvent.click(screen.getByRole("button", { name: /go/i }));
    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
  });

  it("el botón PRESS START sigue exponiendo href='/pokedex' para mantener prefetch y accesibilidad", () => {
    const router = makeRouter();
    renderWithOrchestrator(<PressStartButton />, router);
    const link = screen.getByRole("link", { name: /press start/i });
    expect(link).toHaveAttribute("href", "/pokedex");
    expect(link).toHaveAttribute("data-testid", "home-press-start");
  });

  it("el click sobre PRESS START dentro del provider dispara la transición y marca el orquestador como activo", async () => {
    vi.useRealTimers();
    const router = makeRouter();
    let resolvePreload: (() => void) | null = null;
    const spy = vi
      .spyOn(assetPreloader, "preloadSources")
      .mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePreload = resolve;
          }),
      );

    renderWithOrchestrator(<PressStartButton />, router);
    const link = screen.getByRole("link", { name: /press start/i });
    expect(screen.getByTestId("probe")).toHaveTextContent("false");

    await userEvent.click(link);

    // Mientras el preload está pendiente: navegación no ha ocurrido y
    // el orquestador está activo.
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByTestId("probe")).toHaveTextContent("true");

    await act(async () => {
      resolvePreload?.();
      await Promise.resolve();
    });

    expect(router.push).toHaveBeenCalledWith("/pokedex", { scroll: false });
    expect(screen.getByTestId("probe")).toHaveTextContent("false");
    spy.mockRestore();
  });
});