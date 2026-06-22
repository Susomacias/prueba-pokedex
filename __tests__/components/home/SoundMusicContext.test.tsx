import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import {
  SoundMusicProvider,
  useSoundMusic,
} from "@/src/components/home/SoundMusicContext";

/**
 * Plan 03.4 — TDD del contexto que expone el estado de la música.
 *
 * El Plan 04 necesitará saber si la música está activa para hacer
 * `fadeOut` antes de la transición a `/pokedex`. Para evitar
 * acoplar `SoundToggle` a `router.push`, exponemos el estado vía
 * un Context ligero que sólo se monta en la página de inicio.
 */

interface FakeAudioInstance {
  src: string;
  loop: boolean;
  preload: string;
  paused: boolean;
  volume: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
}

function setupAudioMock() {
  const instances: FakeAudioInstance[] = [];
  const Original = (globalThis as { Audio?: unknown }).Audio;

  function FakeAudio(this: FakeAudioInstance, src?: string) {
    this.src = src ?? "";
    this.loop = false;
    this.preload = "";
    this.paused = true;
    this.volume = 1;
    this.play = vi.fn(() => {
      this.paused = false;
      return Promise.resolve();
    });
    this.pause = vi.fn(() => {
      this.paused = true;
    });
    this.load = vi.fn();
    instances.push(this);
  }
  (globalThis as unknown as { Audio: unknown }).Audio = FakeAudio;

  return {
    instances,
    restore: () => {
      (globalThis as unknown as { Audio: unknown }).Audio = Original;
    },
  };
}

describe("SoundMusicContext (Plan 03.4)", () => {
  let audioMock: ReturnType<typeof setupAudioMock>;

  beforeEach(() => {
    window.localStorage.clear();
    audioMock = setupAudioMock();
  });

  afterEach(() => {
    audioMock.restore();
  });

  it("useSoundMusic fuera del provider lanza error", () => {
    expect(() => renderHook(() => useSoundMusic())).toThrow(
      /SoundMusicProvider/i,
    );
  });

  it("estado inicial: música no activa y setter funciona", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundMusicProvider>{children}</SoundMusicProvider>
    );
    const { result } = renderHook(() => useSoundMusic(), { wrapper });
    expect(result.current.isPlaying).toBe(false);
    expect(typeof result.current.setIsPlaying).toBe("function");
  });

  it("setIsPlaying actualiza el estado expuesto", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundMusicProvider>{children}</SoundMusicProvider>
    );
    const { result } = renderHook(() => useSoundMusic(), { wrapper });
    act(() => {
      result.current.setIsPlaying(true);
    });
    expect(result.current.isPlaying).toBe(true);
  });

  it("varios consumidores ven el mismo estado compartido", () => {
    function Display() {
      const { isPlaying } = useSoundMusic();
      return <span data-testid="state">{isPlaying ? "on" : "off"}</span>;
    }
    function Control() {
      const { setIsPlaying } = useSoundMusic();
      return (
        <button type="button" onClick={() => setIsPlaying(true)}>
          ON
        </button>
      );
    }
    render(
      <SoundMusicProvider>
        <Display />
        <Display />
        <Control />
      </SoundMusicProvider>,
    );
    expect(screen.getAllByTestId("state")[0]).toHaveTextContent("off");
    act(() => {
      screen.getByRole("button", { name: /on/i }).click();
    });
    expect(screen.getAllByTestId("state")[0]).toHaveTextContent("on");
    expect(screen.getAllByTestId("state")[1]).toHaveTextContent("on");
  });
});
