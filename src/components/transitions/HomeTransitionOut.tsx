"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useMusicFadeController } from "@/src/components/transitions/useMusicFade";

/**
 * Plan 04.2 + 04.3 — Orquestador visual de las transiciones de la
 * pantalla de inicio.
 *
 * Responsabilidades:
 *
 *   1. **Salida** (Home → Pokédex): cuando alguien dispara
 *      `homeTransitionBus.playExit()`, marca el contenedor con
 *      `data-leaving="true"` para activar la coreografía CSS del
 *      Plan 04.2 y hace fade-out de la música.
 *   2. **Entrada** (Pokédex → Home): al montarse, comprueba si el
 *      usuario acaba de pulsar "Volver al inicio" desde la Pokédex
 *      (señal: flag en `sessionStorage` que escribe
 *      `PokedexHomeButton`). Si es así, marca el contenedor con
 *      `data-arrival-from="pokedex"` para que el CSS ejecute la
 *      animación inversa de entrada. Tras la animación, limpia el
 *      flag para no repetirla en recargas.
 *
 * La secuencia de salida es:
 *
 *   1. El usuario dispara la transición (ENTER, click en PRESS START,
 *      click en zona neutra). El `HomeNavigationContext` (Plan 03.5)
 *      llama a `router.push('/pokedex')` directamente (su ruta nativa).
 *      En este momento queremos que la home YA esté animando su salida.
 *   2. El `router.push` se ejecuta sincrónicamente y desmontaría la
 *      home antes de que la animación arranque.
 *   3. Solución: `HomeNavigationContext` invoca
 *      `homeTransitionBus.playExit()` ANTES del push; el
 *      `HomeTransitionOut` ejecuta la coreografía y la promesa
 *      resuelve cuando la animación termina.
 *
 * Flujo completo:
 *   - `useEffect` del componente registra `playExit` en el bus.
 *   - `HomeNavigationContext.navigate()` llama a `bus.playExit()` y
 *     LUEGO hace el `router.push`.
 *   - Si no hay nadie registrado, `playExit()` resuelve inmediato
 *     → navegación nativa sin animación (modo degradado).
 *
 * Accesibilidad:
 *   - `aria-hidden` y `aria-busy` se aplican durante la salida.
 *   - `prefers-reduced-motion`: `data-leaving="instant"` /
 *     `data-arrival-from="pokedex-instant"` ocultan/muestran los
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

/** Clave de sessionStorage que avisa a la Home de que viene de la Pokédex. */
export const HOME_ARRIVAL_FROM_POKEDEX_KEY = "pokedex:home:arrival-from-pokedex";

/**
 * Marca en sessionStorage que la siguiente carga de la Home debe
 * ejecutar la animación de entrada viniendo de la Pokédex. Lo llama
 * el `PokedexHomeButton` antes de hacer `router.push("/")`.
 *
 * Devuelve `true` si se pudo escribir (cliente) o `false` si estamos
 * en SSR (no se puede marcar). El primer caso es el normal en
 * producción; el segundo solo se ve en tests de Node.
 */
export function markHomeArrivalFromPokedex(): boolean {
  if (typeof window === "undefined" || !window.sessionStorage) return false;
  try {
    window.sessionStorage.setItem(HOME_ARRIVAL_FROM_POKEDEX_KEY, "1");
    return true;
  } catch {
    // Modo privado sin sessionStorage o cuota agotada: caemos al
    // modo degradado (sin animación de entrada).
    return false;
  }
}

/**
 * Lee y consume (borra) el flag de `sessionStorage`. Lo llama el
 * `HomeTransitionOut` en su `useEffect` de montaje: si el flag
 * estaba activo, dispara la animación de entrada.
 */
function consumeHomeArrivalFromPokedex(): boolean {
  if (typeof window === "undefined" || !window.sessionStorage) return false;
  try {
    const v = window.sessionStorage.getItem(HOME_ARRIVAL_FROM_POKEDEX_KEY);
    if (v === "1") {
      window.sessionStorage.removeItem(HOME_ARRIVAL_FROM_POKEDEX_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Duración del fade out de música. Coincide con la animación más larga (~1s). */
const MUSIC_FADE_MS = 1000;
/** Margen extra tras el final del fade antes de resolver. */
const POST_ANIMATION_BUFFER_MS = 100;
/** Duración de la animación de entrada viniendo de la Pokédex (logo = 800ms). */
const ARRIVAL_ANIMATION_MS = 800;

export interface HomeTransitionOutProps {
  children: ReactNode;
  /** Para tests. */
  "data-testid"?: string;
}

export interface HomeTransitionOutHandle {
  exit(): Promise<void>;
}

/**
 * Estado de animación del contenedor:
 *   - `"false"`: estado normal (Home visible, sin transiciones).
 *   - `"true"`: salida en curso.
 *   - `"instant"`: salida instantánea (reduced-motion).
 *   - `"arriving"`: entrada en curso (venimos de la Pokédex).
 *   - `"arriving-instant"`: entrada instantánea (reduced-motion).
 */
type AnimationState =
  | "false"
  | "true"
  | "instant"
  | "arriving"
  | "arriving-instant";

export const HomeTransitionOut = forwardRef<
  HomeTransitionOutHandle,
  HomeTransitionOutProps
>(function HomeTransitionOut({ children, ...rest }, ref) {
  const [state, setState] = useState<AnimationState>("false");
  const inflightRef = useRef(false);
  const fade = useMusicFadeController();

  // Detección de prefers-reduced-motion (canónica React 19).
  const reduceMotion = usePrefersReducedMotionStatic();

  const playExit = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setState(reduceMotion ? "instant" : "true");

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

  // Al montar, comprobamos si llegamos desde la Pokédex. Si es así,
  // aplicamos `data-arrival-from="pokedex"` durante el primer paint
  // para que el CSS ejecute la animación de entrada. Tras la
  // duración de la animación, volvemos a `"false"`.
  useEffect(() => {
    const fromPokedex = consumeHomeArrivalFromPokedex();
    if (!fromPokedex) return;
    setState(reduceMotion ? "arriving-instant" : "arriving");
    const timer = setTimeout(
      () => setState("false"),
      reduceMotion ? 0 : ARRIVAL_ANIMATION_MS + POST_ANIMATION_BUFFER_MS,
    );
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  // Atributos derivados del estado para mantener el JSX limpio.
  // `data-leaving` se mantiene SIEMPRE presente (incluso en estado
  // normal con valor "false") para que los tests E2E puedan
  // inspeccionarlo de forma estable y los selectores CSS tengan
  // un valor definido al que aplicar la transición.
  const dataLeaving =
    state === "true" || state === "instant" ? state : "false";
  const dataArrivalFrom =
    state === "arriving"
      ? "pokedex"
      : state === "arriving-instant"
        ? "pokedex-instant"
        : undefined;
  const ariaHidden =
    state === "true" ||
    state === "instant" ||
    state === "arriving" ||
    state === "arriving-instant"
      ? "true"
      : undefined;
  const ariaBusy =
    state === "true" || state === "instant" ? "true" : undefined;

  return (
    <div
      {...rest}
      data-leaving={dataLeaving}
      data-arrival-from={dataArrivalFrom}
      aria-hidden={ariaHidden}
      aria-busy={ariaBusy}
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
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Sólo para tests. */
export function _resetHomeTransitionBusForTests(): void {
  currentListener = null;
}

/** Sólo para tests: limpia la marca de "venimos de la Pokédex". */
export function _clearHomeArrivalFromPokedexForTests(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(HOME_ARRIVAL_FROM_POKEDEX_KEY);
  } catch {
    /* noop */
  }
}