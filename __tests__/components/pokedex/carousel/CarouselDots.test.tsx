import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CarouselDots } from "@/src/components/pokedex/carousel/CarouselDots";

/**
 * Plan 06.4 — TDD de los LEDs del carrusel.
 *
 * Cobertura:
 *  - Un LED por diapositiva.
 *  - El LED activo tiene la clase/estado de encendido.
 *  - Cambiar de diapositiva actualiza el LED activo.
 *  - Click en un LED navega a esa diapositiva (vía `onSelect`).
 *  - Cada LED es accesible (`aria-label="Diapositiva N"`).
 */

describe("CarouselDots (Plan 06.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza un LED por cada slide (length = count)", () => {
    render(<CarouselDots count={5} activeIndex={0} onSelect={() => undefined} />);
    expect(screen.getAllByTestId("carousel-dot")).toHaveLength(5);
  });

  it("marca como activo el LED del activeIndex (data-active='true')", () => {
    render(<CarouselDots count={5} activeIndex={2} onSelect={() => undefined} />);
    const dots = screen.getAllByTestId("carousel-dot");
    expect(dots[2]!.getAttribute("data-active")).toBe("true");
    expect(dots[0]!.getAttribute("data-active")).toBe("false");
    expect(dots[4]!.getAttribute("data-active")).toBe("false");
  });

  it("re-renderiza con activeIndex actualizado", () => {
    const { rerender } = render(
      <CarouselDots count={3} activeIndex={0} onSelect={() => undefined} />,
    );
    expect(screen.getAllByTestId("carousel-dot")[0]!.getAttribute("data-active")).toBe(
      "true",
    );
    rerender(<CarouselDots count={3} activeIndex={2} onSelect={() => undefined} />);
    expect(screen.getAllByTestId("carousel-dot")[2]!.getAttribute("data-active")).toBe(
      "true",
    );
    expect(screen.getAllByTestId("carousel-dot")[0]!.getAttribute("data-active")).toBe(
      "false",
    );
  });

  it("click en un LED llama a onSelect con su índice", () => {
    const onSelect = vi.fn();
    render(<CarouselDots count={4} activeIndex={0} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByTestId("carousel-dot")[2]!);
    expect(onSelect).toHaveBeenCalledWith(2);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("cada LED tiene aria-label descriptivo 'Diapositiva N'", () => {
    render(<CarouselDots count={3} activeIndex={0} onSelect={() => undefined} />);
    const dots = screen.getAllByTestId("carousel-dot");
    expect(dots[0]!.getAttribute("aria-label")).toBe("Diapositiva 1");
    expect(dots[1]!.getAttribute("aria-label")).toBe("Diapositiva 2");
    expect(dots[2]!.getAttribute("aria-label")).toBe("Diapositiva 3");
  });

  it("los LEDs son accesibles (button por defecto)", () => {
    render(<CarouselDots count={3} activeIndex={0} onSelect={() => undefined} />);
    const dots = screen.getAllByTestId("carousel-dot");
    for (const dot of dots) {
      expect(dot.tagName).toBe("BUTTON");
    }
  });

  it("con count=0 no renderiza nada", () => {
    const { container } = render(
      <CarouselDots count={0} activeIndex={0} onSelect={() => undefined} />,
    );
    expect(screen.queryAllByTestId("carousel-dot")).toHaveLength(0);
    expect(container.firstChild).toBeNull();
  });
});