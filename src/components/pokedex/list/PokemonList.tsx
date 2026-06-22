"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import { useFilteredPokemonList } from "@/src/components/filters/useFilteredPokemonList";
import { useNavigation } from "@/src/hooks/useNavigation";
import type { Filters } from "@/src/lib/filters/types";
import { PokemonListCard } from "./PokemonListCard";
import "./pokemon-list.css";

/**
 * `PokemonList` — lista paginada con scroll infinito clásico.
 *
 * Estrategia (patrón estándar y probado):
 *  - Usa el hook `useFilteredPokemonList` que ya encapsula la
 *    paginación acumulativa (`items[]`, `nextOffset`, `loadMore()`,
 *    `single`, `error`, `status`).
 *  - El contenedor tiene scroll interno. Detectar "casi al final" se
 *    hace en el evento `scroll` del propio contenedor (con throttle
 *    por `requestAnimationFrame`). Esto es 100% fiable dentro de un
 *    `<foreignObject>` SVG (donde `IntersectionObserver` con
 *    `root: scrollEl` da resultados inconsistentes en Chromium).
 *  - El umbral es `clientHeight + LOOKAHEAD_PX`: cuando la distancia
 *    desde el `scrollTop` hasta el final del contenido es ≤
 *    `LOOKAHEAD_PX` (≈ 1.5 pantallas), se lanza `loadMore()` para
 *    que la siguiente tanda llegue a tiempo y el scroll no se
 *    interrumpa.
 *  - **No** hay virtualización: las cards se renderizan en flujo
 *    normal del DOM. Esto evita los problemas de medida de altura,
 *    posición absoluta, y re-mediciones constantes.
 *  - **No** hay ventana deslizante: todas las páginas cargadas se
 *    conservan en memoria. El navegador maneja miles de nodos sin
 *    problema.
 *  - Al cambiar los filtros, el hook `useFilteredPokemonList` se
 *    reinicia automáticamente (re-fetch con `filterKey`).
 *  - Si la API devuelve `single=true`, la lista NO se monta: la UI
 *    debe navegar a la ficha del pokemon directamente.
 *  - Al pulsar una card → `router.push("/pokemon/<name>?<filtros>")`.
 *
 * Accesibilidad:
 *  - `role="listbox"` con `aria-label`.
 *  - Cada card es un `<button>` (`PokemonListCard`) — navegación por
 *    teclado nativa.
 *  - Estado de carga visible para tecnologías de asistencia
 *    (`aria-busy`).
 */

const LOOKAHEAD_PX = 400;

export interface PokemonListProps {
  /** Pokemon actualmente seleccionado (para destacar la card). */
  selectedName?: string | null;
}

export function PokemonList({ selectedName = null }: PokemonListProps) {
  const { filters } = useFiltersContext();
  const navigation = useNavigation();

  const {
    items,
    nextOffset,
    single,
    error,
    status,
    loadMore,
  } = useFilteredPokemonList();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const rafPendingRef = useRef(false);

  /* ---------------------------------------------------------------- *
   * Disparo de `loadMore()` por scroll. Usamos el evento nativo
   * `scroll` del contenedor (no `IntersectionObserver`) porque es
   * 100% fiable dentro de un `<foreignObject>` SVG, y permite un
   * control fino del umbral de lookahead.
   * ---------------------------------------------------------------- */
  const triggerLoadMore = useCallback(() => {
    if (loadingMoreRef.current) return;
    if (nextOffset === null) return;
    if (status === "loading") return;
    loadingMoreRef.current = true;
    void loadMore().finally(() => {
      loadingMoreRef.current = false;
    });
  }, [nextOffset, status, loadMore]);

  const onScroll = useCallback(() => {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      const el = scrollRef.current;
      if (!el) return;
      const distanceToBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceToBottom <= LOOKAHEAD_PX) {
        triggerLoadMore();
      }
    });
  }, [triggerLoadMore]);

  // Re-evaluar después de cada cambio de `items` (porque el
  // scrollHeight crece y puede que el usuario ya esté cerca del
  // final sin haber hecho scroll).
  useEffect(() => {
    if (single) return;
    const el = scrollRef.current;
    if (!el) return;
    const distanceToBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom <= LOOKAHEAD_PX) {
      triggerLoadMore();
    }
  }, [items, single, triggerLoadMore]);

  /* ---------------------------------------------------------------- *
   * Selección / navegación
   * ---------------------------------------------------------------- */
  const onSelect = useCallback(
    (name: string) => {
      const query = filtersToQueryString(filters);
      const url =
        query.length > 0 ? `/pokemon/${name}?${query}` : `/pokemon/${name}`;
      navigation.router.push(url);
    },
    [filters, navigation.router],
  );

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  if (single) {
    return (
      <div
        ref={scrollRef}
        data-testid="pokemon-list"
        data-single="true"
        aria-hidden="true"
        style={containerStyle}
      />
    );
  }

  const isLoadingMore = status === "loadingMore";
  const isLoading = status === "loading";

  return (
    <div
      ref={scrollRef}
      data-testid="pokemon-list"
      role="listbox"
      aria-label="Lista de Pokémon"
      aria-busy={isLoading || isLoadingMore}
      onScroll={onScroll}
      style={containerStyle}
    >
      {items.map((item, idx) => (
        <PokemonListCard
          key={item.id}
          item={item}
          index={idx + 1}
          onSelect={onSelect}
          selectedName={selectedName}
        />
      ))}

      {/* Spinner sutil al final mientras carga la siguiente página. */}
      {isLoadingMore ? (
        <div
          data-testid="pokemon-list-loading-more"
          aria-hidden="true"
          style={loadingStyle}
        />
      ) : null}

      {/* Estado de carga inicial (sin items todavía). */}
      {isLoading && items.length === 0 ? (
        <div
          data-testid="pokemon-list-loading"
          aria-hidden="true"
          style={loadingStyle}
        />
      ) : null}

      {error ? (
        <p role="alert" style={errorStyle}>
          Error cargando la lista: {error.message}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- *
 * Estilos
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

/* ------------------------------------------------------------------------- *
 * Helpers
 * ------------------------------------------------------------------------- */

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

