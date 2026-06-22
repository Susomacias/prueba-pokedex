import { buildSlotAttrs, type SlotStubProps } from "./types";

/**
 * Plan 05.3 — Slot `STATS` (stats o habilidades en la pantalla LCD
 * verde).
 *
 * Sin pokemon devuelve `null`. El modo (`stats` o `abilities`) se
 * decide en `PokedexShell` y se propaga como `data-mode` y `data-stub`
 * (que cambia entre "stats" y "abilities"). La UI real (barras de
 * stat, lista de habilidades) se completará en Plan 08.
 */
export interface StatsSlotProps extends SlotStubProps {
  /** Modo activo. Por defecto `'stats'`. */
  mode?: "stats" | "abilities";
}

export function StatsSlot({ pokemonName, mode = "stats" }: StatsSlotProps) {
  if (!pokemonName) return null;
  return (
    <div
      {...buildSlotAttrs(mode === "abilities" ? "abilities" : "stats", {
        pokemonName,
        mode,
      })}
      aria-label={
        mode === "abilities" ? "Habilidades del pokemon" : "Stats del pokemon"
      }
    />
  );
}
