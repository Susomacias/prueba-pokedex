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
import {
  getHomePreloadSources,
  preloadSources,
} from "@/src/components/transitions/assetPreloader";

/**
 * Plan 04.3 — Orquestador visual de la salida de la Pokédex.
 *
 * Componente espejo de `HomeTransitionOut` (Plan 04.2) para la
 * Pokédex. Se registra en el `pokedexTransitionBus` y aplica
 * `data-leaving` al contenedor cuando alguien dispara la salida.
 *
 * Secuencia:
 *   1. Botón "Volver al inicio" llama al bus
 *      `pokedexTransitionBus.playExit()`.
 *   2. El componente marca `data-leaving="true"` y la CSS global
 *      hace que la carcasa baje fuera de pantalla con fade out.
 *   3. Si la música estaba activa (vía `useSoundMusic().isPlaying`),
 *      `useMusicFadeController.fadeIn(0.6, 600ms)` sube el volumen
 *      desde 0 (silenciado por la transición 04.2) hasta el target.
 *   4. EN PARALELO: precarga los assets de la pantalla de inicio
 *      (logo, ash, pokedex_cerrada, los 10 pokemon, tileFondo) para
 *      que cuando lleguemos a `/`, `HomeTransitionOut` encuentre
 *      los assets cacheados y pueda ejecutar la animación de
 *      entrada (`home-enter-*`) sin parpadeos.
 *   5. Al terminar, el bus devuelve la promesa resuelta y el caller
 *      hace `router.push('/')`.
 *
 * El borrador exige "Hay que cargar los elementos y asegurarse de
 * que estén cargados antes de empezar la animación" (líneas
 * 120-122 del Borrador_Pokedex.md). Lo garantizamos con
 * `preloadSources(getHomePreloadSources())` que resuelve cuando
 * TODAS las URLs estén listas (o son ya cacheadas).
 *
 * `prefers-reduced-motion`:
 *   - `data-leaving="instant"`: la carcasa desaparece sin animar y
 *     la música sube sin fade (o se queda en su valor actual).
 *
 * Accesibilidad:
 *   - `aria-hidden` y `aria-busy` se aplican durante la salida.
 *   - El botón "Volver" expone `aria-label` claro.
 */

export interface PokedexTransitionEventBus {
  subscribe(playExit: () => Promise<void>): () => void;
  playExit(): Promise<void>;
  hasSubscriber(): boolean;
}

let currentListener: (() => Promise<void>) | null = null;

export const pokedexTransitionBus: PokedexTransitionEventBus = {
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

/** Duración del fade in de música al volver. */
const MUSIC_FADE_IN_MS = 600;
/** Volumen objetivo al volver (igual al que se usa al iniciar música). */
const MUSIC_TARGET_VOLUME = 0.6;
/** Buffer tras la animación CSS para garantizar que termina antes del push. */
const POST_ANIMATION_BUFFER_MS = 100;

export interface PokedexTransitionOutProps {
  children: ReactNode;
  /** Para tests. */
  "data-testid"?: string;
}

export interface PokedexTransitionOutHandle {
  exit(): Promise<void>;
}

export const PokedexTransitionOut = forwardRef<
  PokedexTransitionOutHandle,
  PokedexTransitionOutProps
>(function PokedexTransitionOut({ children, ...rest }, ref) {
  const [leaving, setLeaving] = useState<"false" | "true" | "instant">(
    "false",
  );
  const inflightRef = useRef(false);
  const fade = useMusicFadeController();

  const reduceMotion = usePrefersReducedMotionStatic();

  const playExit = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLeaving(reduceMotion ? "instant" : "true");

    // En paralelo: fade in de música + espera de la animación CSS +
    // precarga de los assets de la pantalla de inicio. La precarga
    // es fire-and-forget en el sentido de que no bloquea si un
    // asset falla (rechaza con un error que `.catch` convierte en
    // no-op), pero sí garantiza que cuando lleguemos a `/` los
    // assets estén en caché del navegador.
    const music = fade.fadeIn(MUSIC_TARGET_VOLUME, MUSIC_FADE_IN_MS);
    const wait = reduceMotion
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          setTimeout(
            resolve,
            MUSIC_FADE_IN_MS + POST_ANIMATION_BUFFER_MS,
          ),
        );
    // Precarga: si falla (404, red, etc.) seguimos adelante. El
    // `preloadSources` ya es tolerante a fallos a nivel interno
    // (los `Image()` que no disparan onload resuelven igual en
    // jsdom), pero envolvemos en `.catch` por seguridad.
    const preload = preloadSources(getHomePreloadSources()).catch(() => {
      // Modo degradado: la animación de entrada en la home se
      // ejecutará igualmente; los assets que no estén cacheados
      // simplemente aparecerán cuando el navegador los descargue.
    });
    await Promise.all([music, wait, preload]);
  }, [fade, reduceMotion]);

  useImperativeHandle(
    ref,
    (): PokedexTransitionOutHandle => ({
      exit: playExit,
    }),
    [playExit],
  );

  useEffect(() => {
    return pokedexTransitionBus.subscribe(playExit);
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
export function _resetPokedexTransitionBusForTests(): void {
  currentListener = null;
}