"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { useFilteredPokemonList } from "@/src/components/filters/useFilteredPokemonList";
import { useAppShell } from "@/src/components/app/ViewContext";
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
 *  - Al pulsar una card → `useAppShell().goToPokemon(name)` (que
 *    hace `history.pushState` sin recargar la página). Plan 11:
 *    la lista se queda detrás del carrusel overlay y la Pokédex NO
 *    se re-monta. Los filtros aplicados se mantienen vivos en la URL
 *    vía `useFilters` (router.replace, sin entrada en historial).
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
  const { goToPokemon } = useAppShell();

  const {
    items,
    nextOffset,
    single,
    error,
    status,
    retryAfterMs,
    loadMore,
    retry,
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
      // Plan 11: navegación SPA sin recarga. `goToPokemon` hace
      // `history.pushState({}, '', '/pokemon/<name>')` y actualiza el
      // pathname en el estado. NO desmonta la Pokédex ni la lista:
      // sólo dispara la animación de entrada del overlay del carrusel.
      // Los filtros activos se preservan porque viven en la URL
      // (`useFilters` los sincroniza con `router.replace`).
      goToPokemon(name);
    },
    [goToPokemon],
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
        <div
          role="alert"
          data-testid="pokemon-list-error"
          style={errorStyle}
        >
          <p style={{ margin: "0 0 8px" }}>
            No se pudo cargar la lista de pokémon.
          </p>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "7px",
              opacity: 0.85,
              wordBreak: "break-word",
            }}
          >
            {humanizeListError(error)}
          </p>
          {retryAfterMs !== null && retryAfterMs >= 1000 ? (
            <p
              data-testid="pokemon-list-retry-hint"
              style={{ margin: "0 0 8px", fontSize: "7px", opacity: 0.75 }}
            >
              Reintentaremos automáticamente en{" "}
              {formatRetryAfter(retryAfterMs)}.
            </p>
          ) : null}
          <button
            type="button"
            onClick={retry}
            data-testid="pokemon-list-retry"
            style={{
              background: "#126CA3",
              color: "#fff",
              border: "1px solid #0a4a78",
              padding: "4px 10px",
              fontFamily: "inherit",
              fontSize: "8px",
              cursor: "pointer",
              borderRadius: "2px",
            }}
          >
            Reintentar
          </button>
        </div>
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

/**
 * Convierte el `Error` crudo del hook en un mensaje legible para el
 * usuario. La PokeAPI upstream pasa por un proxy que normaliza 5xx a
 * shape GraphQL con `extensions.code` (`UPSTREAM_CLOUDFLARE_521`,
 * `UPSTREAM_5XX`, `UPSTREAM_NETWORK`, `UPSTREAM_NON_JSON`). Cuando
 * reconocemos esos códigos, mostramos una explicación clara en
 * español; en cualquier otro caso (errores lógicos, 4xx, etc.)
 * mostramos el mensaje crudo.
 */
function humanizeListError(err: Error): string {
  const code = (err as Error & { code?: string }).code;
  switch (code) {
    case "UPSTREAM_CLOUDFLARE_521":
      return "La PokéAPI está temporalmente caída (Cloudflare 521). El upstream está bloqueando activamente; esperaremos unos minutos antes de reintentar.";
    case "UPSTREAM_5XX":
      return "La PokéAPI está teniendo problemas. Lo intentaremos de nuevo en breve.";
    case "UPSTREAM_NETWORK":
      return "No se pudo contactar con la PokéAPI. Comprueba tu conexión.";
    case "UPSTREAM_NON_JSON":
      return "La PokéAPI devolvió una respuesta inesperada. Lo intentaremos de nuevo.";
    default:
      return err.message;
  }
}

/** Formatea milisegundos como `X:YY` (p.ej. `2:00` para 120 000 ms). */
function formatRetryAfter(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

