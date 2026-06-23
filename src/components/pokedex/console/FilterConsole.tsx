"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import { useFilterOptions } from "@/src/components/filters/useFilterOptions";
import type { FilterOptionKey } from "@/src/components/filters/useFilterOptions";
import { FILTERS, type FilterKey } from "@/src/lib/filters/types";
import type { FilterBucket, FilterOption } from "@/src/lib/types/pokemon";
import { parseCommand } from "./consoleParser";
import {
  buildHelpLines,
  resolveFilterValue,
  type HelpLine,
  type OptionsForFilter,
} from "./consoleExecutor";
import { filterKeyLabel, filterKeyToOptionKey } from "./consoleParser";
import { WELCOME_LINES } from "./welcome";
import "./filter-console.css";

/**
 * `FilterConsole` — consola estilo terminal (Plan 07.1, slot
 * `CONSOLA_FILTROS`).
 *
 * Pantalla scrollable con historial de comandos/respuestas + input
 * con prompt `>` y cursor parpadeante. Al iniciar emite un mensaje de
 * bienvenida del Profesor Oak y sugiere `help`.
 *
 * Todos los comandos mutan el estado unificado de filtros
 * (`useFiltersContext`) que a su vez sincroniza la URL y dispara el
 * refresco de la lista (mismo scroll infinito que sin filtros).
 *
 * El parser y la resolución de valores están en módulos puros
 * (`consoleParser`, `consoleExecutor`) para ser testeables sin React.
 */

/* ------------------------------------------------------------------------- *
 * Tipos internos
 * ------------------------------------------------------------------------- */

type LineTone = "normal" | "accent" | "error" | "muted" | "ok" | "prompt";

interface ConsoleLine {
  readonly id: number;
  readonly tone: LineTone;
  readonly text: string;
}

/* ------------------------------------------------------------------------- *
 * Registry de opciones: llama a los 7 hooks de opciones de forma
 * estática (lint-safe) y los expone como un mapa key → result.
 * ------------------------------------------------------------------------- */

function useFilterOptionsRegistry(): Record<
  FilterOptionKey,
  OptionsForFilter
> {
  const type = useFilterOptions("type");
  const generation = useFilterOptions("generation");
  const color = useFilterOptions("color");
  const habitat = useFilterOptions("habitat");
  const ability = useFilterOptions("ability");
  const height = useFilterOptions("height");
  const weight = useFilterOptions("weight");
  return useMemo(
    () => ({
      type: type.options,
      generation: generation.options,
      color: color.options,
      habitat: habitat.options,
      ability: ability.options,
      height: height.options,
      weight: weight.options,
    }),
    [
      type.options,
      generation.options,
      color.options,
      habitat.options,
      ability.options,
      height.options,
      weight.options,
    ],
  );
}

/* ------------------------------------------------------------------------- *
 * Componente
 * ------------------------------------------------------------------------- */

let lineIdCounter = 0;
function nextLineId(): number {
  lineIdCounter += 1;
  return lineIdCounter;
}

