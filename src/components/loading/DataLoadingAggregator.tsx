"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPokemonDetail } from "@/src/lib/pokemon/cachedPokemonApi";
import { usePokedexPage } from "@/src/components/pokedex/PokedexPageProvider";
import { LoadingPikachu } from "./LoadingPikachu";

/**
 * Plan 06.7 — `DataLoadingAggregator`: agrega el estado de carga
 * de las fuentes de datos de la Pokédex que aún no tienen
 * spinner local dedicado y muestra un `LoadingPikachu` discreto
 * en consecuencia.
 *
 * Fuentes rastreadas:
 *
 *  1. **Detalle del pokemon seleccionado**. Cuando hay un pokemon
 *     activo (`usePokedexPage().selectedName != null`), el
 *     aggregator dispara su propio fetch del detalle vía
 *     `fetchPokemonDetail` y trackea un mini estado local
 *     (`loading` | `ready`). Esto es COMPLEMENTARIO al
 *     `CarouselController` que ya hace su propio fetch (la
 *     caché HTTP de Next.js + `React.cache` en servidor
 *     deduplica en la mayoría de los casos; en cliente la
 *     PokeAPI soporta peticiones duplicadas y el efecto es
 *     invisible gracias al spinner local del carrusel + este
 *     pikachu global).
 *
 * Fuentes NO rastreadas aquí (con justificación):
 *
 *  - **Lista paginada**: `PokemonList` ya tiene su spinner
 *    local (`aria-busy` en el contenedor + spinner inferior).
 *    Invocar `useFilteredPokemonList` aquí dispararía un
 *    segundo fetch paralelo. La consolidación con un store
 *    externo (tipo `useFilterOptions`) llegará en el Plan 07
 *    cuando se monten los dropdowns.
 *
 *  - **Opciones de filtros**: cada consumidor
 *    (`FilterDropdownsSlot`, Plan 07) usará
 *    `useFilterOptions(key)`, que ya expone su propio estado
 *    de loading. Como en esta fase aún no hay consumidores
 *    reales, NO forzamos fetches especulativos desde el
 *    aggregator.
 *
 * Decisión sobre dónde montarlo:
 *
 *  - Se monta una sola vez en `PokedexOverlay` (justo después
 *    del `PokedexShell`). De este modo:
 *      · Está disponible durante TODA la vida de la Pokédex
 *        (incluyendo la primera carga de filtros).
 *      · Su árbol React padre (`pokedex-view`) le pasa el
 *        `selectedName` a través del `PokedexPageProvider`.
 *      · Se posiciona de forma absoluta en la esquina
 *        inferior-derecha, sin tapar contenido del shell.
 *
 * Tiempo mínimo visible:
 *
 *  - Cuando el fetch termina muy rápido (caso típico: la
 *    caché de Next.js ya tiene el detalle de un pokemon que
 *    visitamos hace poco), el pikachu se desmontaría antes
 *    de que el usuario pudiera verlo. Para evitar esa
 *    "animación invisible", el aggregator garantiza un
 *    `MIN_VISIBLE_MS` (2400 ms = duración de un ciclo de
 *    animación del LoadingPikachu) de presencia en pantalla.
 *    Así, si la PokeAPI responde en 50 ms, el pikachu
 *    permanece visible desde t=0 hasta t=2400 ms (ciclo
 *    completo) y luego se desmonta. Si tarda más, no añade
 *    retardo artificial: la animación se ve completa durante
 *    toda la carga real.
 *
 *  - Esto NO contradice el contrato del `LoadingPikachu`
 *    ("la animación SIEMPRE se muestra hasta el final"):
 *    ambos coinciden en que el pikachu completa su ciclo
 *    antes de desaparecer. El `MIN_VISIBLE_MS` garantiza
 *    que HAYA al menos un ciclo que completar; el componente
 *    garantiza que el ciclo en curso se ve entero.
 */

const MIN_VISIBLE_MS = 2400;

export interface DataLoadingAggregatorProps {
  /**
   * Si se pasa, se usa este nombre en lugar de
   * `usePokedexPage().selectedName`. Útil para tests y para
   * escenarios donde el aggregator se monta en un contexto
   * que NO tiene el `PokedexPageProvider`.
   */
  pokemonNameOverride?: string | null;
  /**
   * Tiempo mínimo que el pikachu permanece visible una vez
   * arrancado. Por defecto `MIN_VISIBLE_MS` (2400 ms =
   * duración de un ciclo de animación). Útil para tests que
   * quieren acelerar este tiempo.
   */
  minVisibleMs?: number;
}

