"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import { useAppShell } from "@/src/components/app/ViewContext";
import { applyFiltersToList } from "@/src/lib/pokemon/cachedPokemonApi";
import type { PokemonListItem } from "@/src/lib/types/pokemon";
import "./filter-controls.css";

const DEBOUNCE_MS = 300;
const SUGGESTIONS_LIMIT = 8;

/**
 * Icono de lupa con pokeball en el centro (SVG dibujado a mano, Plan 07.3).
 */
function PokeballMagnifier() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <line
        x1="17"
        y1="17"
        x2="22"
        y2="22"
        stroke="#8DF0FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx="10"
        cy="10"
        r="8"
        stroke="#8DF0FF"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M2 10 a8 8 0 0 1 16 0"
        fill="#FF6363"
        stroke="none"
      />
      <line
        x1="2"
        y1="10"
        x2="18"
        y2="10"
        stroke="#fff"
        strokeWidth="1"
      />
      <circle cx="10" cy="10" r="1.8" fill="#fff" stroke="#333" strokeWidth="0.5" />
    </svg>
  );
}

/**
 * `SearchInput` — buscador LCD con icono pokeball-lupa (Plan 07.3).
 *
 * Comportamiento:
 *  - Debounce de 300ms antes de buscar.
 *  - Muestra sugerencias via portal (sin recortes de foreignObject).
 *  - Al escribir aplica el termino como filtro `search` via
 *    `useFiltersContext().setFilter("search", term)`.
 *  - Cada palabra se busca por separado ("Charman Pika" → ambos).
 *  - Al seleccionar una sugerencia, navega a la ficha del pokemon.
 */
export function SearchInput() {
  const { goToPokemon } = useAppShell();
  const { setFilter } = useFiltersContext();

  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<ReadonlyArray<PokemonListItem>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef(0);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.trim().length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    const nonce = ++abortRef.current;
    try {
      const result = await applyFiltersToList(
        {},
        0,
        { search: term, limit: SUGGESTIONS_LIMIT, withTotal: false },
      );
      if (nonce !== abortRef.current) return;
      setSuggestions(result.items);
      if (result.items.length > 0 && fieldRef.current) {
        setAnchorRect(fieldRef.current.getBoundingClientRect());
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch {
      if (nonce !== abortRef.current) return;
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      if (nonce === abortRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const onInput = useCallback(
    (next: string) => {
      setValue(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void fetchSuggestions(next.trim());
        if (next.trim().length > 0) {
          setFilter("search", next.trim());
        }
      }, DEBOUNCE_MS);
    },
    [fetchSuggestions, setFilter],
  );

  const onSelect = useCallback(
    (name: string) => {
      setValue("");
      setSuggestions([]);
      setIsOpen(false);
      goToPokemon(name);
    },
    [goToPokemon],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
      if (e.key === "Enter" && value.trim()) {
        setFilter("search", value.trim());
        if (suggestions.length > 0) {
          onSelect(suggestions[0]!.name);
        }
      }
    },
    [value, setFilter, suggestions, onSelect],
  );

  const onFocus = useCallback(() => {
    if (suggestions.length > 0 && fieldRef.current) {
      setAnchorRect(fieldRef.current.getBoundingClientRect());
      setIsOpen(true);
    }
  }, [suggestions]);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        fieldRef.current &&
        !fieldRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick, true);
    return () => document.removeEventListener("mousedown", onClick, true);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const portalStyle: React.CSSProperties | undefined =
    isOpen && anchorRect
      ? {
          width: anchorRect.width,
          maxHeight: 160,
          top: anchorRect.bottom + 4,
          left: anchorRect.left,
        }
      : undefined;

  return (
    <div className="search-input-wrapper">
      <div ref={fieldRef} className="search-input-field">
        <PokeballMagnifier />
        <input
          ref={inputRef}
          className="search-input-field__input"
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? "search-suggestions-list" : undefined}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-label="Buscar pokemon"
          placeholder="Buscar..."
          value={value}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {isLoading && (
          <span aria-hidden="true" className="search-input-field__loading">
            ...
          </span>
        )}
      </div>
      {isOpen && suggestions.length > 0 && portalStyle && createPortal(
        <div
          id="search-suggestions-list"
          className="search-suggestions"
          role="listbox"
          data-testid="search-suggestions"
          style={portalStyle}
        >
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={false}
              tabIndex={0}
              className="search-suggestions__option"
              onClick={() => onSelect(item.name)}
            >
              <span className="search-suggestions__option-id">
                #{item.id}
              </span>
              {item.name}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
