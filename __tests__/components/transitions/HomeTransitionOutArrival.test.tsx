import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import {
  HomeTransitionOut,
  type HomeTransitionOutHandle,
  HOME_ARRIVAL_FROM_POKEDEX_KEY,
  markHomeArrivalFromPokedex,
  _clearHomeArrivalFromPokedexForTests,
} from "@/src/components/transitions/HomeTransitionOut";
import { SoundMusicProvider } from "@/src/components/home/SoundMusicContext";

/**
 * Plan 04.3 — TDD del comportamiento de "arrival from pokedex" en el
 * orquestador de salida de la pantalla de inicio.
 *
 * Cuando el usuario pulsa "Volver al inicio" desde la Pokédex, el
 * `PokedexHomeButton` marca un flag en `sessionStorage`. La siguiente
 * vez que se monte la Home, `HomeTransitionOut` debe detectar el
 * flag y aplicar `data-arrival-from="pokedex"` para que el CSS
 * ejecute la animación INVERSA de entrada (`home-enter-*`).
 *
 * Cubrimos aquí:
 *   - Marcado del flag con `markHomeArrivalFromPokedex`.
 *   - Lectura y consumo del flag al montar.
 *   - Aplicación del atributo `data-arrival-from` durante el primer
 *     render.
 *   - Limpieza del atributo tras la animación.
 *   - Caso `prefers-reduced-motion`: atributo
 *     `data-arrival-from="pokedex-instant"`.
 *   - El orquestador SIGUE funcionando para la salida clásica
 *     (data-leaving="true") aunque también soporte la entrada.
 */

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

function setupSessionStorage() {
  // jsdom ya trae sessionStorage por defecto, pero nos aseguramos.
  if (typeof window !== "undefined" && !window.sessionStorage) {
    const store = new Map<string, string>();
    (window as unknown as { sessionStorage: Storage }).sessionStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: (i) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
}

function wrap(node: ReactNode): ReactNode {
  return <SoundMusicProvider>{node}</SoundMusicProvider>;
}

describe("HomeTransitionOut (Plan 04.3 — arrival from pokedex)", () => {
  beforeEach(() => {
    setupMatchMedia();
    setupSessionStorage();
    _clearHomeArrivalFromPokedexForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    _clearHomeArrivalFromPokedexForTests();
  });

  it("estado inicial sin flag: data-arrival-from está ausente y data-leaving='false'", () => {
    render(wrap(<HomeTransitionOut data-testid="home-transition-out">x</HomeTransitionOut>));
    const host = screen.getByTestId("home-transition-out");
    expect(host.getAttribute("data-arrival-from")).toBeNull();
    expect(host.getAttribute("data-leaving")).toBe("false");
  });

  it("marca el flag en sessionStorage al llamar markHomeArrivalFromPokedex", () => {
    markHomeArrivalFromPokedex();
    expect(window.sessionStorage.getItem(HOME_ARRIVAL_FROM_POKEDEX_KEY)).toBe("1");
  });

  it("al montar con flag activo, expone data-arrival-from='pokedex' durante el primer paint", async () => {
    markHomeArrivalFromPokedex();
    render(wrap(<HomeTransitionOut data-testid="home-transition-out">x</HomeTransitionOut>));
    const host = screen.getByTestId("home-transition-out");
    // Tras el mount, el flag se consume y se aplica el atributo.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(host.getAttribute("data-arrival-from")).toBe("pokedex");
    // El flag se consume (se borra del sessionStorage).
    expect(window.sessionStorage.getItem(HOME_ARRIVAL_FROM_POKEDEX_KEY)).toBeNull();
  });

  it("con prefers-reduced-motion: aplica data-arrival-from='pokedex-instant' (sin animar)", async () => {
    setupMatchMedia({ reducedMotion: true });
    markHomeArrivalFromPokedex();
    render(wrap(<HomeTransitionOut data-testid="home-transition-out">x</HomeTransitionOut>));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const host = screen.getByTestId("home-transition-out");
    expect(host.getAttribute("data-arrival-from")).toBe("pokedex-instant");
  });

  it("tras la duración de la animación, vuelve a estado normal (data-arrival-from ausente)", async () => {
    markHomeArrivalFromPokedex();
    render(wrap(<HomeTransitionOut data-testid="home-transition-out">x</HomeTransitionOut>));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByTestId("home-transition-out").getAttribute("data-arrival-from")).toBe("pokedex");
    // Esperamos la duración + buffer de la animación.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1000));
    });
    expect(screen.getByTestId("home-transition-out").getAttribute("data-arrival-from")).toBeNull();
  });

  it("exit() clásico sigue funcionando: marca data-leaving='true'", async () => {
    function Harness({
      onMount,
    }: {
      onMount?: (api: { exit: () => Promise<void> }) => void;
    }) {
      const ref = useRef<HomeTransitionOutHandle | null>(null);
      return (
        <>
          <HomeTransitionOut
            ref={(handle) => {
              ref.current = handle;
            }}
            data-testid="home-transition-out"
          >
            x
          </HomeTransitionOut>
          {onMount && (
            <Trigger trigger={() => ref.current?.exit()} onMount={onMount} />
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
    let api: { exit: () => Promise<void> } | null = null;
    render(wrap(<Harness onMount={(a) => (api = a)} />));
    await act(async () => {
      await api!.exit();
    });
    expect(screen.getByTestId("home-transition-out").getAttribute("data-leaving")).toBe("true");
  });
});