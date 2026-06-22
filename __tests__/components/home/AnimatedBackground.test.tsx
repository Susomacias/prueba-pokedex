import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnimatedBackground } from "@/src/components/home/AnimatedBackground";

describe("AnimatedBackground", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza con la imagen de fondo del tile del mosaico", () => {
    const { container } = render(<AnimatedBackground />);
    const layer = container.querySelector(
      '[data-testid="animated-background-tile"]',
    ) as HTMLElement | null;
    expect(layer).not.toBeNull();
    const style = (layer as HTMLElement).style;
    expect(style.backgroundImage).toContain("/pagina_inicio/tileFondo.png");
    expect(style.backgroundRepeat).toBe("repeat");
  });

  it("cubre toda la pantalla y no permite scroll (fixed, inset-0, overflow-hidden)", () => {
    const { container } = render(<AnimatedBackground />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("fixed");
    expect(root).toHaveClass("inset-0");
    expect(root).toHaveClass("overflow-hidden");
  });

  it("aplica la clase que desactiva la animación cuando prefers-reduced-motion es reduce", () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );

    const { container } = render(<AnimatedBackground />);
    const animatedLayer = container.querySelector(
      '[data-testid="animated-background-tile"]',
    ) as HTMLElement | null;
    expect(animatedLayer).not.toBeNull();
    expect((animatedLayer as HTMLElement).style.animation).toContain("none");
  });

  it("marca el fondo como decorativo (aria-hidden) para no contaminar la accesibilidad", () => {
    const { container } = render(<AnimatedBackground />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    // Comprueba que ningún nodo interno tiene texto accesible
    expect(screen.queryByRole("img", { name: /fondo/i })).toBeNull();
  });
});