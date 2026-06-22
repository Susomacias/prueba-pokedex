"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSoundMusic } from "@/src/components/home/SoundMusicContext";

/**
 * Plan 04.1 — Controlador de fade de volumen para la música del
 * inicio.
 *
 * Contexto:
 *   El Plan 04.2 hace fade-out del volumen durante la transición
 *   Inicio → Pokédex (sin pausar el audio, para permitir una
 *   reentrada suave). El Plan 04.3 hace el camino inverso (fade-in
 *   al volver).
 *
 * Para evitar acoplar el orquestador a `SoundToggle` (que es el
 * dueño del `HTMLAudioElement`), la API se separa en dos partes:
 *
 *   - `attachAudioController(audio)` — lo llama `SoundToggle` cuando
 *     crea el audio. Acepta `null` para "olvidar" el audio (al
 *     desmontar, o al pausar y descartar).
 *   - `useMusicFadeController()` — hook que expone `fadeOut(ms)` y
 *     `fadeIn(target, ms)`. Resuelve cuando el fade termina.
 *
 * ¿Por qué no usar directamente `useSoundMusic` para el fade?
 *   Porque ese context sólo conoce un booleano ("isPlaying"). El
 *   fade necesita leer/escribir el `volume` del audio real, y
 *   `SoundToggle` es quien mantiene la referencia al elemento.
 *   Mantener este controller separado evita ciclos de render y
 *   dependencia circular con el `SoundMusicProvider`.
 *
 * Accesibilidad:
 *   - Las funciones NO lanzan excepciones si no hay audio
 *     registrado (no-op silencioso + resolución inmediata).
 *   - Si la música NO estaba activa al iniciar el fadeIn, la
 *     operación se salta (no tiene sentido subir un volumen que el
 *     usuario no quiere oír).
 */

/** Subset de HTMLAudioElement que necesita el controlador. */
export interface FadeableAudio {
  readonly volume: number;
  volume: number;
  readonly paused: boolean;
  pause(): void;
  play(): Promise<void> | void;
}

/** Audio registrado actualmente (singleton en el módulo). */
let currentAudio: FadeableAudio | null = null;

export function attachAudioController(audio: FadeableAudio | null): void {
  currentAudio = audio;
}

/** Sólo para tests. */
export function _getCurrentAudioForTests(): FadeableAudio | null {
  return currentAudio;
}

/** Referencia al interval activo (para cancelar). */
let activeFade: { cancel: () => void } | null = null;

/** Tick de raf para fades suaves. */
function rafStep(durationMs: number, onTick: (t: number) => void): Promise<void> {
  return new Promise((resolve) => {
    // Si RAF no está disponible (SSR o entornos sin navegador) caemos
    // a `setTimeout` con un solo tick al final. Esto evita bloquear
    // la transición indefinidamente.
    if (
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      const timeout = setTimeout(() => {
        onTick(1);
        resolve();
      }, durationMs);
      activeFade = {
        cancel: () => {
          clearTimeout(timeout);
          resolve();
        },
      };
      return;
    }

    // Usamos `Date.now()` (en ms) en lugar de `performance.now()`
    // porque jsdom no implementa `performance.now()` de forma fiable.
    // Para el fade (resolución ~16ms) la precisión de `Date.now()`
    // es más que suficiente.
    const start = Date.now();
    let frame = 0;
    let cancelled = false;
    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - start;
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      onTick(t);
      if (t >= 1) {
        resolve();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    activeFade = {
      cancel: () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        resolve();
      },
    };
  });
}

export interface MusicFadeController {
  fadeOut(durationMs: number): Promise<void>;
  fadeIn(targetVolume: number, durationMs: number): Promise<void>;
}

/**
 * Hook que expone el controlador de fade. No tiene estado propio:
 * todas las operaciones se aplican al audio registrado vía
 * `attachAudioController`. Si no hay audio (o no está sonando),
 * las funciones son no-ops y resuelven inmediatamente.
 *
 * Implementación:
 *   - Usa `requestAnimationFrame` para suavidad y para cancelar
 *     limpiamente si entra otro fade antes de terminar.
 *   - Cada fade se asocia a un único `activeFade` global; uno nuevo
 *     cancela el anterior para evitar "saltos" de volumen.
 */
export function useMusicFadeController(): MusicFadeController {
  const { isPlaying } = useSoundMusic();
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const fadeOut = useCallback(async (durationMs: number): Promise<void> => {
    if (activeFade) activeFade.cancel();
    const audio = currentAudio;
    if (!audio) return;
    const startVol = audio.volume;
    await rafStep(durationMs, (t) => {
      audio.volume = startVol * (1 - t);
    });
    // Aseguramos el valor final exacto aunque el último frame RAF
    // haya quedado en `t < 1` por precisión de timing.
    audio.volume = 0;
  }, []);

  const fadeIn = useCallback(
    async (targetVolume: number, durationMs: number): Promise<void> => {
      if (activeFade) activeFade.cancel();
      const audio = currentAudio;
      if (!audio) return;
      // Si la música no estaba activa, no forzamos volumen (respeto
      // al usuario: si tenía el sonido apagado, fade-in sería invasivo).
      if (!isPlayingRef.current) return;
      const startVol = audio.volume;
      const delta = targetVolume - startVol;
      await rafStep(durationMs, (t) => {
        audio.volume = startVol + delta * t;
      });
      audio.volume = targetVolume;
    },
    [],
  );

  return { fadeOut, fadeIn };
}