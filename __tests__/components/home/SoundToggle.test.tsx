import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SoundToggle } from "@/src/components/home/SoundToggle";

vi.mock("@/src/components/app/ViewContext", () => ({
  useAppShell: vi.fn(() => ({ view: "home" })),
}));

/**
 * Plan 03.4 — TDD del botón de sonido de la pantalla de inicio.
 *
 * Comportamiento esperado:
 *   - Renderiza un botón accesible con `aria-label`.
 *   - Estado inicial: sonido desactivado (icono VolumeX).
 *   - Al pulsar: activa el audio (`audio.play()`) y muestra Volume2.
 *   - Al volver a pulsar: pausa el audio (`audio.pause()`) y muestra VolumeX.
 *   - Preferencia persistida en `localStorage` bajo clave versionada.
 *   - Lee `localStorage` al montar para recordar la preferencia.
 *   - El `<audio>` se monta con `loop`, `preload="auto"` y `src` correcto.
 */

const STORAGE_KEY = "pokedex:sound-enabled:v1";

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

describe("SoundToggle (Plan 03.4)", () => {
  let audioMock: ReturnType<typeof setupAudioMock>;

  beforeEach(() => {
    window.localStorage.clear();
    audioMock = setupAudioMock();
  });

  afterEach(() => {
    audioMock.restore();
    vi.restoreAllMocks();
  });

  it("renderiza un botón accesible con aria-label descriptivo y es focusable", () => {
    render(<SoundToggle />);
    const button = screen.getByRole("button", { name: /sonido/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
    // focusable (button nativo)
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it("empieza con sonido desactivado (icono VolumeX) y NO reproduce audio", async () => {
    render(<SoundToggle />);
    // Estado inicial: aria-label menciona "Activar"
    const button = screen.getByRole("button", { name: /activar sonido/i });
    expect(button).toBeInTheDocument();
    // El icono VolumeX debe estar presente
    expect(button.querySelector("svg")).not.toBeNull();
    // No debe haberse creado ningún audio aún (lazy)
    expect(audioMock.instances.length).toBe(0);
  });

  it("al pulsar activa el audio (play), cambia el icono y persiste en localStorage", async () => {
    const user = userEvent.setup();
    render(<SoundToggle />);

    const button = screen.getByRole("button", { name: /activar sonido/i });
    await user.click(button);

    expect(audioMock.instances.length).toBe(1);
    const audio = audioMock.instances[0]!;
    expect(audio.src).toContain("/pagina_inicio/musica.mp3");
    expect(audio.loop).toBe(true);
    expect(audio.play).toHaveBeenCalledTimes(1);

    // Cambia el aria-label al estado "silenciar"
    expect(
      screen.getByRole("button", { name: /silenciar sonido/i }),
    ).toBeInTheDocument();

    // Persistencia
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("al volver a pulsar pausa el audio, cambia el icono y persiste el nuevo estado", async () => {
    const user = userEvent.setup();
    render(<SoundToggle />);

    const activate = screen.getByRole("button", { name: /activar sonido/i });
    await user.click(activate);
    expect(audioMock.instances.length).toBe(1);

    const silence = screen.getByRole("button", { name: /silenciar sonido/i });
    await user.click(silence);

    const audio = audioMock.instances[0]!;
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
    expect(
      screen.getByRole("button", { name: /activar sonido/i }),
    ).toBeInTheDocument();
  });

  it("lee la preferencia persistida en localStorage al montar y refleja el estado en el icono", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    render(<SoundToggle />);

    // Debe empezar con el botón "silenciar" (icono Volume2)
    expect(
      screen.getByRole("button", { name: /silenciar sonido/i }),
    ).toBeInTheDocument();

    // El estado interno refleja localStorage: al pulsar debe pausar
    // sin necesidad de "arrancar" primero.
    const button = screen.getByRole("button", { name: /silenciar sonido/i });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("lee la preferencia persistida y arranca en silencio si era false", () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    render(<SoundToggle />);

    expect(
      screen.getByRole("button", { name: /activar sonido/i }),
    ).toBeInTheDocument();
    // No debe reproducir (el audio no se crea hasta la primera interacción)
    expect(audioMock.instances.length).toBe(0);
  });

  it("el HTMLAudioElement creado usa loop=true y el src de musica.mp3", async () => {
    const user = userEvent.setup();
    render(<SoundToggle />);

    await user.click(screen.getByRole("button", { name: /activar sonido/i }));

    const audio = audioMock.instances[0]!;
    expect(audio.loop).toBe(true);
    expect(audio.src).toBe("/pagina_inicio/musica.mp3");
  });

  it("si play() falla (autoplay bloqueado), revierte el estado y la preferencia", async () => {
    const user = userEvent.setup();
    // Sobrescribimos `Audio` con uno que rechaza el primer `play()`.
    const OriginalAudio = (globalThis as { Audio?: unknown }).Audio;
    const failingInstances: FakeAudioInstance[] = [];
    function FakeAudioFailing(this: FakeAudioInstance, src?: string) {
      this.src = src ?? "";
      this.loop = false;
      this.preload = "";
      this.paused = true;
      this.volume = 1;
      this.play = vi.fn(() => {
        this.paused = false;
        return Promise.reject(new Error("NotAllowedError"));
      });
      this.pause = vi.fn(() => {
        this.paused = true;
      });
      this.load = vi.fn();
      failingInstances.push(this);
    }
    (globalThis as unknown as { Audio: unknown }).Audio = FakeAudioFailing;

    try {
      render(<SoundToggle />);
      await user.click(screen.getByRole("button", { name: /activar sonido/i }));

      // La promesa rechazada se procesa en el siguiente microtask.
      await act(async () => {
        await Promise.resolve();
      });

      // Como el navegador bloqueó el play, el componente revierte el
      // estado a "apagado" para no mentir al usuario.
      expect(
        screen.getByRole("button", { name: /activar sonido/i }),
      ).toBeInTheDocument();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
      expect(failingInstances.length).toBe(1);
    } finally {
      (globalThis as unknown as { Audio: unknown }).Audio = OriginalAudio;
    }
  });

  it("pausa el audio al desmontar si estaba reproduciendo", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SoundToggle />);

    await user.click(screen.getByRole("button", { name: /activar sonido/i }));
    const audio = audioMock.instances[0]!;
    audio.pause.mockClear();

    act(() => {
      unmount();
    });
    expect(audio.pause).toHaveBeenCalled();
  });
});
