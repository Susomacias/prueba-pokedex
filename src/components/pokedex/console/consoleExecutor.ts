import { POKEMON_TYPE_LABELS, TYPE_LABEL_TO_VALUE, normalizeFilterString } from "@/src/lib/constants/pokemonTypes";
import { HABITAT_REVERSE_ALIAS } from "@/src/lib/graphql/where";
import type { FilterBucket, FilterOption } from "@/src/lib/types/pokemon";
import {
  FILTERS,
  type FilterKey,
  type FilterValue,
} from "@/src/lib/filters/types";
import { filterKeyLabel } from "./consoleParser";

/**
 * Ejecutor de comandos de la consola (Plan 07.1).
 *
 * A diferencia del parser (que sólo valida estructura), el ejecutor
 * resuelve el **valor** crudo escrito por el usuario contra las
 * opciones reales del filtro y devuelve el valor canónico que
 * `useFilters.setFilter` espera, o un error amable si no encaja.
 *
 * Es un módulo puro (sin React): recibe las opciones ya cargadas y
 * devuelve un resultado. Así se puede testear con fixtures reales de
 * PokeAPI sin montar el componente.
 */

/** Opciones disponibles para un filtro (`undefined` = aún cargando). */
export type OptionsForFilter =
  | ReadonlyArray<FilterOption | FilterBucket>
  | undefined;

export type ResolveResult =
  | { ok: true; value: FilterValue<FilterKey>; label: string }
  | { ok: false; error: string };

/** Normaliza un alias para comparar (minúsculas, sin acentos). */
const norm = normalizeFilterString;

/**
 * Alias en español → habitat interno. El usuario puede escribir
 * `habitat bosque` o `habitat forest`; ambos resuelven a `"bosque"`.
 */
const HABITAT_ALIAS_TO_INTERNAL: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const internal of Object.keys(HABITAT_REVERSE_ALIAS)) {
    map.set(norm(internal), internal);
  }
  for (const [internal, english] of Object.entries(HABITAT_REVERSE_ALIAS)) {
    map.set(norm(english), internal);
  }
  return map;
})();

/* ------------------------------------------------------------------------- *
 * Resolución pública
 * ------------------------------------------------------------------------- */

/**
 * Resuelve el valor crudo de un `apply <filtro> <valor>` al valor
 * canónico que entiende `useFilters.setFilter`.
 *
 * Estrategia por filtro:
 *  - `type1`/`type2`: resolución síncrona vía `POKEMON_TYPE_LABELS`
 *    (acepta el valor interno `fire` o la etiqueta `Fuego`).
 *  - `habitat`: alias español/inglés → interno (`forest` → `bosque`).
 *  - `generation`/`color`/`ability`: requiere opciones cargadas;
 *    acepta `value` o `label`.
 *  - `height`/`weight`: acepta cualquier bucket `min-max` (parseable)
 *    o un bucket predefinido por su `value`.
 *  - `search`: el texto tal cual (sin resolución).
 */
export function resolveFilterValue(
  key: FilterKey,
  rawValue: string,
  options: OptionsForFilter,
): ResolveResult {
  const label = filterKeyLabel(key);
  const raw = rawValue.trim();
  if (raw === "") {
    return {
      ok: false,
      error: `Indica un valor para ${label}. Escribe \`help\` para ver opciones.`,
    };
  }

  if (key === "search") {
    return { ok: true, value: raw, label: raw };
  }

  if (key === "type1" || key === "type2") {
    const resolved = TYPE_LABEL_TO_VALUE.get(norm(raw));
    if (resolved) {
      return {
        ok: true,
        value: resolved,
        label: POKEMON_TYPE_LABELS[resolved] ?? resolved,
      };
    }
    return {
      ok: false,
      error: `\`${rawValue}\` no es un tipo válido. Escribe \`options ${key}\` para ver la lista.`,
    };
  }

  if (key === "habitat") {
    const resolved = HABITAT_ALIAS_TO_INTERNAL.get(norm(raw));
    if (resolved) {
      return { ok: true, value: resolved, label: resolved };
    }
    return {
      ok: false,
      error: `\`${rawValue}\` no es un hábitat válido. Escribe \`options habitat\` para ver la lista.`,
    };
  }

  if (key === "height" || key === "weight") {
    const bucket = resolveBucket(rawValue, options);
    if (bucket) {
      return { ok: true, value: bucket, label: bucket.label };
    }
    return {
      ok: false,
      error: `\`${rawValue}\` no es un rango válido para ${label}. ` +
        `Formato: \`min-max\` (p. ej. \`0-1\`). Escribe \`options ${key}\`.`,
    };
  }

  // generation / color / ability: requieren opciones cargadas.
  if (options === undefined) {
    // Opciones todavía cargando: aplicamos el valor tal cual y dejamos
    // que el backend filtre. El usuario verá la lista vacía si no existe.
    return {
      ok: true,
      value: raw,
      label: raw,
    };
  }

  const match = matchOptionInList(raw, options);
  if (match) {
    return { ok: true, value: match.value, label: match.label };
  }
  return {
    ok: false,
    error: `\`${rawValue}\` no es una opción válida para ${label}. ` +
      `Escribe \`options ${key}\` para ver la lista.`,
  };
}

