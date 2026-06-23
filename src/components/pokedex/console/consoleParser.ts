import type { FilterKey } from "@/src/lib/filters/types";
import type { FilterOptionKey } from "@/src/components/filters/useFilterOptions";
import { FILTERS } from "@/src/lib/filters/types";

/**
 * Parser de la consola de filtros (Plan 07.1).
 *
 * Es un módulo **puro** (sin React, sin side-effects) para poder
 * testear toda la gramática de comandos de forma aislada. La UI
 * (`FilterConsole`) se limita a llamar `parseCommand(input)` y a
 * ejecutar el comando devuelto contra `useFilters` / `useFilterOptions`.
 *
 * Gramática soportada:
 *  - `help` / `ayuda` / `?`                 → lista de comandos y filtros.
 *  - `filtro` / `filtros`                   → lista todos los filtros.
 *  - `options <filtro>` / `opciones`        → opciones del filtro (async).
 *  - `<filtro> <valor>`                     → aplica un filtro.
 *  - `resumen` / `summary`                  → filtros aplicados.
 *  - `quitar <filtro>` / `remove`           → elimina un filtro.
 *  - `limpiar`                              → limpia la pantalla.
 *  - `clear`                                → quita TODOS los filtros.
 *  - `<texto>`                              → búsqueda libre (multi-palabra,
 *                                             insensible a mayúsculas,
 *                                             acentos y signos).
 *  - `` (entrada vacía)                     → noop.
 *
 * Errores amables: si el primer token parece un comando pero sus
 * argumentos no encajan (filtro inexistente, falta valor, etc.) se
 * devuelve `{ kind: "unknown" }` con un mensaje que sugiere `help`.
 * Cualquier otro texto se interpreta como búsqueda.
 */

/* ------------------------------------------------------------------------- *
 * Alias de comandos y filtros
 * ------------------------------------------------------------------------- */

