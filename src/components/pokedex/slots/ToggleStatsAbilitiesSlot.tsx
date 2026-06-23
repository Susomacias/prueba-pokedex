"use client";

import { buildSlotAttrs, type SlotStubProps } from "./types";
import { usePokedexPage } from "@/src/components/pokedex/PokedexPageProvider";

export interface ToggleStatsAbilitiesSlotProps extends SlotStubProps {
  mode: "stats" | "abilities";
}

export function ToggleStatsAbilitiesSlot({
  pokemonName,
  mode,
}: ToggleStatsAbilitiesSlotProps) {
  const { setToggleStatsAbilities } = usePokedexPage();

  // Siempre visible, pero inerte si no hay pokemon
  const disabled = !pokemonName;
  const nextMode = mode === "stats" ? "abilities" : "stats";
  const label = mode === "stats" ? "VER HABILIDADES" : "VER STATS";

  return (
    <button
      type="button"
      {...buildSlotAttrs("toggle", { pokemonName, mode })}
      aria-label={
        disabled
          ? "Selecciona un pokémon para ver stats y habilidades"
          : `Mostrando ${mode === "abilities" ? "habilidades" : "stats"}. Pulsa para ver ${mode === "stats" ? "habilidades" : "stats"}`
      }
      onClick={() => {
        if (!disabled) setToggleStatsAbilities(nextMode);
      }}
      disabled={disabled}
      className="toggle-stats-btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a2e",
        border: "2px solid #333355",
        borderRadius: "6px",
        color: disabled ? "#333355" : "#CCCCDD",
        fontFamily: "monospace",
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "1px",
        cursor: disabled ? "default" : "pointer",
        padding: "2px 6px",
        textTransform: "uppercase",
        opacity: disabled ? 0.5 : 1,
        transition: "background-color 0.15s ease, color 0.15s ease, opacity 0.2s ease",
      }}
    >
      {label}
    </button>
  );
}
