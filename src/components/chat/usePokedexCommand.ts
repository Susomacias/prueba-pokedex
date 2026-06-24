"use client";

import { useEffect } from "react";
import { useOakChat } from "./OakChatContext";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import { useAppShell } from "@/src/components/app/ViewContext";
import { FILTERS, type FilterKey, type FilterValue } from "@/src/lib/filters/types";

const VALID_FILTER_KEYS = new Set<string>(FILTERS.map((f) => f.key));

/**
 * Plan 11.4a — Hook `usePokedexCommand`.
 *
 * Escucha `pendingCommand` del `OakChatContext` y traduce los comandos
 * de IA (`apply_filters`, `show_pokemon`) en mutaciones reales del
 * estado de la Pokédex.
 *
 * - `apply_filters`: llama a `useFiltersContext().setFilter()` para
 *   cada clave del payload. Solo acepta claves definidas en `FILTERS`
 *   e ignora valores `null` o `undefined`.
 * - `show_pokemon`: llama a `useAppShell().goToPokemon(name)`.
 *
 * Al terminar, llama a `dismissCommand()` para consumir el comando.
 */
export function usePokedexCommand() {
  const { pendingCommand, dismissCommand, setExternalCommand } = useOakChat();
  const { setFilter } = useFiltersContext();
  const { goToPokedex, goToPokemon } = useAppShell();

  useEffect(() => {
    if (!pendingCommand) return;

    try {
      if (pendingCommand.action === "apply_filters") {
        const filters = pendingCommand.payload;

        goToPokedex();

        const parts: string[] = [];
        for (const [key, value] of Object.entries(filters)) {
          if (!VALID_FILTER_KEYS.has(key)) continue;
          if (value === undefined || value === null) continue;
          setFilter(key as FilterKey, value as FilterValue<FilterKey>);
          parts.push(`${key} ${value}`);
        }

        if (parts.length > 0) {
          setExternalCommand(parts.join("  "));
        }
      } else if (pendingCommand.action === "show_pokemon") {
        const name = pendingCommand.payload.name;
        if (name && typeof name === "string" && name.trim() !== "") {
          goToPokemon(name.trim());
        }
      }
    } finally {
      dismissCommand();
    }
  }, [pendingCommand, dismissCommand, setFilter, goToPokedex, goToPokemon, setExternalCommand]);
}