function matchOptionInList(
  raw: string,
  options: ReadonlyArray<FilterOption | FilterBucket>,
): FilterOption | FilterBucket | undefined {
  const target = norm(raw);
  for (const opt of options) {
    if (norm(opt.value) === target || norm(opt.label) === target) {
      return opt;
    }
  }
  return undefined;
}

function resolveBucket(
  rawValue: string,
  options: OptionsForFilter,
): FilterBucket | undefined {
  // Primero, coincidencia exacta con un bucket predefinido por value/label.
  if (options && options.length > 0) {
    const match = matchOptionInList(rawValue, options);
    if (match && "min" in match) return match;
  }
  // Si no, intentar parsear "min-max" y construir un bucket ad-hoc.
  const parsed = parseBucket(rawValue);
  return parsed;
}

function parseBucket(rawValue: string): FilterBucket | undefined {
  const m = /^(\d+(?:\.\d+)?)\s*[-_]\s*(\d+(?:\.\d+)?)$/.exec(rawValue.trim());
  if (!m) return undefined;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return undefined;
  }
  const value = `${min}_${max}`;
  return { value, label: value, min, max };
}

/* ------------------------------------------------------------------------- *
 * Generación de texto de ayuda (testeable, sin React)
 * ------------------------------------------------------------------------- */

export interface HelpLine {
  readonly text: string;
  readonly tone: "normal" | "accent" | "muted" | "error";
}

/** Lista de comandos para el `help` (con la sintaxis canónica). */
export const HELP_COMMANDS: ReadonlyArray<{ syntax: string; desc: string }> = [
  { syntax: "help", desc: "Muestra esta ayuda" },
  { syntax: "filtro", desc: " Lista los filtros" },
  { syntax: "options <filtro>", desc: " Opciones de un filtro" },
  { syntax: "<filtro> <valor>", desc: " Aplica un filtro" },
  { syntax: "resumen", desc: "Filtros ya aplicados" },
  { syntax: "quitar <filtro>", desc: " Elimina un filtro" },
  { syntax: "limpiar", desc: "Limpia la pantalla" },
  { syntax: "clear", desc: "Quita los filtros" },
  { syntax: "<texto>", desc: "Búsqueda libre" },
];

/**
 * Genera las líneas del comando `help`. Recibe la lista de filtros
 * definidos en `FILTERS` (que incluye `search`) para mostrarlos con
 * su etiqueta y clave.
 */
export function buildHelpLines(): HelpLine[] {
  const lines: HelpLine[] = [];
  lines.push({ text: "=== Comandos disponibles ===", tone: "accent" });
  for (const cmd of HELP_COMMANDS) {
    lines.push({
      text: `  ${cmd.syntax.padEnd(20)} ${cmd.desc}`,
      tone: "normal",
    });
  }
  lines.push({ text: "", tone: "normal" });
  lines.push({ text: "=== Filtros ===", tone: "accent" });
  for (const def of FILTERS) {
    lines.push({
      text: `  ⚬ ${def.label.padEnd(12)} (${def.key})`,
      tone: "normal",
    });
  }
  lines.push({ text: "", tone: "normal" });
  lines.push({
    text: 'Ejemplo: "tipo1 fuego", "generation generation-i", "Charman Pika"',
    tone: "muted",
  });
  return lines;
}
