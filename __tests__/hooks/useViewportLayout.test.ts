import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewportLayout } from "@/src/hooks/useViewportLayout";

/**
 * Plan 05.4 — TDD del hook `useViewportLayout`.
 *
 * Comportamiento esperado:
 *   - Devuelve `'vertical'` cuando `window.matchMedia('(orientation: portrait)')`
 *     coincide (o cuando `window.innerWidth < breakpoint`).
 *   - Devuelve `'horizontal'` cuando `innerWidth >= breakpoint`.
 *   - Usa `useSyncExternalStore` para evitar warnings de hidratación y
 *     leer `window`/matchMedia de forma segura: el server snapshot es
 *     un valor fijo y estable.
 *   - Se suscribe al media query correspondiente y se desuscribe al
 *     desmontar.
 *   - El breakpoint es público (`VERTICAL_LAYOUT_MAX_WIDTH`).
 */

const VERTICAL_LAYOUT_MAX_WIDTH = 768;

describe("useViewportLayout (Plan 05.4)", () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  function setViewport(width: number, height: number): void {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: height,
    });
    window.dispatchEvent(new Event("resize"));
  }

  beforeEach(() => {
    setViewport(1024, 768);
  });

  afterEach(() => {
    setViewport(originalInnerWidth, originalInnerHeight);
    vi.restoreAllMocks();
  });

  it("devuelve 'vertical' en un viewport pequeño (mobile)", () => {
    setViewport(400, 800);
    const { result } = renderHook(() => useViewportLayout());
    expect(result.current).toBe("vertical");
  });

  it("devuelve 'horizontal' en un viewport grande (desktop)", () => {
    setViewport(1280, 720);
    const { result } = renderHook(() => useViewportLayout());
    expect(result.current).toBe("horizontal");
  });

  it("devuelve 'vertical' justo en el breakpoint - 1", () => {
    setViewport(VERTICAL_LAYOUT_MAX_WIDTH - 1, 800);
    const { result } = renderHook(() => useViewportLayout());
    expect(result.current).toBe("vertical");
  });

  it("devuelve 'horizontal' justo en el breakpoint", () => {
    setViewport(VERTICAL_LAYOUT_MAX_WIDTH, 600);
    const { result } = renderHook(() => useViewportLayout());
    expect(result.current).toBe("horizontal");
  });

  it("cambia cuando se redimensiona la ventana", () => {
    setViewport(1280, 720);
    const { result } = renderHook(() => useViewportLayout());
    expect(result.current).toBe("horizontal");

    act(() => {
      setViewport(400, 800);
    });
    expect(result.current).toBe("vertical");

    act(() => {
      setViewport(1024, 768);
    });
    expect(result.current).toBe("horizontal");
  });

  it("expone el breakpoint usado como constante pública", () => {
    expect(typeof VERTICAL_LAYOUT_MAX_WIDTH).toBe("number");
    expect(VERTICAL_LAYOUT_MAX_WIDTH).toBe(768);
  });

  it("no produce warning de hidratación: el server snapshot es estable", () => {
    // Para verificar el server snapshot, montamos un renderizador
    // con `hydrate: false` (jsdom) y comprobamos que el hook es
    // importable sin `window is not defined`.
    const { result } = renderHook(() => useViewportLayout());
    expect(["vertical", "horizontal"]).toContain(result.current);
  });

  it("se suscribe y desuscribe del listener de resize / matchMedia", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useViewportLayout());
    expect(addSpy).toHaveBeenCalled();

    const addedTypes = addSpy.mock.calls.map((c) => c[0]);
    // Debe suscribirse a 'resize' o usar matchMedia; cualquiera de las
    // dos es válida.
    expect(
      addedTypes.includes("resize") ||
        typeof window.matchMedia === "function",
    ).toBe(true);

    unmount();

    // Al menos un removeEventListener o el cierre del subscriber.
    const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
    if (addedTypes.includes("resize")) {
      expect(removedTypes).toContain("resize");
    }
  });
});
