import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `PUNTOS_CARRUSEL` (LEDs del carrusel).
 *
 * Stub: sin pokemon devuelve `null`. Con pokemon emite
 * `data-stub="dots"`.
 */
export function CarouselDotsSlot({ pokemonName }: SlotStubProps) {
  if (!pokemonName) return null;
  return (
    <div
      {...buildSlotAttrs("dots", { pokemonName })}
      aria-label="Indicador de posición del carrusel"
    />
  );
}
