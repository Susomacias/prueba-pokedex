import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `BOTONES_CARRUSEL` (botones analógicos izquierda /
 * derecha del carrusel).
 */
export function CarouselButtonsSlot({ pokemonName }: SlotStubProps) {
  if (!pokemonName) return null;
  return (
    <div
      {...buildSlotAttrs("buttons", { pokemonName })}
      aria-label="Botones de navegación del carrusel"
    />
  );
}
