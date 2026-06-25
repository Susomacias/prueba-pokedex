"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import {
  useFilterOptions,
  type FilterOptionKey,
} from "@/src/components/filters/useFilterOptions";
import {
  useFilterAvailability,
} from "@/src/components/filters/useFilterAvailability";
import {
  FILTERS,
  type FilterKey,
  type FilterValue,
  type Filters,
} from "@/src/lib/filters/types";
import { filterKeyToOptionKey } from "@/src/components/pokedex/console/consoleParser";
import type { FilterBucket, FilterOption } from "@/src/lib/types/pokemon";
import "./filter-controls.css";

const DROPDOWN_FILTER_KEYS: FilterKey[] = [
  "type1",
  "type2",
  "generation",
  "color",
  "habitat",
  "ability",
  "height",
  "weight",
];

const FILTER_ALL_VALUE = "__all__";

function activeValueLabel(filters: Filters, key: FilterKey): string | null {
  const def = FILTERS.find((f) => f.key === key);
  if (!def) return null;
  const value = filters[key];
  if (value === undefined) return null;
  try {
    return def.format(value as never);
  } catch {
    return String(value);
  }
}

/**
 * Panel de opciones de un filtro, renderizado vía portal a document.body
 * para que no sea recortado por foreignObject ni afecte al layout del slot.
 */
