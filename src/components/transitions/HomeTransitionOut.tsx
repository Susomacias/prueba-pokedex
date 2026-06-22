"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMusicFadeController } from "@/src/components/transitions/useMusicFade";

/**
 * Plan 04.2 — Orquestador visual de la salida de la pantalla de inicio.
 *
 * Componente cliente que envuelve el contenido estático del inicio y
 * gestiona el `data-leaving` que activa la coreografía CSS del Plan
 * 04.2.
 *
 * La secuencia es:
 *
 *   1. El usuario dispara la transición (ENTER, click en PRESS START,
 *      click en zona neutra). El `HomeNavigationContext` (Plan 03.5)
 *      llama a `router.push('/pokedex')` directamente (su ruta nativa).
 *      En este momento queremos que la home YA esté animando su salida.
 *
 *   2. El problema: el `router.push` se ejecuta sincrónicamente y
 *      desmonta la home antes de que la animación arranque.
 *
 *   3. Solución: el `HomeTransitionOut` se conecta a un
 *      `HomeTransitionEventBus` (singleton del módulo) que expone
 *      `subscribeToPlayExit(cb)`. Cuando `HomeNavigationContext`
 *      detecta que la home está montada, dispara el evento ANTES de
 *      hacer el push. Si nadie escucha (tests sin provider), el push
 *      se ejecuta sin animación (degradación elegante).
 *
 * Flujo completo:
 *   - `useEffect` del componente registra `playExit` en el bus.
 *   - `HomeNavigationContext.navigate()` llama a `bus.playExit()`
 *     (que resuelve cuando la animación termina) y LUEGO hace el
 *     `router.push`.
 *   - Si no hay nadie registrado, `playExit()` resuelve inmediato
 *     → la navegación es nativa, sin animación (modo degradado).
 *
 * Diseño alternativo que consideramos y descartamos:
 *   - `forwardRef` + `useImperativeHandle` → el `HomeNavigationContext`
 *     necesitaría acceso al ref del `<HomeShell>` y la cadena de
 *     providers se complica.
 *
 * Accesibilidad:
 *   - `aria-hidden` y `aria-busy` se aplican durante la salida.
 *   - `prefers-reduced-motion`: `data-leaving="instant"` oculta los
 *     elementos sin animar (lo gestiona el CSS global).
 */

export interface HomeTransitionEventBus {
  /**
   * Suscribe una función de salida. Se llama cada vez que alguien
   * dispara `playExit()` y debe resolver con una promesa.
   * Devuelve una función de cleanup.
   */
  subscribe(playExit: () => Promise<void>): () => void;
  /**
   * Dispara la salida: ejecuta el último `playExit` registrado y
   * devuelve su promesa. Si no hay nadie registrado, resuelve
   * inmediatamente (degradación elegante).
   */
  playExit(): Promise<void>;
  /**
   * Sólo para tests: indica si hay un consumidor registrado.
   */
  hasSubscriber(): boolean;
}

let currentListener: (() => Promise<void>) | null = null;

export const homeTransitionBus: HomeTransitionEventBus = {
  subscribe(playExit) {
    currentListener = playExit;
    return () => {
      if (currentListener === playExit) currentListener = null;
    };
  },
  async playExit() {
    if (currentListener) await currentListener();
  },
  hasSubscriber() {
    return currentListener !== null;
  },
};

/** Duración del fade out de música. Coincide con la animación más larga (~1s). */
const MUSIC_FADE_MS = 1000;
/** Margen extra tras el final del fade antes de resolver. */
const POST_ANIMATION_BUFFER_MS = 100;

export interface HomeTransitionOutProps {
  children: ReactNode;
  /** Para tests. */
  "data-testid"?: string;
}

export interface HomeTransitionOutHandle {
  exit(): Promise<void>;
}

export const HomeTransitionOut = forwardRef<
  HomeTransitionOutHandle,
  HomeTransitionOutProps
>(function HomeTransitionOut({ children, ...rest }, ref) {
  const [leaving, setLeaving] = useState<"false" | "true" | "instant">(
    "false",
  );
  const inflightRef = useRef(false);
  const fade = useMusicFadeController();

  // Detección de prefers-reduced-motion (canónica React 19).
  const reduceMotion = usePrefersReducedMotionStatic();

  const playExit = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLeaving(reduceMotion ? "instant" : "true");

    const music = fade.fadeOut(MUSIC_FADE_MS);
    const wait = reduceMotion
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          setTimeout(resolve, MUSIC_FADE_MS + POST_ANIMATION_BUFFER_MS),
        );
    await Promise.all([music, wait]);
  }, [fade, reduceMotion]);

  // Handle imperativo para tests.
  useImperativeHandle(
    ref,
    (): HomeTransitionOutHandle => ({
      exit: playExit,
    }),
    [playExit],
  );

  // Registramos/des-registramos del bus global. Importante: cleanup
  // para que un test que monte el componente no contamine al siguiente.
  useEffect(() => {
    return homeTransitionBus.subscribe(playExit);
  }, [playExit]);

  return (
    <div
      {...rest}
      data-leaving={leaving}
      aria-hidden={leaving !== "false" ? "true" : undefined}
      aria-busy={leaving !== "false" ? "true" : undefined}
      className="contents"
    >
      {children}
    </div>
  );
});

/** Hook estático de prefers-reduced-motion con `useSyncExternalStore`. */
function usePrefersReducedMotionStatic(): boolean {
  const subscribe = (cb: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return () => undefined;
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
  const getSnapshot = () => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };
  const getServerSnapshot = () => false;
  // Importación dinámica diferida para no penalizar el bundle en SSR.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useSyncExternalStore } = require("react") as typeof import("react");
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Sólo para tests. */
export function _resetHomeTransitionBusForTests(): void {
  currentListener = null;
}