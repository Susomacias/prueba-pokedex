import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  pokedexPreloadBus,
  PokedexPreloadStatus,
  PokedexPreloadReporter,
} from "@/src/components/transitions/pokedexPreloadBus";

/**
 * Plan 04 (precarga) — TDD del bus `pokedexPreloadBus`.
 *
 * El bus expone el estado de la precarga de la Pokédex ABIERTA en la
 * pantalla de inicio. La Pokédex se monta en un portal con
 * `translateY(100%)` y los datos se obtienen en background. Mientras
 * no esté lista, la Home NO debe disparar la transición de salida (la
 * carcasa aparecería saltando). Cuando esté lista, el orquestador
 * puede disparar la transición sabiendo que la carcasa subirá al
 * centro sin glitches.
 *
 * Estados:
 *   - "idle": no hay nadie cargando todavía.
 *   - "loading": el portal arrancó la precarga (datos + svg).
 *   - "ready": el portal terminó de cargar y puede animar al centro.
 *
 * Hay dos reporters:
 *   - `subscribe(reporter)`: callbacks de cambio de estado.
 *   - `reportStatus(status)`: lo llama el portal cuando cambia su
 *     estado. Si nadie está suscrito, también se puede leer vía
 *     `getStatus()` (para tests que montan y consultan sincrónicamente).
 */

describe("pokedexPreloadBus (Plan 04 — precarga en Home)", () => {
  beforeEach(() => {
    pokedexPreloadBus._resetForTests();
  });

  afterEach(() => {
    pokedexPreloadBus._resetForTests();
  });

  it("estado inicial: idle (sin portal montado)", () => {
    expect(pokedexPreloadBus.getStatus()).toBe("idle");
  });

  it("reportStatus cambia el estado y notifica a los suscriptores", () => {
    const listener = vi.fn();
    pokedexPreloadBus.subscribe(listener);

    act(() => {
      pokedexPreloadBus.reportStatus("loading");
    });
    expect(listener).toHaveBeenCalledWith("loading");
    expect(pokedexPreloadBus.getStatus()).toBe("loading");

    act(() => {
      pokedexPreloadBus.reportStatus("ready");
    });
    expect(listener).toHaveBeenLastCalledWith("ready");
    expect(pokedexPreloadBus.getStatus()).toBe("ready");
  });

  it("subscribe devuelve una función de cleanup que desuscribe", () => {
    const listener = vi.fn();
    const unsubscribe = pokedexPreloadBus.subscribe(listener);

    act(() => {
      pokedexPreloadBus.reportStatus("loading");
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    act(() => {
      pokedexPreloadBus.reportStatus("ready");
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("varios suscriptores reciben todos el evento", () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    pokedexPreloadBus.subscribe(l1);
    pokedexPreloadBus.subscribe(l2);

    act(() => {
      pokedexPreloadBus.reportStatus("ready");
    });

    expect(l1).toHaveBeenCalledWith("ready");
    expect(l2).toHaveBeenCalledWith("ready");
  });

  it("hasReadySubscriber es true solo si hay suscriptores y el estado es ready", () => {
    expect(pokedexPreloadBus.hasReadySubscriber()).toBe(false);

    pokedexPreloadBus.reportStatus("ready");
    expect(pokedexPreloadBus.hasReadySubscriber()).toBe(false);

    pokedexPreloadBus.subscribe(vi.fn());
    expect(pokedexPreloadBus.hasReadySubscriber()).toBe(true);
  });

  it("usePokedexPreloadStatus hook refleja el estado actual del bus", () => {
    function Probe() {
      const status = pokedexPreloadBus.useStatus();
      return <span data-testid="probe">{status}</span>;
    }
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("idle");

    act(() => {
      pokedexPreloadBus.reportStatus("loading");
    });
    expect(screen.getByTestId("probe")).toHaveTextContent("loading");

    act(() => {
      pokedexPreloadBus.reportStatus("ready");
    });
    expect(screen.getByTestId("probe")).toHaveTextContent("ready");
  });

  it("usePokedexPreloadStatus se re-renderiza ante cambios aunque no haya suscriptores externos", () => {
    function Probe() {
      const status = pokedexPreloadBus.useStatus();
      return <span data-testid="probe">{status}</span>;
    }
    const { rerender } = render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("idle");

    // Cambiamos el estado SIN llamar subscribe() explícitamente.
    // El hook debe enterarse por su subscripción interna.
    act(() => {
      pokedexPreloadBus.reportStatus("ready");
    });
    rerender(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("ready");
  });

  it("cumple el contrato del tipo PokedexPreloadStatus", () => {
    const allStatuses: PokedexPreloadStatus[] = ["idle", "loading", "ready"];
    const listener = (_: PokedexPreloadStatus) => undefined;
    const reporter: PokedexPreloadReporter = pokedexPreloadBus.reportStatus;
    expect(typeof listener).toBe("function");
    expect(typeof reporter).toBe("function");
    expect(allStatuses.length).toBe(3);
    void (
      <div>
        {/* Tipos usados: ReactNode + callbacks */}
        <span>{null as unknown as ReactNode}</span>
      </div>
    );
  });
});
