"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useFiltersContext } from "@/src/components/filters/FiltersProvider";
import { useNavigation } from "@/src/hooks/useNavigation";
import { applyFiltersToList } from "@/src/lib/pokemon/cachedPokemonApi";
import type { Filters } from "@/src/lib/filters/types";
import { POKEMON_LIST_PAGE_SIZE } from "@/src/lib/types/pokemon";
import type { PokemonListItem } from "@/src/lib/types/pokemon";
import { PokemonListCard } from "./PokemonListCard";
import "./pokemon-list.css";

/**
 * Plan 06.1 — `PokemonList`: lista virtualizada con
 * `@tanstack/react-virtual` y ventana deslizante de páginas en
 * memoria (fetch bajo demanda por rango de índices).
 *
 * Estrategia:
 *  - El virtualizador (`useVirtualizer`) conoce el `count` total de
 *    pokemon. Renderiza **únicamente los items visibles** en el DOM
 *    (típicamente 10–20) y les asigna `position: absolute` con
 *    `top: ${start}px` y `height: ${size}px`. Esto significa:
 *      · El `scrollHeight` total del contenedor es estable y
 *        coincide con la suma de las alturas estimadas de los N
 *        items virtualizados. El usuario **nunca llega al borde
 *        superior ni inferior** de una lista finita (puede hacer
 *        scroll continuo y solo verá "final de la lista" cuando
 *        realmente sea el último pokemon).
 *      · Cuando un item entra o sale del viewport, simplemente se
 *        monta o desmonta del DOM — pero su posición está
 *        determinada por el virtualizador, no por el flujo del
 *        documento. Los items que el usuario está viendo no
 *        "saltan" porque la posición de los visibles no cambia.
 *  - Las páginas de 30 items se mantienen en un `Map<pageIndex, Page>`
 *    en memoria. Una página se carga cuando el virtualizador pide
 *    un `index` cuya página aún no está en el mapa; se descarta
 *    cuando está fuera del rango `[firstVisiblePage - 1,
 *    lastVisiblePage + 1]` (con un colchón de 1 página a cada
 *    lado). Esto da un máximo de ~5 páginas en memoria
 *    (≈150 items), muy lejos del límite pero suficiente para
 *    que el scroll no sufra "pop-in".
 *  - Al montar (o cambiar filtros) se resetea el estado y se
 *    cargan las dos primeras páginas (`pageIndex 0` y `1`) en
 *    paralelo, como en el comportamiento previo.
 *  - Si la API indica `single=true` (un único resultado bajo los
 *    filtros activos), la lista NO se monta: la UI debe navegar a
 *    la ficha del pokemon directamente (gestiona el caller).
 *  - Al pulsar una card se hace `router.push("/pokemon/<name>?
 *    <filtros>")` preservando los filtros activos en la URL.
 *
 * Accesibilidad:
 *  - El contenedor es un `role="listbox"` con `aria-label`.
 *  - Cada card es un `<button>` (Plan 06.2); la navegación por
 *    teclado funciona nativamente.
 *  - El virtualizador no afecta al árbol de accesibilidad: solo
 *    controla qué nodos están en el DOM en cada momento.
 */

interface Page {
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

  const filterKey = useMemo(() => stableKey(filters), [filters]);

  // Mapa de páginas cargadas. La clave es el pageIndex (0, 1, 2, ...)
  // y el valor es la página correspondiente. Mantener como `Map`
  // permite insertar/eliminar en O(1) y consultar por índice de forma
  // directa al renderizar los items virtuales.
  const [pages, setPages] = useState<Map<number, Page>>(new Map());
  const [single, setSingle] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // `loadedAll` indica que ya hemos llegado al final de la lista y no
  // hay más páginas por cargar. Lo usamos para evitar fetches inútiles
  // y para fijar el `count` del virtualizador.
  const [loadedAll, setLoadedAll] = useState(false);
  // `loading` es el spinner "estético" — solo se muestra durante la
  // carga inicial. Los fetchs en background no lo activan para no
  // molestar al usuario mientras scrollea.
  const [loading, setLoading] = useState(true);

  // Ticket para cancelar fetches en vuelo cuando cambian los filtros.
  const cancelledRef = useRef(false);
  const inFlightRef = useRef(0);
  // Páginas actualmente en proceso de fetch. La precarga inicial Y el
  // efecto de carga bajo demanda lo consultan/mutten para evitar
  // fetches duplicados. Lo declaramos antes de los useEffects que lo
  // usan.
  const inFlightPagesRef = useRef<Set<number>>(new Set());

  // Refs del scroll. La virtualización mide el contenedor padre; la
  // lista raíz actúa como `getScrollElement`.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Ref al callback de fetchPage más reciente (mirror del patrón de
  // PokemonList previo) para que el callback del virtualizador
  // siempre use la versión actualizada de `filters`.
  const fetchPageRef = useRef<(pageIndex: number) => Promise<Page>>(
    async () => {
      throw new Error("fetchPage not initialized");
    },
  );

  /* ---------------------------------------------------------------- *
   * Fetch de páginas
   * ---------------------------------------------------------------- */

