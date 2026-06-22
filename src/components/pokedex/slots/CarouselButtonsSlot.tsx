"use client";

import { buildSlotAttrs, type SlotStubProps } from "./types";
import { useCarousel } from "../carousel/CarouselController";
import { CarouselButtons } from "../carousel/CarouselButtons";

/**
 * Plan 06.5 — Slot `BOTONES_CARRUSEL` (botones analógicos izq/der).
 *
 * Consume el estado compartido del `CarouselController`. Los
 * botones quedan deshabilitados en los extremos (clamp).
 */
export function CarouselButtonsSlot({ pokemonName }: SlotStubProps) {
  const { canPrev, canNext, goPrev, goNext } = useCarouselSafe();
  if (!pokemonName) return null;
  return (
    <div
      {...buildSlotAttrs("buttons", { pokemonName })}
      aria-label="Botones de navegación del carrusel"
    >
      <CarouselButtons
        onPrev={goPrev}
        onNext={goNext}
        canPrev={canPrev}
        canNext={canNext}
      />
    </div>
  );
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

function useCarouselSafe() {
  try {
    return useCarousel();
  } catch {
    return NEUTRAL_STATE;
  }
}