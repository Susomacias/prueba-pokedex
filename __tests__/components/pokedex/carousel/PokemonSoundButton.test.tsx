import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PokemonSoundButton } from "@/src/components/pokedex/carousel/PokemonSoundButton";

/**
 * Plan 06.6 — TDD del botón de sonido (cry del pokemon).
 *
 * Cobertura:
 *  - Renderiza un `<button>` con `aria-label` dinámico (incluye el
 *    nombre del pokemon).
 *  - Click reproduce el audio vía `new Audio()` mockeado.
 *  - Sin `cryUrl` → el botón NO se renderiza.
 *  - Estado visual "playing" mientras suena el audio.
 *  - Si se vuelve a pulsar mientras suena, se reinicia la reproducción.
 */

class MockAudio {
  src: string;
  preload: string = "auto";
  currentTime = 0;
  paused = true;
  duration = NaN;
  playbackRate = 1;
  volume = 1;
  muted = false;
  ended = false;
  private listeners: Record<string, Array<() => void>> = {};

  constructor(src: string) {
    this.src = src;
  }
  play(): Promise<void> {
    this.paused = false;
    this.duration = 2; // 2s de duración simulada
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
  load(): void {
    /* noop */
  }
  addEventListener(type: string, cb: () => void): void {
    (this.listeners[type] ??= []).push(cb);
  }
  removeEventListener(type: string, cb: () => void): void {
    const arr = this.listeners[type];
    if (!arr) return;
    const idx = arr.indexOf(cb);
    if (idx >= 0) arr.splice(idx, 1);
  }
  /** Helper de tests: dispara un listener registrado. */
  __emit(type: string): void {
    for (const cb of this.listeners[type] ?? []) cb();
  }
  /** Helper de tests: simula que el audio termina. */
  __end(): void {
    this.paused = true;
    this.ended = true;
    this.__emit("ended");
  }
}

interface AudioCtor {
  new (src: string): MockAudio;
}

interface WindowWithAudio extends Window {
  Audio?: AudioCtor;
}

let lastAudio: MockAudio | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  lastAudio = undefined;
  // Sustituimos `Audio` por nuestro mock y capturamos la instancia.
  (window as unknown as WindowWithAudio).Audio = function MockCtor(
    src: string,
  ): MockAudio {
    lastAudio = new MockAudio(src);
    return lastAudio;
  } as unknown as AudioCtor;
});

afterEach(() => {
  delete (window as unknown as { Audio?: unknown }).Audio;
});

describe("PokemonSoundButton (Plan 06.6)", () => {
  it("renderiza un <button> accesible con aria-label dinámico", () => {
    render(
      <PokemonSoundButton
        pokemonName="pikachu"
        cryUrl="https://example.test/pikachu.cry.ogg"
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("pikachu");
  });

  it("click reproduce el audio con la URL del cry", () => {
    render(
      <PokemonSoundButton
        pokemonName="pikachu"
        cryUrl="https://example.test/pikachu.cry.ogg"
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(lastAudio).toBeDefined();
    expect(lastAudio!.src).toBe("https://example.test/pikachu.cry.ogg");
    expect(lastAudio!.paused).toBe(false);
  });

  it("cuando el audio termina, el botón vuelve a su estado visual normal", async () => {
    render(
      <PokemonSoundButton
        pokemonName="pikachu"
        cryUrl="https://example.test/pikachu.cry.ogg"
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").getAttribute("data-playing")).toBe("true");

    lastAudio!.__end();

    await waitFor(() => {
      expect(screen.getByRole("button").getAttribute("data-playing")).toBe("false");
    });
  });

  it("sin cryUrl el botón NO se renderiza", () => {
    const { container } = render(<PokemonSoundButton pokemonName="pikachu" cryUrl={null} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("pulsa de nuevo mientras suena reinicia la reproducción", () => {
    render(
      <PokemonSoundButton
        pokemonName="pikachu"
        cryUrl="https://example.test/pikachu.cry.ogg"
      />,
    );
    const btn = screen.getByRole("button");

    fireEvent.click(btn);
    expect(lastAudio!.currentTime).toBe(0);

    // Simulamos avance en el audio.
    lastAudio!.currentTime = 1;
    fireEvent.click(btn);

    // Debe haberse reiniciado el currentTime (la práctica estándar
    // para "stop and replay").
    expect(lastAudio!.currentTime).toBe(0);
  });

  it("carga con preload 'auto' para reducir latencia al pulsar", () => {
    render(
      <PokemonSoundButton
        pokemonName="pikachu"
        cryUrl="https://example.test/pikachu.cry.ogg"
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(lastAudio!.preload).toBe("auto");
  });
});