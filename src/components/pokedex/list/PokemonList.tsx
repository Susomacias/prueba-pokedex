"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import { useNavigation } from "@/src/hooks/useNavigation";
import { applyFiltersToList } from "@/src/lib/pokemon/cachedPokemonApi";
import type { Filters } from "@/src/lib/filters/types";
import { POKEMON_LIST_PAGE_SIZE } from "@/src/lib/types/pokemon";
import type { PokemonListItem } from "@/src/lib/types/pokemon";
import { PokemonListCard } from "./PokemonListCard";
import "./pokemon-list.css";

/**
 * Plan 06.1 — `PokemonList`: lista virtualizada con ventana
 * deslizante de 2 páginas (60 items máx. en memoria).
 *
 * Estrategia:
 *  - Al montar (o al cambiar los filtros) se resetea la ventana a
 *    `windowStart = 0` y se piden las páginas `[0, 30)` y `[30, 60)`.
 *  - Un `IntersectionObserver` sobre el sentinel inferior avanza la
 *    ventana: al entrar el sentinel, se descarta la página saliente
 *    (la del extremo izquierdo del array de páginas), `windowStart`
 *    sube `+30` y se pide la nueva página `[windowStart + 30, ...)`.
 *  - Un `IntersectionObserver` sobre el sentinel superior retrocede
 *    la ventana (sólo si `windowStart > 0`).
 *  - El array `pages` contiene como mucho 2 entradas; los items
 *    desmontados se eliminan del estado (no quedan en DOM).
 *  - Si la API indica `single=true` (un único resultado bajo los
 *    filtros activos), la lista NO se monta: la UI debe navegar a
 *    la ficha del pokemon directamente (esto lo gestiona el caller /
 *    el slot `CARRUSEL_*` en fases siguientes).
 *  - Al pulsar una card se hace `router.push("/pokemon/<name>?<filtros>")`
 *    preservando los filtros activos en la URL.
 *
 * Accesibilidad:
 *  - La lista es un `role="listbox"` con `aria-label`.
 *  - Cada card es un `<button>` (Fase 06.2) — la navegación por
 *    teclado funciona nativamente.
 *  - Los sentinels son `aria-hidden` para no contaminar la lectura
 *    de pantalla (son elementos puramente estructurales).
 */

const WINDOW_PAGES = 2;

interface LoadedPage {
  offset: number;
  items: ReadonlyArray<PokemonListItem>;
  nextOffset: number | null;
  total: number | null;
  single: boolean;
}

export interface PokemonListProps {
  /** Pokemon actualmente seleccionado (para destacar la card). */
  selectedName?: string | null;
}

