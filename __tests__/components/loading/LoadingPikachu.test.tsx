import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LoadingPikachu } from "@/src/components/loading/LoadingPikachu";

/**
 * Plan 06.7 — TDD del `LoadingPikachu` (animación del pikachu
 * gif moviéndose de izquierda a derecha mientras hay carga).
 *
 * Cobertura:
 *  - Cuando `loading=true` se monta el componente y arranca la
 *    animación (data-state="run").
 *  - Usa el gif público `/loading-pikachu.gif` en un `<img>` (no
 *    `next/image`, que rompería la animación nativa del GIF).
 *  - Es DISCRETO: el contenedor raíz es pequeño (≤ 40px en cada
 *    dimensión). El tamaño se aplica vía inline style para que
 *    sea independiente de cualquier CSS global y los tests no
 *    necesiten cargar el stylesheet.
 *  - Al disparar `animationend` con `loading=true` se reinicia
 *    el ciclo (el `<img>` recibe el evento y vuelve a empezar).
 *  - Al disparar `animationend` con `loading=false` (carga
 *    terminada durante la animación) se DESMONTA: la animación
 *    SIEMPRE termina con el pikachu fuera de pantalla.
 *  - Si se dispara loading=true mientras la animación está en
 *    curso, NO se reinicia el ciclo en marcha (el flag
 *    `isAnimatingRef` lo impide).
 *  - Al cambiar `loading` de `true→false` durante la animación,
 *    el componente se desmonta al terminar el ciclo (no se
 *    corta a mitad).
 *  - El listener de `animationend` se monta y desmonta de
 *    forma coherente (sin leaks).
 *
 * Notas:
 *  - En jsdom las animaciones CSS no se ejecutan, así que
 *    disparamos `animationend` manualmente sobre el `<img>`.
 *  - La duración de la animación se controla con la variable
 *    CSS `--loading-pikachu-duration` (1500ms por defecto).
 */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LoadingPikachu (Plan 06.7)", () => {
  it("no se monta cuando loading=false", () => {
    const { container } = render(<LoadingPikachu loading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("se monta con data-state='run' cuando loading=true", () => {
    render(<LoadingPikachu loading={true} />);
    const root = screen.getByTestId("loading-pikachu");
    expect(root.getAttribute("data-state")).toBe("run");
    expect(root.getAttribute("data-loading")).toBe("true");
  });

  it("usa el gif público /loading-pikachu.gif en un <img>", () => {
    render(<LoadingPikachu loading={true} />);
    const img = screen.getByTestId("loading-pikachu").querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("/loading-pikachu.gif");
    expect(img!.getAttribute("alt")).toMatch(/cargando/i);
  });

  it("es discreto: el contenedor raíz es pequeño (≤ 40px)", () => {
    render(<LoadingPikachu loading={true} />);
    const root = screen.getByTestId("loading-pikachu");
    const rootStyle = (root as HTMLElement).style;
    const widthPx = Number.parseInt(rootStyle.width || "0", 10);
    const heightPx = Number.parseInt(rootStyle.height || "0", 10);
    expect(widthPx).toBeGreaterThan(0);
    expect(widthPx).toBeLessThanOrEqual(40);
    expect(heightPx).toBeGreaterThan(0);
    expect(heightPx).toBeLessThanOrEqual(40);
  });

  it("el <img> interior tiene dimensiones fijas (no se estira con translateX)", () => {
    render(<LoadingPikachu loading={true} />);
    const img = screen.getByTestId("loading-pikachu").querySelector(
      "img",
    ) as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.getAttribute("width")).toBe("28");
    expect(img!.getAttribute("height")).toBe("28");
  });

  it("al disparar animationend con loading=true, el componente sigue montado y la animación se reinicia", () => {
    render(<LoadingPikachu loading={true} />);
    const root = screen.getByTestId("loading-pikachu");
    const img = root.querySelector("img")!;
    const firstImg = img;

    expect(root.getAttribute("data-state")).toBe("run");

    // Disparamos animationend manualmente. Como `loading` sigue
    // true, el componente debe REINICIAR la animación. El estado
    // sigue siendo "run" (la animación nunca se detiene visiblemente).
    act(() => {
      img.dispatchEvent(new Event("animationend"));
    });

    expect(screen.queryByTestId("loading-pikachu")).not.toBeNull();
    // Tras el reinicio, el componente sigue montado.
    expect(screen.getByTestId("loading-pikachu").getAttribute("data-state")).toBe(
      "run",
    );

    // El <img> sigue siendo el mismo (no se ha desmontado).
    const afterImg = screen
      .getByTestId("loading-pikachu")
      .querySelector("img");
    expect(afterImg).toBe(firstImg);
  });

  it("al cambiar loading de true→false durante la animación, el componente se desmonta tras animationend", () => {
    const { rerender, container } = render(<LoadingPikachu loading={true} />);
    const root = screen.getByTestId("loading-pikachu");
    expect(root.getAttribute("data-state")).toBe("run");

    // La carga termina durante la animación. El componente NO se
    // desmonta al instante: espera al animationend para que el
    // pikachu salga de pantalla de forma natural.
    act(() => {
      rerender(<LoadingPikachu loading={false} />);
    });
    expect(screen.queryByTestId("loading-pikachu")).not.toBeNull();

    // Disparamos animationend manualmente: como `pendingUnmountRef`
    // se marcó en el effect anterior, el handler desmonta el
    // componente.
    const img = root.querySelector("img")!;
    act(() => {
      img.dispatchEvent(new Event("animationend"));
    });
    expect(container.firstChild).toBeNull();
  });

  it("si se dispara loading=true mientras la animación está en curso, NO se reinicia el ciclo en marcha", () => {
    const { rerender } = render(<LoadingPikachu loading={true} />);
    const root = screen.getByTestId("loading-pikachu");
    expect(root.getAttribute("data-state")).toBe("run");
    const firstImg = root.querySelector("img")!;

    // Mientras la animación está en curso, subimos loading=true
    // otra vez (escenario: el usuario cambia filtros muy rápido y
    // se disparan varias cargas). El flag `isAnimatingRef` impide
    // que se programe un reinicio redundante.
    rerender(<LoadingPikachu loading={true} />);
    expect(root.getAttribute("data-state")).toBe("run");
    const secondImg = root.querySelector("img")!;
    // Misma referencia: NO se ha desmontado ni remontado.
    expect(secondImg).toBe(firstImg);

    // Tras animationend, el ciclo reinicia normalmente.
    act(() => {
      secondImg.dispatchEvent(new Event("animationend"));
    });
    expect(screen.queryByTestId("loading-pikachu")).not.toBeNull();
  });

  it("al desmontar, el listener de animationend se elimina (sin leak)", () => {
    const removeSpy = vi.spyOn(
      HTMLImageElement.prototype,
      "removeEventListener",
    );
    const { unmount } = render(<LoadingPikachu loading={true} />);
    unmount();
    const removed = removeSpy.mock.calls.some(
      (args) => args[0] === "animationend",
    );
    expect(removed).toBe(true);
    removeSpy.mockRestore();
  });

  it("tiene role='status' y aria-live='polite' (accesibilidad)", () => {
    render(<LoadingPikachu loading={true} />);
    const root = screen.getByTestId("loading-pikachu");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-live")).toBe("polite");
    expect(root.getAttribute("aria-label")).toMatch(/cargando/i);
  });
});
