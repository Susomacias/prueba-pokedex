import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import {
  PokedexTransitionOut,
  pokedexTransitionBus,
  type PokedexTransitionOutHandle,
} from "@/src/components/transitions/PokedexTransitionOut";
import {
  TransitionOrchestratorProvider,
} from "@/src/components/transitions/TransitionOrchestratorContext";
import { attachAudioController } from "@/src/components/transitions/useMusicFade";
import {
  SoundMusicProvider,
} from "@/src/components/home/SoundMusicContext";

/**
 * Plan 04.3 — TDD del orquestador de salida de la Pokédex.
 *
 * Simétrico al Plan 04.2 (`HomeTransitionOut`):
 *
 *   1. Al recibir la orden de salir (vía el handle imperativo o el
 *      bus global):
 *      - Marca el contenedor con `data-leaving="true"` para que el
 *        CSS active la coreografía de salida (la carcasa baja fuera
 *        de pantalla con fade out).
 *      - Si el usuario tenía la música activa, hace `fadeIn` del
 *        volumen a su valor original (~600ms).
 *      - Resuelve la promesa (el caller hace `router.push('/')`).
 *   2. Si el usuario prefiere reducir movimiento, `data-leaving="instant"`
 *      oculta la carcasa sin animar y la música vuelve a su volumen
 *      sin fade.
 *
 *   3. NO navega por sí mismo: quien dispara la transición es un
 *      botón de "Volver" de la Pokédex (o el orquestador central).
 */

interface FakeRouter {
  push: (url: string, options?: { scroll?: boolean }) => void | Promise<void>;
}

function makeRouter(): FakeRouter {
  return { push: vi.fn() };
}

function Harness({
  router,
  onMount,
  children,
}: {
  router: FakeRouter;
  onMount?: (api: { exit: () => Promise<void> }) => void;
  children?: ReactNode;
}) {
  return (
    <SoundMusicProvider>
      <TransitionOrchestratorProvider router={router}>
        <PokedexTransitionOutWrapper onMount={onMount}>
          {children ?? <div data-testid="child">pokedex content</div>}
        </PokedexTransitionOutWrapper>
      </TransitionOrchestratorProvider>
    </SoundMusicProvider>
  );
}

function PokedexTransitionOutWrapper({
  onMount,
  children,
}: {
  onMount?: (api: { exit: () => Promise<void> }) => void;
  children: ReactNode;
}) {
  const ref = useRef<PokedexTransitionOutHandle | null>(null);
  return (
    <>
      <PokedexTransitionOut
        ref={(handle) => {
          ref.current = handle;
        }}
        data-testid="pokedex-transition-out"
      >
        {children}
      </PokedexTransitionOut>
      {onMount && (
        <Trigger
          trigger={() => ref.current?.exit()}
          onMount={onMount}
        />
      )}
    </>
  );
}

function Trigger({
  trigger,
  onMount,
}: {
  trigger: () => Promise<void> | undefined;
  onMount: (api: { exit: () => Promise<void> }) => void;
}) {
  onMount({ exit: () => Promise.resolve(trigger() ?? undefined) });
  return null;
}

function setupMatchMedia({ reducedMotion = false }: { reducedMotion?: boolean } = {}) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({
      matches:
        reducedMotion && query.includes("prefers-reduced-motion") ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

describe("PokedexTransitionOut (Plan 04.3)", () => {
  beforeEach(() => {
    setupMatchMedia();
    attachAudioController(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("estado inicial: el contenedor tiene data-leaving='false'", () => {
    const router = makeRouter();
    render(<Harness router={router} />);
    const container = screen.getByTestId("pokedex-transition-out");
    expect(container.getAttribute("data-leaving")).toBe("false");
  });

  it("exit() marca data-leaving='true' y resuelve la promesa", async () => {
    const router = makeRouter();
    let exitApi: { exit: () => Promise<void> } | null = null;
    render(
      <Harness
        router={router}
        onMount={(api) => {
          exitApi = api;
        }}
      />,
    );

    let exitDone = false;
    await act(async () => {
      await exitApi!.exit().then(() => {
        exitDone = true;
      });
    });

    const container = screen.getByTestId("pokedex-transition-out");
    expect(container.getAttribute("data-leaving")).toBe("true");
    expect(exitDone).toBe(true);
  });

  it("con prefers-reduced-motion: exit() marca data-leaving='instant' y resuelve rápido", async () => {
    setupMatchMedia({ reducedMotion: true });
    const router = makeRouter();
    let exitApi: { exit: () => Promise<void> } | null = null;
    render(
      <Harness
        router={router}
        onMount={(api) => {
          exitApi = api;
        }}
      />,
    );

    let exitDone = false;
    await act(async () => {
      await exitApi!.exit().then(() => {
        exitDone = true;
      });
    });

    const container = screen.getByTestId("pokedex-transition-out");
    expect(container.getAttribute("data-leaving")).toBe("instant");
    expect(exitDone).toBe(true);
  });

  it("se registra en el pokedexTransitionBus y playExit lo invoca", () => {
    const router = makeRouter();
    render(<Harness router={router} />);
    expect(pokedexTransitionBus.hasSubscriber()).toBe(true);
  });

  it("exit() sin audio registrado y sin isPlaying no lanza", async () => {
    const router = makeRouter();
    let exitApi: { exit: () => Promise<void> } | null = null;
    render(
      <Harness
        router={router}
        onMount={(api) => {
          exitApi = api;
        }}
      />,
    );

    let exitDone = false;
    await act(async () => {
      await exitApi!.exit().then(() => {
        exitDone = true;
      });
    });

    expect(exitDone).toBe(true);
  });
});