  const fetchPage = useCallback(
    async (pageIndex: number): Promise<Page> => {
      const offset = pageIndex * POKEMON_LIST_PAGE_SIZE;
      const result = await applyFiltersToList(filters, offset, undefined);
      return {
        items: result.items,
        nextOffset: result.nextOffset,
        total: result.total,
        single: result.single,
      };
    },
    [filters],
  );

  // Mantenemos el ref espejo apuntando al fetchPage más reciente.
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);

  /* ---------------------------------------------------------------- *
   * Carga inicial: páginas 0 y 1 en paralelo al montar o cambiar
   * filtros.
   * ----------------------------------------------------------------
   *
   * La precarga se hace usando el MISMO `inFlightPagesRef` que el
   * efecto de carga bajo demanda (declarado más abajo). Esto evita
   * duplicados cuando el virtualizador pide la página 0 antes de
   * que la precarga haya escrito en `pages`.
   */

  useEffect(() => {
    const ticket = ++inFlightRef.current;
    cancelledRef.current = false;
    setPages(new Map());
    setSingle(false);
    setError(null);
    setLoadedAll(false);
    setLoading(true);
    void (async () => {
      try {
        // Marcamos la página 0 como en vuelo ANTES de hacer el
        // fetch para que el efecto de carga bajo demanda no la
        // duplique si se dispara mientras esperamos la respuesta.
        inFlightPagesRef.current.add(0);
        const first = await fetchPage(0);
        inFlightPagesRef.current.delete(0);
        if (cancelledRef.current || ticket !== inFlightRef.current) return;
        setSingle(first.single);
        if (first.single) {
          setPages(new Map([[0, first]]));
          setLoading(false);
          return;
        }
        const next = new Map<number, Page>([[0, first]]);
        if (first.nextOffset === null) {
          setLoadedAll(true);
          setPages(next);
          setLoading(false);
          return;
        }
        // Si hay más páginas, precargamos la página 1 en paralelo.
        inFlightPagesRef.current.add(1);
        const second = await fetchPage(1).catch((err) => {
          inFlightPagesRef.current.delete(1);
          throw err;
        });
        inFlightPagesRef.current.delete(1);
        if (cancelledRef.current || ticket !== inFlightRef.current) return;
        next.set(1, second);
        setPages(next);
        if (second.nextOffset === null) setLoadedAll(true);
        setLoading(false);
      } catch (err) {
        inFlightPagesRef.current.delete(0);
        if (cancelledRef.current || ticket !== inFlightRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    })();
    return () => {
      cancelledRef.current = true;
      // Limpiamos las páginas en vuelo al desmontar / cambiar filtros
      // para que el siguiente mount empiece desde cero.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      inFlightPagesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  /* ---------------------------------------------------------------- *
   * Virtualizador
   * ---------------------------------------------------------------- *
   *
   * `count`: número total de items virtualizados. Lo derivamos del
   * `total` de la primera página si está disponible; si no, usamos
   * un valor "alto pero finito" que se actualizará cuando llegue la
   * respuesta. La gracia es que el usuario puede hacer scroll
   * libremente mientras carga — el virtualizador reserva espacio
   * virtual para todos los items.
   *
   * `getScrollElement`: el contenedor de scroll raíz.
   *
   * `estimateSize`: 70px ≈ 64px (min-height de la card) + 6px (gap).
   * Lo medimos dinámicamente con `measureElement` para que las cards
   * con 4 chips no se corten y para que la posición de scroll sea
   * exacta al cambiar de tamaño.
   */
  const totalCount = useMemo(() => {
    const firstPage = pages.get(0);
    if (firstPage?.total != null) return firstPage.total;
    // Si aún no sabemos el total, usamos la suma de items cargados
    // + 1 página extra como cota inferior que permite al usuario
    // hacer scroll mientras llegan las respuestas. Si luego
    // `loadedAll` es true y no hay más items, el virtualizador
    // simplemente no renderizará items fuera de rango.
    if (loadedAll) {
      let total = 0;
      for (const p of pages.values()) total += p.items.length;
      return total;
    }
    let total = 0;
    for (const p of pages.values()) total += p.items.length;
    return total + POKEMON_LIST_PAGE_SIZE;
  }, [pages, loadedAll]);

  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 70,
    overscan: 6,
    // `measureElement` se llama cada vez que un item se monta (o
    // cambia de tamaño) para devolver su altura real. Lo usamos para
    // que las cards con muchos chips no se corten y el scroll sea
    // exacto.
    measureElement: (el) =>
      el?.getBoundingClientRect().height ?? 70,
  });

  const virtualItems = virtualizer.getVirtualItems();

  /* ---------------------------------------------------------------- *
   * Carga bajo demanda de páginas según los índices visibles
   * ---------------------------------------------------------------- *
   *
   * Recorremos los `virtualItems` y, para cada índice cuya página
   * no esté en `pages` Y no esté ya en vuelo, lanzamos un fetch.
   *
   * El set `inFlightPagesRef` evita disparar el mismo fetch dos
   * veces (importante porque los `virtualItems` se recalculan en
   * cada render con nuevos rangos visibles).
   *
   * Para evitar avalanchas de fetches cuando el rango visible es
   * muy ancho (p.ej. si el virtualizador está reportando todo el
   * rango porque `clientHeight` aún no se ha medido), limitamos a
   * UNA petición en vuelo simultánea y elegimos la página con el
   * pageIndex más cercano al rango visible (el menor que falte
   * si vamos hacia adelante, o el mayor que falte si vamos hacia
   * atrás). El efecto se vuelve a disparar cuando `pages` cambie
   * (al llegar una respuesta) y continuará pidiendo páginas hasta
   * cubrir el rango visible.
   */

  useEffect(() => {
    if (single || loadedAll) return;
    if (inFlightPagesRef.current.size > 0) return;
    const missing = new Set<number>();
    for (const v of virtualItems) {
      const pageIndex = Math.floor(v.index / POKEMON_LIST_PAGE_SIZE);
      if (!pages.has(pageIndex)) missing.add(pageIndex);
    }
    if (missing.size === 0) return;
    const target = Math.min(...missing);
    inFlightPagesRef.current.add(target);
    // Ref local al effect para señalizar cancelación al async.
    const cancelledRef = { current: false };
    void (async () => {
      try {
        const result = await fetchPageRef.current(target);
        if (cancelledRef.current) return;
        inFlightPagesRef.current.delete(target);
        setPages((prev) => {
          const next = new Map(prev);
          next.set(target, result);
          return next;
        });
        if (result.nextOffset === null) setLoadedAll(true);
      } catch (err) {
        if (cancelledRef.current) return;
        inFlightPagesRef.current.delete(target);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, [virtualItems, pages, single, loadedAll]);

  /* ---------------------------------------------------------------- *
   * Recolección de páginas lejanas
   * ---------------------------------------------------------------- *
   *
   * Cuando el usuario está mirando las páginas `[N, N+1]` y ya hay
   * datos en la página `N-1`, podemos descartar `N-1` para liberar
   * memoria. Mantenemos un colchón de ±1 página a cada lado del
   * rango visible — así el usuario nunca verá un hueco al hacer
   * scroll rápido hacia atrás o hacia adelante.
   */
  useEffect(() => {
    if (pages.size === 0) return;
    const visiblePages = new Set<number>();
    for (const v of virtualItems) {
      visiblePages.add(Math.floor(v.index / POKEMON_LIST_PAGE_SIZE));
    }
    if (visiblePages.size === 0) return;
    const minVisible = Math.min(...visiblePages);
    const maxVisible = Math.max(...visiblePages);
    const keepMin = minVisible - 1;
    const keepMax = maxVisible + 1;
    let changed = false;
    const next = new Map(pages);
    for (const key of pages.keys()) {
      if (key < keepMin || key > keepMax) {
        next.delete(key);
        changed = true;
      }
    }
    if (changed) setPages(next);
  }, [virtualItems, pages]);

  /* ---------------------------------------------------------------- *
   * Selección / navegación
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

  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={scrollRef}
      data-testid="pokemon-list"
      role="listbox"
      aria-label="Lista de Pokémon"
      style={containerStyle}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${totalSize}px`,
        }}
      >
        {virtualItems.map((vrow) => {
          const pageIndex = Math.floor(vrow.index / POKEMON_LIST_PAGE_SIZE);
          const itemIndex = vrow.index % POKEMON_LIST_PAGE_SIZE;
          const page = pages.get(pageIndex);
          const item = page?.items[itemIndex];
          if (!item) {
            // Página aún no cargada: renderizamos un placeholder
            // invisible del tamaño exacto para mantener la posición
            // del virtualizador estable (sin "saltos" cuando llegue
            // la respuesta).
            return (
              <div
                key={vrow.key}
                data-index={vrow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vrow.start}px)`,
                  height: `${vrow.size}px`,
                }}
                aria-hidden="true"
              />
            );
          }
          return (
            <div
              key={vrow.key}
              data-index={vrow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vrow.start}px)`,
              }}
            >
              <PokemonListCard
                item={item}
                index={vrow.index + 1}
                onSelect={onSelect}
                selectedName={selectedName}
              />
            </div>
          );
        })}
      </div>

      {loading ? (
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
 * Helpers
 * ------------------------------------------------------------------------- */

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflowY: "auto",
  overflowX: "hidden",
  padding: "8px",
  scrollbarWidth: "thin",
  scrollbarColor: "#126CA3 transparent",
};

const loadingStyle: CSSProperties = {
  position: "absolute",
  bottom: "12px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  border: "3px solid rgba(18, 108, 163, 0.25)",
  borderTopColor: "#FF9203",
  animation: "pokedex-list-spin 0.8s linear infinite",
  pointerEvents: "none",
};

const errorStyle: CSSProperties = {
  position: "absolute",
  bottom: "8px",
  left: "8px",
  right: "8px",
  color: "#FF6363",
  fontSize: "10px",
  padding: "8px",
  textAlign: "center",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  borderRadius: "4px",
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