function FilterDropdownPanel({
  filterKey,
  anchorRect,
  onSelect,
  onClose,
  isAvailable,
  isBucketAvailableForRange,
}: {
  filterKey: FilterKey;
  anchorRect: DOMRect;
  onSelect: (value: string) => void;
  onClose: () => void;
  isAvailable: (value: string) => boolean;
  isBucketAvailableForRange: (bucket: FilterBucket) => boolean;
}) {
  const optionKey = filterKeyToOptionKey(filterKey) as FilterOptionKey | undefined;
  const { status, options } = useFilterOptions(optionKey ?? "type");

  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filteredOptions = useMemo(() => {
    let list = options;
    if (search.trim() !== "") {
      const q = search.toLowerCase().trim();
      list = list.filter((o) => {
        const v = o as FilterOption | FilterBucket;
        return (
          v.label.toLowerCase().includes(q) ||
          v.value.toLowerCase().includes(q)
        );
      });
    }
    return list.filter((o) => {
      const v = o as FilterOption | FilterBucket;
      if ("min" in v && "max" in v) {
        return isBucketAvailableForRange(v as FilterBucket);
      }
      return isAvailable(v.value);
    });
  }, [options, search, isAvailable, isBucketAvailableForRange]);

  useEffect(() => {
    const input = searchInputRef.current;
    if (input) {
      const raf = requestAnimationFrame(() => input.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  const isEmpty =
    (status === "ready" || status === "loading") &&
    filteredOptions.length === 0;

  const panelW = Math.max(anchorRect.width * 2, 200);
  const totalOptions = filteredOptions.length + 1;
  const panelH = Math.min(
    Math.max(totalOptions * 28 + 36, 100),
    280,
  );

  const top = anchorRect.top - panelH - 6;
  const left = Math.max(4, anchorRect.left - (panelW - anchorRect.width) / 2);

  const style: React.CSSProperties = {
    width: panelW,
    maxHeight: panelH,
    top: Math.max(4, top),
    left,
  };

  return createPortal(
    <div
      className="filter-dropdown-panel"
      role="listbox"
      aria-label={filterKey}
      data-testid="filter-dropdown-panel"
      style={style}
      onKeyDown={onKeyDown}
    >
      <input
        ref={searchInputRef}
        className="filter-dropdown-panel__search"
        type="text"
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        aria-label={`Buscar en ${filterKey}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <div className="filter-dropdown-panel__list">
        {status === "loading" && (
          <div data-testid="filter-dropdown-loading" className="filter-dropdown-panel__status">
            cargando...
          </div>
        )}
        {status === "error" && (
          <div className="filter-dropdown-panel__status filter-dropdown-panel__status--error">
            Error al cargar
          </div>
        )}
        <button
          type="button"
          role="option"
          aria-selected={false}
          tabIndex={0}
          className="filter-dropdown-panel__option filter-dropdown-panel__option--all"
          onClick={() => onSelect(FILTER_ALL_VALUE)}
        >
          Todos
        </button>
        {isEmpty && (
          <div className="filter-dropdown-panel__status">
            sin resultados
          </div>
        )}
        {filteredOptions.map((o) => {
          const opt = o as FilterOption | FilterBucket;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={false}
              tabIndex={0}
              className="filter-dropdown-panel__option"
              onClick={() => onSelect(opt.value)}
            >
              &#9673; {opt.label}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}

/**
 * `FilterDropdowns` — grid de 8 botones con dropdowns (Plan 07.2).
 *
 * Botones casi cuadrados, 2 lineas: nombre del filtro arriba, valor
 * activo abajo. Dropdown via portal para overlays sin recorte.
 */
export function FilterDropdowns() {
  const { filters, setFilter } = useFiltersContext();
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const buttonRefs = useRef<Map<FilterKey, HTMLButtonElement>>(new Map());
  const availability = useFilterAvailability(filters);

  const onClose = useCallback(() => {
    setOpenKey(null);
    setAnchorRect(null);
  }, []);

  const onToggle = useCallback(
    (key: FilterKey) => {
      if (openKey === key) {
        onClose();
      } else {
        const btn = buttonRefs.current.get(key);
        if (btn) setAnchorRect(btn.getBoundingClientRect());
        setOpenKey(key);
      }
    },
    [openKey, onClose],
  );

  const onSelect = useCallback(
    (key: FilterKey, value: string) => {
      if (value === FILTER_ALL_VALUE) {
        setFilter(key, undefined!);
      } else {
        setFilter(key, value as FilterValue<typeof key>);
      }
      onClose();
    },
    [setFilter, onClose],
  );

  useEffect(() => {
    if (!openKey) return;
    const onClick = (e: MouseEvent) => {
      const btn = buttonRefs.current.get(openKey);
      if (!btn) return;
      const target = e.target as Node;
      // No cerrar si el click es en el botón o en un portal hijo
      if (btn.contains(target)) return;
      // Tampoco cerrar si el click es en el panel portal (data-testid)
      const panel = document.querySelector('[data-testid="filter-dropdown-panel"]');
      if (panel && panel.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onClick, true);
    return () => document.removeEventListener("mousedown", onClick, true);
  }, [openKey, onClose]);

  return (
    <div className="filter-dropdowns-grid">
      {DROPDOWN_FILTER_KEYS.map((key) => {
        const def = FILTERS.find((f) => f.key === key)!;
        const active = filters[key] !== undefined;
        const activeLabel = activeValueLabel(filters, key);
        const isOpen = openKey === key;
        return (
          <div key={key} className="filter-dropdown-cell">
            <button
              ref={(el) => {
                if (el) buttonRefs.current.set(key, el);
                else buttonRefs.current.delete(key);
              }}
              type="button"
              className="filter-dropdown-btn"
              aria-label={def.label}
              aria-pressed={active}
              data-active={String(active)}
              onClick={() => onToggle(key)}
            >
              <span className="filter-dropdown-btn__name">{def.label}</span>
              {activeLabel && (
                <span className="filter-dropdown-btn__value">{activeLabel}</span>
              )}
            </button>
            {isOpen && anchorRect && (
              <FilterDropdownPanel
                filterKey={key}
                anchorRect={anchorRect}
                onSelect={(v) => onSelect(key, v)}
                onClose={onClose}
                isAvailable={(v) => availability.isAvailable(key, v)}
                isBucketAvailableForRange={(b) =>
                  availability.isBucketAvailableForRange(
                    b,
                    key === "height" ? "height" : "weight",
                  )
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