export function DataLoadingAggregator({
  pokemonNameOverride,
  minVisibleMs = MIN_VISIBLE_MS,
}: DataLoadingAggregatorProps = {}) {
  const { selectedName: contextSelectedName } = usePokedexPage();
  const selectedName = pokemonNameOverride ?? contextSelectedName;

  // `isReady` indica que el fetch del detalle para el `selectedName`
  // actual ha terminado (con éxito o error) Y se ha cumplido el
  // tiempo mínimo visible. Inicialmente `true` cuando NO hay
  // pokemon (no hay nada que cargar).
  const [isReady, setIsReady] = useState<boolean>(selectedName == null);

  // Sincronizamos `isReady` con `selectedName` durante el render
  // (patrón "store previous value"). Esto garantiza que el
  // pikachu se monte EN EL MISMO FRAME que el `selectedName`
  // cambia a un pokemon, sin esperar al `useEffect`. Si lo
  // dejáramos para el effect, habría un frame en el que el
  // pikachu aún no se ha montado pero la carga ya empezó
  // (parpadeo perceptible cuando la API responde en ms).
  const [prevSelectedName, setPrevSelectedName] = useState(selectedName);
  if (prevSelectedName !== selectedName) {
    setPrevSelectedName(selectedName);
    if (selectedName == null) {
      // Sin pokemon: nada que cargar.
      setIsReady(true);
    } else {
      // Nuevo pokemon: arranca la carga → pikachu se monta.
      setIsReady(false);
    }
  }

  // Refs transitorios:
  // - `cancelledRef`: cancela el fetch + timer pendiente cuando
  //   cambia `selectedName`. Sin esto, dos cargas rápidas podrían
  //   pisarse (la segunda llega antes que la primera).
  // - `readyTimerRef`: timer que retrasa `setIsReady(true)` para
  //   garantizar `minVisibleMs` de presencia visible.
  // - `startedAtRef`: timestamp del inicio de la carga actual;
  //   se consulta en el callback del fetch para calcular cuánto
  //   tiempo falta hasta `minVisibleMs`.
  const cancelledRef = useRef<boolean>(false);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    // Cancelamos cualquier timer pendiente del pokemon anterior.
    cancelledRef.current = false;
    if (readyTimerRef.current) {
      clearTimeout(readyTimerRef.current);
      readyTimerRef.current = null;
    }

    if (!selectedName) {
      // Sin pokemon: nada que cargar. (El "store previous value"
      // arriba ya marcó isReady=true en el mismo frame; aquí no
      // necesitamos hacer nada.)
      return;
    }

    // Nuevo pokemon: arrancamos la carga.
    const startedAt = Date.now();
    startedAtRef.current = startedAt;

    (async () => {
      try {
        await fetchPokemonDetail(selectedName);
        if (cancelledRef.current) return;
        // `null` también cuenta como "ready" (pokemon no
        // encontrado o endpoint caído): no mantenemos el
        // spinner infinito en ese caso. El `CarouselController`
        // ya muestra su propio error si aplica.
        const elapsed = Date.now() - startedAt;
        const remaining = minVisibleMs - elapsed;
        if (remaining > 0) {
          readyTimerRef.current = setTimeout(() => {
            readyTimerRef.current = null;
            if (cancelledRef.current) return;
            setIsReady(true);
          }, remaining);
        } else {
          setIsReady(true);
        }
      } catch (err) {
        if (cancelledRef.current) return;
        void err;
        // Error de red → también dejamos de mostrar el pikachu
        // (el `CarouselController` ya tendrá su `role="alert"`).
        setIsReady(true);
      }
    })();

    return () => {
      cancelledRef.current = true;
      if (readyTimerRef.current) {
        clearTimeout(readyTimerRef.current);
        readyTimerRef.current = null;
      }
    };
  }, [selectedName, minVisibleMs]);

  const isLoading = selectedName != null && !isReady;

  return (
    <div
      data-testid="data-loading-aggregator"
      data-loading={isLoading ? "true" : "false"}
      style={{ display: "contents" }}
    >
      <LoadingPikachu
        loading={isLoading}
        className="data-loading-aggregator__pikachu"
        style={{
          position: "fixed",
          left: "12px",
          top: "12px",
          pointerEvents: "none",
          zIndex: 60,
        }}
      />
    </div>
  );
}
