"use client";

import { buildSlotAttrs, type SlotStubProps } from "./types";
import { useCarousel } from "../carousel/CarouselController";
import { CarouselDots } from "../carousel/CarouselDots";

/**
 * Plan 06.4 — Slot `PUNTOS_CARRUSEL` (LEDs del carrusel).
 *
 * Consume el estado compartido del `CarouselController`. Si no hay
 * pokemon seleccionado o el detalle aún no ha cargado, el slot
 * queda oculto.
 */
export function CarouselDotsSlot({ pokemonName }: SlotStubProps) {
  const { totalSlides, activeIndex, goTo } = useCarouselSafe();
  if (!pokemonName) return null;
  if (totalSlides === 0) return null;
  return (
    <div
      {...buildSlotAttrs("dots", { pokemonName })}
      aria-label="Indicador de posición del carrusel"
    >
      <CarouselDots
        count={totalSlides}
        activeIndex={activeIndex}
        onSelect={goTo}
      />
    </div>
  );
}

/**
 * Variante segura de `useCarousel` que devuelve un estado neutro si
 * el provider aún no está montado (no debe ocurrir en producción,
 * pero evita que la UI se rompa durante tests o estados
 * intermedios).
 */
function useCarouselSafe() {
  try {
    return useCarousel();
  } catch {
    return NEUTRAL_STATE;
  }
}

const NEUTRAL_STATE = {
  detail: null,
  error: null,
  activeIndex: 0,
  totalSlides: 0,
  canPrev: false,
  canNext: false,
  goTo: () => undefined,
  goNext: () => undefined,
  goPrev: () => undefined,
};