"use client";

import { useContext } from "react";
import { buildSlotAttrs } from "./types";
import { FilterConsole } from "@/src/components/pokedex/console/FilterConsole";
import { useActiveFiltersCount } from "@/src/components/filters/FiltersProvider";
import { OakChatContext } from "@/src/components/chat/OakChatContext";

/**
 * Plan 05.3 / 07.1 — Slot `CONSOLA_FILTROS`.
 *
 * Renderiza la consola de terminal (`FilterConsole`) que acepta
 * comandos para filtrar la lista de pokemons. El flag `active` del
 * stub se deriva ahora del número de filtros activos del estado
 * unificado (`useActiveFiltersCount`), de modo que cualquier
 * mutación —consola, dropdowns o buscador— se refleja aquí. El
 * prop `active` heredado de `PokedexShell` se mantiene como fallback
 * por compatibilidad con los tests existentes del shell.
 *
 * Plan 11.4b — Pasa `externalCommand` desde `OakChatContext` a
 * `FilterConsole` para el efecto typewriter cuando la IA aplica
 * filtros. Usa acceso seguro (sin lanzar) porque el slot puede
 * montarse sin `OakChatProvider` en tests.
 */
export function FilterConsoleSlot({
  active,
}: {
  active?: boolean;
}) {
  const count = useActiveFiltersCount();
  const isActive = active ?? count > 0;
  const chatCtx = useContext(OakChatContext);
  const externalCommand = chatCtx?.externalCommand ?? null;
  return (
    <div {...buildSlotAttrs("filter-console", { active: isActive })}>
      <FilterConsole externalCommand={externalCommand ?? undefined} />
    </div>
  );
}
