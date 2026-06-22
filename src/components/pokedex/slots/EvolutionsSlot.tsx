import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `EVOLUCIONES` (árbol de evoluciones en la pantalla
 * LCD verde).
 */
export function EvolutionsSlot({ pokemonName }: SlotStubProps) {
  if (!pokemonName) return null;
  return (
    <div
      {...buildSlotAttrs("evolutions", { pokemonName })}
      aria-label="Cadena de evoluciones del pokemon"
    />
  );
}