export function FilterConsole() {
  const { setFilter, removeFilter, clearAll, summary } = useFiltersContext();
  const registry = useFilterOptionsRegistry();

  const [lines, setLines] = useState<readonly ConsoleLine[]>(() =>
    toConsoleLines(WELCOME_LINES),
  );
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<readonly string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);

  const screenRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* Auto-scroll al final cuando llegan líneas nuevas.
   *
   * Estrategia robusta (en este orden):
   *  1. Ajustar `scrollTop = scrollHeight` en el contenedor
   *     `.fc-screen`. Esto funciona si el contenedor tiene altura
   *     limitada y `overflow-y: auto` (que es nuestro caso).
   *  2. Como fallback, hacer `scrollIntoView` sobre la última línea.
   *     Útil cuando el navegador aún no ha calculado layout (p.ej. en
   *     `<foreignObject>` SVG, donde la primera paint puede tardar un
   *     frame más que en DOM normal).
   *  3. Si `scrollHeight === clientHeight` (no hay overflow todavía),
   *     reintentamos en el siguiente frame con `requestAnimationFrame`.
   *
   * El hook depende de `lines.length` (no de `lines`) para no
   * re-ejecutar el scroll si el array cambia de identidad pero el
   * número de líneas es el mismo (poco probable pero posible tras
   * `limpiar`).
   */
  useEffect(() => {
    const scrollToBottom = () => {
      const el = screenRef.current;
      if (!el) return;
      // 1) Ajuste directo.
      el.scrollTop = el.scrollHeight;
      // 2) Fallback sobre la última línea.
      const lastLine = el.lastElementChild as (HTMLElement & {
        scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
      }) | null;
      if (lastLine && typeof lastLine.scrollIntoView === "function") {
        lastLine.scrollIntoView({ block: "end", behavior: "auto" });
      }
      // 3) Si no había overflow (contenido más pequeño que el
      // viewport), nada que hacer. Si lo había y aún no se ha
      // actualizado, reintentar en el siguiente frame.
      if (el.scrollHeight > el.clientHeight + 1) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    };
    scrollToBottom();
    // Reintento adicional por si el navegador aún no había calculado
    // el alto del contenedor en este commit (caso típico de
    // `<foreignObject>` SVG con cambio de contenido).
    const raf = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(raf);
  }, [lines.length]);

  const appendLines = useCallback((newLines: readonly ConsoleLine[]) => {
    if (newLines.length === 0) return;
    setLines((prev) => [...prev, ...newLines]);
  }, []);

  const appendHelp = useCallback(
    (helpLines: readonly HelpLine[]) => {
      appendLines(toConsoleLines(helpLines));
    },
    [appendLines],
  );

  /* ------------------ ejecución de comandos parseados --------------- */
  const execute = useCallback(
    (raw: string) => {
      const cmd = parseCommand(raw);
      switch (cmd.kind) {
        case "noop":
          return;

        case "help":
          appendHelp(buildHelpLines());
          return;

        case "filters":
          appendHelp(buildFiltersListLines(registry));
          return;

        case "summary":
          appendHelp(buildSummaryLines(summary()));
          return;

        case "clearScreen":
          setLines([]);
          return;

        case "clearFilters":
          clearAll();
          appendLines([
            line("ok", "✓ Filtros borrados. Lista restablecida."),
          ]);
          return;

        case "options": {
          const optionKey = filterKeyToOptionKey(cmd.filterKey);
          if (!optionKey) return; // parser ya validó
          const options = registry[optionKey];
          appendHelp(buildOptionsLines(cmd.filterKey, options));
          return;
        }

        case "remove": {
          removeFilter(cmd.filterKey);
          appendLines([
            line("ok", `✓ ${filterKeyLabel(cmd.filterKey)} eliminado.`),
          ]);
          return;
        }

        case "search": {
          setFilter("search", cmd.term);
          appendLines([
            line("ok", `🔍 Buscando: "${cmd.term}"`),
          ]);
          return;
        }

        case "apply": {
          const optionKey = filterKeyToOptionKey(cmd.filterKey);
          const options = optionKey ? registry[optionKey] : undefined;
          const result = resolveFilterValue(
            cmd.filterKey,
            cmd.rawValue,
            options,
          );
          if (!result.ok) {
            appendLines([line("error", `✗ ${result.error}`)]);
            return;
          }
          setFilter(cmd.filterKey, result.value as never);
          appendLines([
            line(
              "ok",
              `✓ ${filterKeyLabel(cmd.filterKey)} = ${result.label}`,
            ),
          ]);
          return;
        }

        case "unknown":
          appendLines([line("error", `✗ ${cmd.message}`)]);
          return;
      }
    },
    [appendHelp, appendLines, clearAll, registry, removeFilter, setFilter, summary],
  );

  /* ----------------------- envío del input -------------------------- */
  const onSubmit = useCallback(() => {
    const raw = input;
    const trimmed = raw.trim();
    // Eco de la entrada del usuario con el prompt `>`.
    appendLines([line("prompt", `> ${raw}`)]);
    setInput("");
    setHistoryIdx(null);
    if (trimmed !== "") {
      setHistory((prev) => [...prev, trimmed]);
    }
    execute(trimmed);
  }, [appendLines, execute, input]);

  /* ----------------------- historial con flechas ------------------- */
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length === 0) return;
        const idx =
          historyIdx === null
            ? history.length - 1
            : Math.max(0, historyIdx - 1);
        setHistoryIdx(idx);
        setInput(history[idx] ?? "");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIdx === null) return;
        const idx = historyIdx + 1;
        if (idx >= history.length) {
          setHistoryIdx(null);
          setInput("");
        } else {
          setHistoryIdx(idx);
          setInput(history[idx] ?? "");
        }
        return;
      }
    },
    [history, historyIdx, onSubmit],
  );

  /* --------------------------- render ------------------------------- */
  return (
    <div
      className="fc-root"
      data-testid="filter-console-root"
      role="log"
      aria-label="Consola de filtros"
      aria-live="polite"
    >
      <div ref={screenRef} className="fc-screen" data-testid="filter-console-screen">
        {lines.map((l) => (
          <div key={l.id} className={`fc-line fc-line--${l.tone}`}>
            {l.text}
          </div>
        ))}
      </div>
      <div className="fc-input-row">
        <span className="fc-prompt" aria-hidden="true">
          {">"}
        </span>
        <input
          ref={inputRef}
          className="fc-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Comando de la consola de filtros"
          aria-describedby="fc-hint"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <span className="fc-cursor" aria-hidden="true" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- *
 * Helpers de formato (líneas de salida)
 * ------------------------------------------------------------------------- */

function line(tone: LineTone, text: string): ConsoleLine {
  return { id: nextLineId(), tone, text };
}

function toConsoleLines(helpLines: readonly HelpLine[]): ConsoleLine[] {
  return helpLines.map((h) => line(mapTone(h.tone), h.text));
}

function mapTone(t: HelpLine["tone"]): LineTone {
  switch (t) {
    case "accent":
      return "accent";
    case "muted":
      return "muted";
    case "error":
      return "error";
    default:
      return "normal";
  }
}

const POKEBALL = "◎";

function buildFiltersListLines(
  registry: Record<FilterOptionKey, OptionsForFilter>,
): HelpLine[] {
  const out: HelpLine[] = [
    { text: "=== Filtros disponibles ===", tone: "accent" },
  ];
  for (const def of FILTERS) {
    const optionKey = filterKeyToOptionKey(def.key as FilterKey);
    const status =
      optionKey === undefined
        ? "(texto libre)"
        : optionStatus(registry[optionKey]);
    out.push({
      text: `  ${POKEBALL} ${def.label.padEnd(12)} ${status}`,
      tone: "normal",
    });
  }
  out.push({ text: "", tone: "normal" });
  out.push({
    text: "Escribe `options <filtro>` para ver las opciones de cada uno.",
    tone: "muted",
  });
  return out;
}

function optionStatus(options: OptionsForFilter): string {
  if (options === undefined) return "cargando…";
  if (options.length === 0) return "(sin opciones)";
  return `(${options.length} opciones)`;
}

function buildOptionsLines(
  filterKey: FilterKey,
  options: OptionsForFilter,
): HelpLine[] {
  const label = filterKeyLabel(filterKey);
  if (options === undefined) {
    return [
      { text: `=== ${label} ===`, tone: "accent" },
      { text: "  Cargando opciones", tone: "muted" },
    ];
  }
  const out: HelpLine[] = [
    { text: `=== ${label} (${options.length}) ===`, tone: "accent" },
  ];
  for (const opt of options) {
    const value = (opt as FilterOption | FilterBucket).value;
    const display = (opt as FilterOption | FilterBucket).label;
    out.push({ text: `  ${POKEBALL} ${display}  (${value})`, tone: "normal" });
  }
  out.push({ text: "", tone: "normal" });
  out.push({
    text: `Aplica con: \`${filterKey} <valor>\``,
    tone: "muted",
  });
  return out;
}

function buildSummaryLines(
  entries: ReadonlyArray<{ key: FilterKey; label: string; display: string }>,
): HelpLine[] {
  if (entries.length === 0) {
    return [{ text: "No hay filtros aplicados.", tone: "muted" }];
  }
  const out: HelpLine[] = [{ text: "=== Filtros aplicados ===", tone: "accent" }];
  for (const e of entries) {
    out.push({ text: `  ${POKEBALL} ${e.label}: ${e.display}`, tone: "normal" });
  }
  return out;
}
