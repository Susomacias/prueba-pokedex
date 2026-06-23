"use client";

import { SearchInput } from "@/src/components/filters/SearchInput";
import { ResetFilterButtons } from "@/src/components/filters/ResetFilterButtons";
import { buildSlotAttrs } from "./types";

/**
 * Plan 05.3 + 07.3 + 07.4 — Slot `BUSCAR_RESET_FILTRAR`
 * (buscador + botones reset y filtrar).
 *
 * Siempre visible. Compone `SearchInput` y `ResetFilterButtons`.
 */
export function SearchResetFilterSlot() {
  return (
    <div
      {...buildSlotAttrs("search-reset-filter")}
      aria-label="Buscar, resetear y filtrar"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        padding: "1px 3px",
        boxSizing: "border-box",
      }}
    >
      <SearchInput />
      <ResetFilterButtons />
    </div>
  );
}
