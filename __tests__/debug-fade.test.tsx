import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SoundMusicProvider } from "@/src/components/home/SoundMusicContext";
import {
  attachAudioController,
  useMusicFadeController,
  type FadeableAudio,
} from "@/src/components/transitions/useMusicFade";

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

describe("debug fade", () => {
  it("debug", async () => {
    attachAudioController(null);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundMusicProvider>{children}</SoundMusicProvider>
    );
    const { result } = renderHook(
      () => ({
        fade: useMusicFadeController(),
      }),
      { wrapper },
    );

    const audio = makeFakeAudio(0.6);
    attachAudioController(audio);

    let rafCount = 0;
    let start = 0;
    const tick = (t: number) => {
      rafCount++;
      // eslint-disable-next-line no-console
      console.log(`RAF #${rafCount} at ${t.toFixed(1)} (elapsed=${(t - start).toFixed(1)})`);
      if (rafCount < 10) {
        window.requestAnimationFrame(tick);
      }
    };
    await act(async () => {
      start = Date.now();
      window.requestAnimationFrame(tick);
      await new Promise((r) => setTimeout(r, 200));
    });
    // eslint-disable-next-line no-console
    console.log(`Total RAF count inside act: ${rafCount}`);
    expect(rafCount).toBeGreaterThan(2);
  });
});