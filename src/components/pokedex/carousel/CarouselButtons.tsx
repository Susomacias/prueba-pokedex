"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Plan 06.5 — `CarouselButtons`: botones analógicos izq/der del slot
 * `BOTONES_CARRUSEL`.
 *
 * Estilo arcade (cuadrado redondeado, bisel, sombra, efecto press
 * `active:translate-y-px`). Iconos `ChevronLeft` / `ChevronRight` de
 * lucide-react.
 *
 * En los extremos (clamp) los botones quedan `disabled` — no se
 * puede salir del rango. Si en el futuro se prefiere `wrap`, basta
 * cambiar el flag `canPrev`/`canNext` del caller.
 */

export interface CarouselButtonsProps {
  onPrev(): void;
  onNext(): void;
  /** `false` deshabilita el botón "anterior" (estás en la primera slide). */
  canPrev: boolean;
  /** `false` deshabilita el botón "siguiente" (estás en la última slide). */
  canNext: boolean;
}

export function CarouselButtons({
  onPrev,
  onNext,
  canPrev,
  canNext,
}: CarouselButtonsProps) {
  return (
    <div className="carousel-buttons">
      <button
        type="button"
        data-testid="carousel-prev"
        aria-label="Diapositiva anterior"
        onClick={onPrev}
        disabled={!canPrev}
        className="carousel-button"
      >
        <ChevronLeft aria-hidden="true" className="carousel-button__icon" />
      </button>
      <button
        type="button"
        data-testid="carousel-next"
        aria-label="Diapositiva siguiente"
        onClick={onNext}
        disabled={!canNext}
        className="carousel-button"
      >
        <ChevronRight aria-hidden="true" className="carousel-button__icon" />
      </button>
    </div>
  );
}