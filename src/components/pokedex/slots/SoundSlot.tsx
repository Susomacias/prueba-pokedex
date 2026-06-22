import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `SONIDO_POKEMON` (botón que reproduce el "cry").
 */
export function SoundSlot({ pokemonName }: SlotStubProps) {
  if (!pokemonName) return null;
  return (
    <button
      type="button"
      {...buildSlotAttrs("sound", { pokemonName })}
      aria-label="Reproducir sonido del pokemon"
    />
  );
}
