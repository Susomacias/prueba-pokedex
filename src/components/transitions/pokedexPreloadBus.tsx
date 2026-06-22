"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Plan 04 (precarga de la Pokédex en la Home) — Bus de estado.
 *
 * El borrador del proyecto (líneas 110-118 del `Borrador_Pokedex.md`)
 * pide que la Pokédex ABIERTA esté "precargada con la lista en la
 * parte inferior fuera de la pantalla" mientras el usuario está en la
 * Home, de modo que cuando se dispare la transición de salida la
 * carcasa suba al centro de la pantalla sin glitches ni cargas
 * perceptibles.
 *
 * Implementamos esta precarga con un `PokedexPreloadPortal` que vive
 * dentro del árbol de la Home (Client Component) y monta la Pokédex
 * real en posición `translateY(100%)` con `visibility: hidden`. Mientras
 * ese portal está montando y pidiendo los datos al server, expone su
 * estado a través de este bus singleton.
 *
 * ¿Por qué un bus global y no un Context?
 *   - El portal se monta dentro del árbol de la Home, pero el
 *     consumidor que necesita "saber si la Pokédex está lista para
 *     transicionar" es el `HomeTransitionOut` (que vive varios niveles
 *     por encima). Compartir el estado por Context obligaría a montar
 *     el Provider en `HomeShell` y a propagar el valor por props/
 *     re-renders a quien lo necesite.
 *   - El bus, en cambio, se actualiza in-place (un `Set<listener>` +
 *     un `status` actual). El hook `usePokedexPreloadStatus` usa
 *     `useSyncExternalStore` (canónico React 19) para suscribirse y
 *     re-renderizar al cambiar.
 *
 * Estados posibles:
 *   - `"idle"`: aún no se ha montado el portal. Es el estado inicial.
 *   - `"loading"`: el portal se está montando y pidiendo datos.
 *   - `"ready"`: la Pokédex y sus datos están cargados. La transición
 *     puede dispararse y la carcasa subirá al centro sin parpadeo.
 */

export type PokedexPreloadStatus = "idle" | "loading" | "ready";

export type PokedexPreloadReporter = (status: PokedexPreloadStatus) => void;
export type PokedexPreloadListener = (status: PokedexPreloadStatus) => void;

export interface PokedexPreloadBus {
  /** Estado actual (lectura síncrona, útil para tests). */
  getStatus(): PokedexPreloadStatus;
  /** Cambia el estado y notifica a todos los listeners. */
  reportStatus(status: PokedexPreloadStatus): void;
  /** Suscribe un listener al cambio de estado. */
  subscribe(listener: PokedexPreloadListener): () => void;
  /** `true` solo si hay listeners Y el estado es "ready". */
  hasReadySubscriber(): boolean;
  /** Hook React que devuelve el estado actual y re-renderiza al cambiar. */
  useStatus(): PokedexPreloadStatus;
  /** Solo para tests: resetea el bus a estado inicial. */
  _resetForTests(): void;
}

let currentStatus: PokedexPreloadStatus = "idle";
const listeners = new Set<PokedexPreloadListener>();

function notifyAll() {
  for (const l of listeners) {
    try {
      l(currentStatus);
    } catch {
      // Nunca dejamos que un listener defectuoso tumbe el bus.
    }
  }
}

function reportStatus(status: PokedexPreloadStatus): void {
  if (currentStatus === status) return;
  currentStatus = status;
  notifyAll();
}

function subscribe(listener: PokedexPreloadListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getStatus(): PokedexPreloadStatus {
  return currentStatus;
}

function hasReadySubscriber(): boolean {
  return currentStatus === "ready" && listeners.size > 0;
}

const PokedexPreloadContext = createContext<PokedexPreloadBus | null>(null);

function useStatus(): PokedexPreloadStatus {
  // Suscripción canónica a un store externo vía useSyncExternalStore.
  // El snapshot es la variable `currentStatus` del módulo: como es un
  // `string`, su identidad es estable y React no provoca renders
  // espurios.
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => currentStatus,
    () => "idle" as PokedexPreloadStatus,
  );
}

/**
 * Implementación "objeto-método" para que el bus pueda usarse tanto
 * desde React (vía hook) como desde código no-React (tests, portal,
 * etc.) sin tener que pasar por Context.
 */
export const pokedexPreloadBus: PokedexPreloadBus = {
  getStatus,
  reportStatus,
  subscribe,
  hasReadySubscriber,
  useStatus,
  _resetForTests() {
    currentStatus = "idle";
    listeners.clear();
  },
};

/**
 * Provider opcional: si necesitas usar el bus vía Context (p.ej. para
 * pasar un bus mockeado en tests), monta este Provider. Si NO está
 * montado, los hooks consumidores caen al singleton global.
 */
export interface PokedexPreloadProviderProps {
  children: ReactNode;
  bus?: PokedexPreloadBus;
}

export function PokedexPreloadProvider({
  children,
  bus,
}: PokedexPreloadProviderProps) {
  const value = bus ?? pokedexPreloadBus;
  return (
    <PokedexPreloadContext.Provider value={value}>
      {children}
    </PokedexPreloadContext.Provider>
  );
}

/**
 * Hook que devuelve el bus desde Context si está disponible, o el
 * singleton global si no. Útil para componentes que quieran aceptar
 * un bus inyectado (tests) sin acoplarse al Provider.
 */
export function useOptionalPokedexPreloadBus(): PokedexPreloadBus {
  const ctx = useContext(PokedexPreloadContext);
  return ctx ?? pokedexPreloadBus;
}
