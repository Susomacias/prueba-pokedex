"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppShell } from "@/src/components/app/ViewContext";

/**
 * Botón de toggle para la música de la pantalla de inicio.
 *
 * Responsabilidades:
 *   - Renderiza un botón accesible (icono `Volume2` / `VolumeX`) que
 *     reproduce/pausa `public/pagina_inicio/musica.mp3` en loop.
 *   - Persiste la preferencia en `localStorage` con clave versionada.
 *   - Crossfade del volumen al cambiar de vista: view="pokedex" → 0,
 *     view="home" → 0.6, en 600ms con requestAnimationFrame.
 */

const STORAGE_KEY = "pokedex:sound-enabled:v1";
const AUDIO_SRC = "/pagina_inicio/musica.mp3";
const TARGET_VOLUME = 0.6;
const FADE_MS = 600;

function readStoredPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function fadeTo(
  audio: HTMLAudioElement | null,
  target: number,
  durationMs: number,
): void {
  if (!audio) return;
  const startVol = audio.volume;
  const startTime = performance.now();

  function step() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, Math.max(0, elapsed / durationMs));
    audio!.volume = startVol + (target - startVol) * t;
    if (t < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

export function SoundToggle() {
  const { view } = useAppShell();
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstRenderRef = useRef(true);

  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = TARGET_VOLUME;
    audioRef.current = audio;
    return audio;
  }, []);

  useEffect(() => {
    setEnabled(readStoredPreference());
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    const audio = audioRef.current;
    if (!audio || !enabled) return;
    if (view === "pokedex") {
      fadeTo(audio, 0, FADE_MS);
    } else if (view === "home") {
      fadeTo(audio, TARGET_VOLUME, FADE_MS);
    }
  }, [view, enabled]);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* noop */
    }
    if (next) {
      const audio = ensureAudio();
      const result = audio.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => {
          setEnabled(false);
          try {
            window.localStorage.setItem(STORAGE_KEY, "false");
          } catch {
            /* noop */
          }
        });
      }
    } else {
      audioRef.current?.pause();
    }
  }, [enabled, ensureAudio]);

  if (!mounted) {
    return (
      <div
        data-testid="home-sound-toggle"
        className="h-10 w-10 sm:h-12 sm:w-12 shrink-0"
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Silenciar sonido" : "Activar sonido"}
      title={enabled ? "Silenciar sonido" : "Activar sonido"}
      data-testid="home-sound-toggle"
      data-enabled={enabled ? "true" : "false"}
      className="inline-flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded border-4 border-[#0c1c3e] bg-[#126CA3] text-white shadow-[4px_4px_0_#0c1c3e] transition-transform hover:-translate-y-0.5 hover:bg-[#1484c8] active:translate-y-0 active:shadow-[2px_2px_0_#0c1c3e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFE590]"
    >
      {enabled ? (
        <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
      ) : (
        <VolumeX aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
      )}
    </button>
  );
}
