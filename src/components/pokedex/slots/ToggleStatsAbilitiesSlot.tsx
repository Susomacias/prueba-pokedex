import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `VER_HABILIDADES_VER_STATS` (botón negro tipo
 * "start" que toggle entre stats y habilidades).
 *
 * Sin pokemon devuelve `null`. Con pokemon emite el botón con
 * `data-stub="toggle"` y `data-mode` reflejando el estado actual.
 */
export interface ToggleStatsAbilitiesSlotProps extends SlotStubProps {
  mode: "stats" | "abilities";
}

export function ToggleStatsAbilitiesSlot({
  pokemonName,
  mode,
}: ToggleStatsAbilitiesSlotProps) {
  if (!pokemonName) return null;
  return (
    <button
      type="button"
      {...buildSlotAttrs("toggle", { pokemonName, mode })}
      aria-label={`Mostrando ${mode === "abilities" ? "habilidades" : "stats"}`}
    />
  );
}
