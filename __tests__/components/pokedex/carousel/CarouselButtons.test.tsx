import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CarouselButtons } from "@/src/components/pokedex/carousel/CarouselButtons";

/**
 * Plan 06.5 — TDD de los botones analógicos izq/der del carrusel.
 *
 * Cobertura:
 *  - Click der llama `onNext`.
 *  - Click izq llama `onPrev`.
 *  - En los extremos (clamp), el botón está disabled.
 *  - Estilo arcade (clases CSS que aplican bisel, presionado).
 *  - aria-labels descriptivos.
 */

describe("CarouselButtons (Plan 06.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza dos botones (prev + next) con aria-labels descriptivos", () => {
    render(
      <CarouselButtons
        onPrev={() => undefined}
        onNext={() => undefined}
        canPrev={true}
        canNext={true}
      />,
    );
    expect(screen.getByTestId("carousel-prev")).toBeInTheDocument();
    expect(screen.getByTestId("carousel-next")).toBeInTheDocument();
    expect(screen.getByTestId("carousel-prev").getAttribute("aria-label")).toBe(
      "Diapositiva anterior",
    );
    expect(screen.getByTestId("carousel-next").getAttribute("aria-label")).toBe(
      "Diapositiva siguiente",
    );
  });

  it("click en next invoca onNext", () => {
    const onNext = vi.fn();
    render(
      <CarouselButtons
        onPrev={() => undefined}
        onNext={onNext}
        canPrev={true}
        canNext={true}
      />,
    );
    fireEvent.click(screen.getByTestId("carousel-next"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("click en prev invoca onPrev", () => {
    const onPrev = vi.fn();
    render(
      <CarouselButtons
        onPrev={onPrev}
        onNext={() => undefined}
        canPrev={true}
        canNext={true}
      />,
    );
    fireEvent.click(screen.getByTestId("carousel-prev"));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("prev está disabled cuando canPrev=false (estamos en la primera slide)", () => {
    render(
      <CarouselButtons
        onPrev={() => undefined}
        onNext={() => undefined}
        canPrev={false}
        canNext={true}
      />,
    );
    expect(screen.getByTestId("carousel-prev")).toBeDisabled();
  });

  it("next está disabled cuando canNext=false (estamos en la última slide)", () => {
    render(
      <CarouselButtons
        onPrev={() => undefined}
        onNext={() => undefined}
        canPrev={true}
        canNext={false}
      />,
    );
    expect(screen.getByTestId("carousel-next")).toBeDisabled();
  });

  it("cuando un botón está disabled, su handler NO se invoca", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <CarouselButtons
        onPrev={onPrev}
        onNext={onNext}
        canPrev={false}
        canNext={false}
      />,
    );
    fireEvent.click(screen.getByTestId("carousel-prev"));
    fireEvent.click(screen.getByTestId("carousel-next"));
    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("los botones son <button> accesibles (no <div> con role)", () => {
    render(
      <CarouselButtons
        onPrev={() => undefined}
        onNext={() => undefined}
        canPrev={true}
        canNext={true}
      />,
    );
    expect(screen.getByTestId("carousel-prev").tagName).toBe("BUTTON");
    expect(screen.getByTestId("carousel-next").tagName).toBe("BUTTON");
  });

  it("los botones tienen estilo arcade (clase 'carousel-button')", () => {
    render(
      <CarouselButtons
        onPrev={() => undefined}
        onNext={() => undefined}
        canPrev={true}
        canNext={true}
      />,
    );
    expect(screen.getByTestId("carousel-prev").className).toContain("carousel-button");
    expect(screen.getByTestId("carousel-next").className).toContain("carousel-button");
  });
});