/** Normaliza un alias: minúsculas + sin acentos + colapsar espacios. */
function normalizeAlias(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tabla de alias de comando → tipo de comando canónico.
 * El primer elemento de cada array es la forma "canónica" que se
 * muestra en el help.
 */
export const COMMAND_ALIASES = {
  help: ["help", "ayuda", "?"],
  filters: ["filtro", "filtros", "filters"],
  options: ["options", "opciones"],
  summary: ["resumen", "summary", "estado"],
  remove: ["quitar", "remove", "rm"],
  clearScreen: ["limpiar", "cls"],
  clearFilters: ["clear", "reset-filtros"],
} as const;

export type CommandKind = keyof typeof COMMAND_ALIASES;

/**
 * Tabla de alias de filtro → `FilterKey` canónico.
 * Las claves internas (`type1`, `generation`, ...) son los valores
 * que `useFilters.setFilter` espera; los alias en español son
 * comodidad para el usuario.
 */
export const FILTER_KEY_ALIASES: Readonly<Record<string, FilterKey>> = {
  // type1
  type1: "type1",
  tipo1: "type1",
  "tipo 1": "type1",
  t1: "type1",
  // type2
  type2: "type2",
  tipo2: "type2",
  "tipo 2": "type2",
  t2: "type2",
  // generation
  generation: "generation",
  generacion: "generation",
  gen: "generation",
  // color
  color: "color",
  // habitat
  habitat: "habitat",
  // ability
  ability: "ability",
  habilidad: "ability",
  // height
  height: "height",
  altura: "height",
  // weight
  weight: "weight",
  peso: "weight",
  // search
  search: "search",
  buscar: "search",
  busqueda: "search",
};

/**
 * Resuelve un alias (normalizado) a su `FilterKey` canónico.
 * Devuelve `undefined` si no encaja con ningún filtro.
 */
export function resolveFilterKey(alias: string): FilterKey | undefined {
  return FILTER_KEY_ALIASES[normalizeAlias(alias)];
}

/**
 * Etiqueta legible (en español) de un `FilterKey`, tomada de la
 * definición canónica en `FILTERS`. Sirve para componer mensajes.
 */
export function filterKeyLabel(key: FilterKey): string {
  const def = FILTERS.find((f) => f.key === key);
  return def?.label ?? key;
}

/**
 * Mapea un `FilterKey` al `FilterOptionKey` que usa `useFilterOptions`.
 * - `type1` y `type2` comparten las mismas opciones (`"type"`).
 * - `search` no tiene opciones predefinidas → devuelve `undefined`.
 */
export function filterKeyToOptionKey(
  key: FilterKey,
): FilterOptionKey | undefined {
  switch (key) {
    case "type1":
    case "type2":
      return "type";
    case "generation":
    case "color":
    case "habitat":
    case "ability":
    case "height":
    case "weight":
      return key;
    case "search":
      return undefined;
  }
}

/* ------------------------------------------------------------------------- *
 * Tipo de comando devuelto por el parser
 * ------------------------------------------------------------------------- */

export type ConsoleCommand =
  | { kind: "help" }
  | { kind: "filters" }
  | { kind: "options"; filterKey: FilterKey }
  | { kind: "apply"; filterKey: FilterKey; rawValue: string }
  | { kind: "summary" }
  | { kind: "remove"; filterKey: FilterKey }
  | { kind: "clearScreen" }
  | { kind: "clearFilters" }
  | { kind: "search"; term: string }
  | { kind: "noop" }
  | { kind: "unknown"; raw: string; message: string };

/* ------------------------------------------------------------------------- *
 * Helpers internos
 * ------------------------------------------------------------------------- */

function makeUnknown(raw: string, message: string): ConsoleCommand {
  return { kind: "unknown", raw, message };
}

function resolveCommandKind(
  token: string,
): CommandKind | undefined {
  for (const key of Object.keys(COMMAND_ALIASES) as CommandKind[]) {
    if ((COMMAND_ALIASES[key] as readonly string[]).includes(token)) {
      return key;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------------- *
 * Parser público
 * ------------------------------------------------------------------------- */

/**
 * Parsea una línea de entrada de la consola en un `ConsoleCommand`.
 *
 * El parser NO valida si un valor concreto existe en las opciones del
 * filtro (eso requiere carga asíncrona y lo hace el ejecutor con
 * `useFilterOptions`). Sólo valida la **estructura** del comando.
 */
export function parseCommand(input: string): ConsoleCommand {
  const raw = input ?? "";
  const trimmed = raw.trim();
  if (trimmed === "") return { kind: "noop" };

  const parts = trimmed.split(/\s+/);
  const head = parts[0] ?? "";
  const headNorm = normalizeAlias(head);
  const tail = parts.slice(1).join(" ").trim();

  // 1) ¿Es un comando?
  const cmdKind = resolveCommandKind(headNorm);
  if (cmdKind) {
    return parseCommandWithArgs(cmdKind, tail, raw);
  }

  // 2) ¿Es un filtro (apply)?
  const filterKey = resolveFilterKey(head);
  if (filterKey) {
    if (tail === "") {
      return makeUnknown(
        raw,
        `Indica un valor para ${filterKeyLabel(filterKey)}: ` +
          `\`${head} <valor>\`. Escribe \`help\` o \`options ${head}\` ` +
          `para ver los valores disponibles.`,
      );
    }
    if (filterKey === "search") {
      return { kind: "search", term: tail };
    }
    return { kind: "apply", filterKey, rawValue: tail };
  }

  // 3) Si no es comando ni filtro, es texto libre → búsqueda.
  return { kind: "search", term: trimmed };
}

function parseCommandWithArgs(
  kind: CommandKind,
  tail: string,
  raw: string,
): ConsoleCommand {
  switch (kind) {
    case "help":
      return { kind: "help" };
    case "filters":
      return { kind: "filters" };
    case "summary":
      return { kind: "summary" };
    case "clearScreen":
      return { kind: "clearScreen" };
    case "clearFilters":
      return { kind: "clearFilters" };
    case "options": {
      if (tail === "") {
        return makeUnknown(
          raw,
          "Indica un filtro: `options <filtro>`. " +
            "Escribe `help` para ver la lista de filtros.",
        );
      }
      const filterKey = resolveFilterKey(tail);
      if (!filterKey) {
        return makeUnknown(
          raw,
          `No reconozco el filtro \`${tail}\`. ` +
            "Escribe `help` para ver los filtros disponibles.",
        );
      }
      if (filterKeyToOptionKey(filterKey) === undefined) {
        return makeUnknown(
          raw,
          `La búsqueda no tiene opciones predefinidas. ` +
            "Escribe directamente el texto: `<palabra>`.",
        );
      }
      return { kind: "options", filterKey };
    }
    case "remove": {
      if (tail === "") {
        return makeUnknown(
          raw,
          "Indica un filtro: `quitar <filtro>`. " +
            "Escribe `help` para ver la lista de filtros.",
        );
      }
      const filterKey = resolveFilterKey(tail);
      if (!filterKey) {
        return makeUnknown(
          raw,
          `No reconozco el filtro \`${tail}\`. ` +
            "Escribe `help` para ver los filtros disponibles.",
        );
      }
      return { kind: "remove", filterKey };
    }
  }
}
