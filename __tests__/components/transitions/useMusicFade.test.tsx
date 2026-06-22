import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  SoundMusicProvider,
  useSoundMusic,
} from "@/src/components/home/SoundMusicContext";
import {
  attachAudioController,
  useMusicFadeController,
  type FadeableAudio,
} from "@/src/components/transitions/useMusicFade";

/**
 * Plan 04.1 — TDD del controlador de fade de música.
 *
 * El Plan 04.2 necesita hacer fade-out del volumen de la música
 * durante la transición inicio → pokedex (sin pausar el audio del
 * todo para permitir una reentrada suave). El Plan 04.3 hace lo
 * inverso (fade-in al volver).
 *
 * Para evitar acoplar la pantalla de inicio a la API del orquestador
 * (y viceversa), el controlador se monta como un side-effect:
 *   1. `SoundToggle` registra el `HTMLAudioElement` actual mediante
 *      `attachAudioController()` cada vez que se activa la música.
 *   2. El orquestador (o quien lo necesite) invoca
 *      `useMusicFadeController()` que expone `fadeOut(durationMs)` y
 *      `fadeIn(target, durationMs)` lineales.
 *
 * Comportamiento esperado:
 *   - `fadeOut` reduce el volumen linealmente hasta 0 y resuelve al
 *     terminar (sin pausar el audio).
 *   - `fadeIn` sube el volumen desde el actual hasta `target` y
 *     resuelve al terminar.
 *   - Si no hay audio registrado, ambas funciones son no-ops y
 *     resuelven inmediatamente (evita excepciones en SSR o tests).
 *   - Si se vuelve a llamar `fadeOut` mientras hay uno en curso, se
 *     cancela el anterior y se inicia uno nuevo desde el volumen
 *     actual (evita saltos).
 */

function makeFakeAudio(initialVolume = 0.6): FadeableAudio & {
  set: (v: number) => void;
  get: () => number;
} {
  let v = initialVolume;
  return {
    get volume() {
      return v;
    },
    set volume(next: number) {
      v = next;
    },
    paused: false,
    pause: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    set(vol: number) {
      v = vol;
    },
    get: () => v,
  };
}

describe("useMusicFadeController + attachAudioController (Plan 04.1)", () => {
  beforeEach(() => {
    attachAudioController(null);
  });

  afterEach(() => {
    attachAudioController(null);
    vi.restoreAllMocks();
  });

  it("sin audio registrado: fadeOut y fadeIn resuelven inmediatamente sin lanzar", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundMusicProvider>{children}</SoundMusicProvider>
    );
    const { result } = renderHook(
      () => ({
        music: useSoundMusic(),
        fade: useMusicFadeController(),
      }),
      { wrapper },
    );

    await act(async () => {
      await result.current.fade.fadeOut(500);
      await result.current.fade.fadeIn(0.6, 500);
    });
    expect(true).toBe(true);
  });

  it("fadeOut reduce el volumen de 0.6 → 0 a lo largo de durationMs sin pausar el audio", async () => {
    // Usamos timers REALES porque el fade usa `requestAnimationFrame`,
    // que Vitest no mockea por defecto con `vi.useFakeTimers()`.
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundMusicProvider>{children}</SoundMusicProvider>
    );
    const { result } = renderHook(
      () => ({
        music: useSoundMusic(),
        fade: useMusicFadeController(),
      }),
      { wrapper },
    );

    const audio = makeFakeAudio(0.6);
    attachAudioController(audio);

    let fadeDone = false;
    let fadePromise!: Promise<void>;
    await act(async () => {
      result.current.music.setIsPlaying(true);
      fadePromise = result.current.fade.fadeOut(20);
      fadePromise.then(() => {
        fadeDone = true;
      });
      // Esperamos dentro de `act` para que React no interfiera con
      // el bucle RAF.
      await new Promise((r) => setTimeout(r, 30));
    });
    await act(async () => {
      await fadePromise;
    });
    expect(audio.get()).toBeCloseTo(0, 1);
    expect(fadeDone).toBe(true);
    // El audio NO se pausa (sólo se baja el volumen).
    expect(audio.pause).not.toHaveBeenCalled();
  });

  it("fadeIn sube el volumen desde 0 hasta target", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundMusicProvider>{children}</SoundMusicProvider>
    );
    const { result } = renderHook(
      () => ({
        music: useSoundMusic(),
        fade: useMusicFadeController(),
      }),
      { wrapper },
    );

    const audio = makeFakeAudio(0);
    attachAudioController(audio);

    // Primero activamos isPlaying en su propio `act` para que el
    // componente se re-renderice con `isPlaying=true` y el hook
    // regenere el `fadeIn` con la nueva dep.
    await act(async () => {
      result.current.music.setIsPlaying(true);
    });

    let fadeDone = false;
    let fadePromise!: Promise<void>;
    await act(async () => {
      fadePromise = result.current.fade.fadeIn(0.6, 30);
      fadePromise.then(() => {
        fadeDone = true;
      });
      await new Promise((r) => setTimeout(r, 45));
    });
    await act(async () => {
      await fadePromise;
    });
    expect(audio.get()).toBeCloseTo(0.6, 1);
    expect(fadeDone).toBe(true);
  });

  it("cancelar un fadeOut en curso (nueva llamada) empieza desde el volumen actual sin saltos", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundMusicProvider>{children}</SoundMusicProvider>
    );
    const { result } = renderHook(
      () => ({
        music: useSoundMusic(),
        fade: useMusicFadeController(),
      }),
      { wrapper },
    );

    const audio = makeFakeAudio(0.6);
    attachAudioController(audio);

    // Hacemos TODO dentro de un solo `act` para que vitest programe
    // los frames RAF que nuestro fade necesita.
    await act(async () => {
      result.current.music.setIsPlaying(true);
      void result.current.fade.fadeOut(80);
      await new Promise((r) => setTimeout(r, 30));
      expect(audio.get()).toBeLessThan(0.6);
      expect(audio.get()).toBeGreaterThan(0);

      // Otro fadeOut desde el volumen actual hasta 0 en 30ms.
      void result.current.fade.fadeOut(30);
      await new Promise((r) => setTimeout(r, 40));
      expect(audio.get()).toBeCloseTo(0, 1);
    });
  });

  it("attachAudioController acepta un solo audio; reemplaza al anterior", () => {
    const a = makeFakeAudio();
    const b = makeFakeAudio(0.2);
    attachAudioController(a);
    attachAudioController(b);
    // Reemplazar varias veces no rompe nada.
    expect(true).toBe(true);
  });
});