export function PokemonList({ selectedName = null }: PokemonListProps) {
  const { filters } = useFiltersContext();
  const navigation = useNavigation();

  // Serializa filtros para detectar cambios (clave estable).
  const filterKey = useMemo(() => stableKey(filters), [filters]);

  // Ventana: siempre [windowStart, windowStart + 60).
  const [windowStart, setWindowStart] = useState(0);
  const [pages, setPages] = useState<ReadonlyArray<LoadedPage>>([]);
  const [single, setSingle] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  // Cancelación + throttle de fetches solapados.
  const cancelledRef = useRef(false);
  const inFlightRef = useRef(0);

  // Flag de "hay otro load en curso": el sentinel debe ignorarlo para
  // no disparar avances múltiples mientras llega la respuesta.
  const loadingRef = useRef(false);

  // Refs de los sentinels para el IntersectionObserver.
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const observerTopRef = useRef<IntersectionObserver | null>(null);
  const observerBottomRef = useRef<IntersectionObserver | null>(null);

  /* ---------------------------------------------------------------- *
   * Carga de páginas
   * ---------------------------------------------------------------- */

  const fetchPage = useCallback(
    async (offset: number): Promise<LoadedPage> => {
      const result = await applyFiltersToList(filters, offset, undefined);
      return {
        offset,
        items: result.items,
        nextOffset: result.nextOffset,
        total: result.total,
        single: result.single,
      };
    },
    [filters],
  );

const loadWindow = useCallback(
    async (start: number) => {
      const ticket = ++inFlightRef.current;
      cancelledRef.current = false;
      setLoading(true);
      setError(null);
      try {
        const first = await fetchPage(start);
        if (cancelledRef.current || ticket !== inFlightRef.current) return;
        // El listado filtrable marca `single=true` cuando los filtros
        // activos reducen la lista a 1 resultado. En ese caso la UI
        // debe navegar directamente a la ficha del pokemon (lo gestiona
        // el caller / el slot `CARRUSEL_*`); aquí sólo ocultamos la
        // lista.
        setSingle(first.single);
        // Mostramos la primera página inmediatamente; la segunda
        // se carga perezosamente al hacer scroll (ver `slideForward`).
        setPages([first]);
        setLoading(false);
      } catch (err) {
        if (cancelledRef.current || ticket !== inFlightRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    },
    [fetchPage],
  );

  // Carga inicial y reset cuando cambian los filtros.
  useEffect(() => {
    // Reset del estado de la ventana cuando cambian los filtros.
    // Es el patrón canónico de React para sincronizar estado local
    // con un valor externo (los filtros vienen del context / URL);
    // documentado en https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
    // como caso legítimo. La regla `react-hooks/set-state-in-effect`
    // se desactiva aquí a propósito.
    /* eslint-disable react-hooks/set-state-in-effect */
    setWindowStart(0);
    setPages([]);
    setSingle(false);
    setError(null);
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    cancelledRef.current = false;
    void loadWindow(0);
    return () => {
      cancelledRef.current = true;
    };
    // `loadWindow` deriva de `filters`; usar `filterKey` evita
    // re-fetches espurios cuando la referencia del objeto cambia
    // sin cambiar contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  /* ---------------------------------------------------------------- *
   * Avance / retroceso de la ventana
   * ---------------------------------------------------------------- */

  const slideForward = useCallback(async () => {
    if (loadingRef.current) return;
    if (pages.length === 0) return;
    const last = pages[pages.length - 1]!;
    if (last.nextOffset === null) return;
    const newStart = windowStart + POKEMON_LIST_PAGE_SIZE;
    loadingRef.current = true;
    try {
      const next = await fetchPage(last.offset + POKEMON_LIST_PAGE_SIZE);
      setPages((prev) => {
        if (prev.length >= WINDOW_PAGES) {
          // Ventana ya al máximo → deslizamos: descartamos la cabeza.
          return [...prev.slice(1), next];
        }
        // Aún no llegamos al máximo → añadimos al final.
        return [...prev, next];
      });
      setWindowStart(newStart);
    } finally {
      loadingRef.current = false;
    }
  }, [pages, windowStart, fetchPage]);

  const slideBackward = useCallback(async () => {
    if (loadingRef.current) return;
    if (windowStart === 0) return;
    const newStart = windowStart - POKEMON_LIST_PAGE_SIZE;
    loadingRef.current = true;
    try {
      const prevPage = await fetchPage(newStart);
      setPages((curr) => {
        const head = [prevPage];
        const tail = curr.slice(0, WINDOW_PAGES - 1);
        return [...head, ...tail];
      });
      setWindowStart(newStart);
    } finally {
      loadingRef.current = false;
    }
  }, [windowStart, fetchPage]);

  /* ---------------------------------------------------------------- *
   * IntersectionObservers
   * ---------------------------------------------------------------- */

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }
    const top = topSentinelRef.current;
    const bottom = bottomSentinelRef.current;
    if (!top || !bottom) return;

    const topObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target === top) {
            void slideBackward();
          }
        }
      },
      { root: null, rootMargin: "120px 0px", threshold: 0 },
    );
    const bottomObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target === bottom) {
            void slideForward();
          }
        }
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 },
    );
    topObs.observe(top);
    bottomObs.observe(bottom);
    observerTopRef.current = topObs;
    observerBottomRef.current = bottomObs;
    return () => {
      topObs.disconnect();
      bottomObs.disconnect();
      observerTopRef.current = null;
      observerBottomRef.current = null;
    };
  }, [slideBackward, slideForward, windowStart, pages.length]);

  /* ---------------------------------------------------------------- *
   * Selección
   * ---------------------------------------------------------------- */

  const onSelect = useCallback(
    (name: string) => {
      const query = filtersToQueryString(filters);
      const url =
        query.length > 0
          ? `/pokemon/${name}?${query}`
          : `/pokemon/${name}`;
      navigation.router.push(url);
    },
    [filters, navigation.router],
  );

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  // `single=true` → la lista no debe mostrarse (la UI carga la ficha).
  // Mantenemos el contenedor con `data-testid="pokemon-list"` para
  // que el slot siga ocupando su hueco y no haya saltos visuales.
  if (single) {
    return (
      <div
        data-testid="pokemon-list"
        data-single="true"
        aria-hidden="true"
        style={containerStyle}
      />
    );
  }

  // Aplana las páginas en un único array de items manteniendo el
  // orden por offset. Esto es lo que se renderiza en el DOM.
  const visibleItems = pages.flatMap((p) => p.items);
  const lastPage = pages[pages.length - 1];
  const hasMore = lastPage ? lastPage.nextOffset !== null : true;
  const hasPrev = windowStart > 0;

  return (
    <div
      data-testid="pokemon-list"
      role="listbox"
      aria-label="Lista de Pokémon"
      style={containerStyle}
    >
      {/* Sentinel superior — oculto cuando windowStart === 0. */}
      <div
        ref={topSentinelRef}
        data-testid="pokemon-list-top-sentinel"
        aria-hidden="true"
        style={sentinelStyle(!hasPrev)}
      />

      {visibleItems.map((item, idx) => (
        <PokemonListCard
          key={`${item.id}-${idx}`}
          item={item}
          index={windowStart + idx + 1}
          onSelect={onSelect}
          selectedName={selectedName}
        />
      ))}

      {/* Indicador de carga sutil al final. */}
      {loading ? (
        <div
          data-testid="pokemon-list-loading"
          aria-hidden="true"
          style={loadingStyle}
        />
      ) : null}

      {/* Sentinel inferior — oculto cuando no hay más páginas. */}
      <div
        ref={bottomSentinelRef}
        data-testid="pokemon-list-bottom-sentinel"
        aria-hidden="true"
        style={sentinelStyle(!hasMore)}
      />

      {error ? (
        <p role="alert" style={errorStyle}>
          Error cargando la lista: {error.message}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- *
 * Helpers
 * ------------------------------------------------------------------------- */

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflowY: "auto",
  overflowX: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "8px",
  scrollbarWidth: "thin",
  scrollbarColor: "#126CA3 transparent",
};

function sentinelStyle(hidden: boolean): CSSProperties {
  return {
    width: "100%",
    height: hidden ? "0" : "1px",
    flexShrink: 0,
    pointerEvents: "none",
    visibility: hidden ? "hidden" : "visible",
  };
}

const loadingStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  margin: "12px auto",
  borderRadius: "50%",
  border: "3px solid rgba(18, 108, 163, 0.25)",
  borderTopColor: "#FF9203",
  animation: "pokedex-list-spin 0.8s linear infinite",
};

const errorStyle: CSSProperties = {
  color: "#FF6363",
  fontSize: "10px",
  padding: "8px",
  textAlign: "center",
};

function stableKey(filters: Filters): string {
  const keys = Object.keys(filters) as Array<keyof Filters>;
  return keys
    .sort()
    .map((k) => `${String(k)}=${valueToString(filters[k])}`)
    .join("&");
}

function valueToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    return String(obj.value ?? "");
  }
  return String(v);
}

/** Serializa los filtros activos como query string para preservar en la URL. */
function filtersToQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  const keys = Object.keys(filters) as Array<keyof Filters>;
  for (const key of keys) {
    const value = filters[key];
    if (value === undefined || value === null) continue;
    const raw =
      typeof value === "object"
        ? String((value as unknown as Record<string, unknown>).value ?? "")
        : String(value);
    if (raw === "") continue;
    params.set(String(key), raw);
  }
  return params.toString();
}