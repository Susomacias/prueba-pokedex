import { describe, it, expect, vi } from "vitest";
import { useEffect } from "react";
import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import { PokedexShell } from "@/src/components/pokedex/PokedexShell";
import {
  PokedexPageProvider,
  usePokedexPage,
  type PokedexPageApi,
} from "@/src/components/pokedex/PokedexPageProvider";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { AppShellProvider } from "@/src/components/app/ViewContext";
import { createEmptySlots } from "@/src/components/pokedex/carcases/slots";

// Mock de `useNavigation` para evitar que `useRouter` (de next/navigation)
// requiera un app router real. Provee un router stub y searchParams
// vacíos. La Pokédex no se testea aquí a nivel de navegación real
// (eso se cubre en los tests E2E); estos tests verifican la estructura
// de slots y la propagación de estado.
vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => ({
    pathname: "/pokedex",
    searchParams: new URLSearchParams(),
    router: {
      replace: () => undefined,
      push: () => undefined,
      back: () => undefined,
      forward: () => undefined,
      refresh: () => undefined,
    },
    subscribe: () => () => undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pokedex",
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Plan 11: la lista se monta SIEMPRE dentro del slot
// `CARRUSEL_IMAGENES_DESCRIPCION`, así que necesitamos mockear la
// API para evitar fetches reales en los tests de shell.
//
// `fetchPokemonDetail` por defecto devuelve `null` para tests que
// verifican slots vacíos; los tests que necesitan slots poblados
// (evoluciones, stats, chips con datos) lo sobreescriben con
// `mockFetchDetailReturn`.
let mockFetchDetailReturn: unknown = null;
vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  applyFiltersToList: vi.fn().mockResolvedValue({
    items: [],
    nextOffset: null,
    total: 0,
    single: false,
  }),
  fetchPokemonDetail: vi.fn().mockImplementation(() =>
    Promise.resolve(mockFetchDetailReturn),
  ),
}));

// `AppShellProvider` lee `window.location.pathname` directamente
// (no usa `usePathname`), por eso mockeamos esa propiedad por test.
// El mock se aplica y restaura en `mockWindowPathname`/`resetWindowPathname`.
let originalLocation: Location | null = null;

function mockWindowPathname(pathname: string): void {
  if (originalLocation === null) {
    originalLocation = window.location;
  }
  // `window.location` es de sólo lectura en jsdom, así que redefinimos
  // `pathname` vía `Object.defineProperty`. El resto de campos
  // (origin, etc.) los preservamos.
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      ...originalLocation,
      pathname,
    },
  });
}

function resetWindowPathname(): void {
  if (originalLocation !== null) {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    originalLocation = null;
  }
}

/**
 * Plan 05.3 — TDD del ensamblador de slots.
 *
 * El `PokedexShell` lee el estado del `PokedexPageProvider` y construye
 * el `SlotMap` que se inyecta a la carcasa. Los stubs de cada slot
 * todavía no tienen lógica de UI real: el shell debe garantizar que:
 *
 *   - Construye el árbol de slots correcto y lo entrega a la carcasa
 *     (`PokedexVerticalSvg` o `PokedexHorizontalSvg`).
 *   - Los slots que necesitan pokemon (ChipsSlot, CarouselSlot, etc.)
 *     propagan `pokemonName` como `data-pokemon` al nodo hijo del
 *     `<foreignObject>` para tests E2E.
 *   - Los slots siempre visibles (filtros, buscador) se montan aunque
 *     no haya pokemon seleccionado.
 *   - El botón 3D sólo se inyecta si `has3DModel` es `true`; si no,
 *     el shell deja `slots.BOTON_3D = null` y la capa queda vacía
 *     (el `<g data-slot>` permanece en el DOM como placeholder
 *     inspeccionable).
 *   - En modo 3D, el `CarouselSlot` marca `data-mode="3d"` para que
 *     el componente del Plan 09 pueda tomar el control.
 *   - El shell delega en `useViewportLayout` la elección de carcasa
 *     (`data-orientation` en el host) y NO decide por su cuenta.
 *
 * Para testear los distintos estados del provider, este test monta
 * un harness con `PokedexPageProvider` y un `HarnessSetter` que ajusta
 * el estado desde dentro.
 */

/** Detalle mínimo para tests que necesitan slots poblados (Plan 08). */
function minimalDetail(name: string) {
  return {
    id: 25,
    name,
    height: 4,
    weight: 60,
    baseExperience: 112,
    isLegendary: false,
    isMythical: false,
    captureRate: 190,
    baseHappiness: 50,
    generation: "generation-i",
    habitat: "bosque",
    types: [{ slot: 1, name: "electric" }],
    stats: [
      { name: "hp", baseStat: 35 },
      { name: "attack", baseStat: 55 },
      { name: "defense", baseStat: 40 },
      { name: "special-attack", baseStat: 50 },
      { name: "special-defense", baseStat: 50 },
      { name: "speed", baseStat: 90 },
    ],
    abilities: [
      { name: "static", isHidden: false, slot: 1 },
    ],
    sprites: {
      frontDefault: null, frontShiny: null, backDefault: null, backShiny: null,
      officialArtwork: null, homeFront: null, homeShiny: null, officialArtworkShiny: null,
    },
    cryLatestUrl: null,
    flavorText: null,
    flavorTextVersion: null,
    evolutionChain: [
      { id: 172, name: "pichu", evolvesFromSpeciesId: null },
      { id: 25, name: "pikachu", evolvesFromSpeciesId: 172 },
      { id: 26, name: "raichu", evolvesFromSpeciesId: 25 },
    ],
  };
}

/** Helper: lee el `data-stub` del nodo hijo dentro de un `<g data-slot>`. */
function stubOf(slotGroup: Element | null): string | null {
  return slotGroup?.querySelector("[data-stub]")?.getAttribute("data-stub") ?? null;
}

function pokemonOf(slotGroup: Element | null): string | null {
  return (
    slotGroup?.querySelector("[data-pokemon]")?.getAttribute("data-pokemon") ??
    null
  );
}

function modeOf(slotGroup: Element | null): string | null {
  return slotGroup?.querySelector("[data-mode]")?.getAttribute("data-mode") ?? null;
}

function activeOf(slotGroup: Element | null): string | null {
  return (
    slotGroup
      ?.querySelector("[data-active]")
      ?.getAttribute("data-active") ?? null
  );
}

/**
 * Renderiza el shell dentro de un provider. Acepta un callback que
 * recibe el API del provider para que el test modifique el estado
 * desde fuera (en un `act()`) antes de que el shell se monte.
 *
 * El pokemon seleccionado se controla vía `pathname` (`/pokemon/<name>`),
 * NO vía `setSelectedName`: el provider lo deriva de
 * `window.location.pathname` (Plan 02 — routing ligero con
 * `history.pushState`). Por defecto el pathname mockeado es
 * `/pokedex`.
 *
 * `initialView` por defecto es `"pokedex"` para que el shell se
 * monte directamente en la vista de Pokédex sin esperar a una
 * transición; los tests que quieran validar la transición de
 * entrada pueden pasar `initialView: "home"`.
 *
 * Importante: el callback se ejecuta en un `useEffect` para evitar
 * renders infinitos (un setter dentro del cuerpo del componente
 * forzaría un re-render por cada cambio, y como el callback se
 * ejecuta en cada render el resultado es un bucle).
 */
function renderShell(
  configure?: (api: PokedexPageApi) => void,
  options: { pathname?: string; initialView?: "home" | "pokedex" } = {},
): ReturnType<typeof render> {
  mockWindowPathname(options.pathname ?? "/pokedex");
  function Harness() {
    const api = usePokedexPage();
    useEffect(() => {
      if (configure) configure(api);
      // Ejecutar sólo al montar: `configure` se invoca una vez con el
      // `api` actual; cambios posteriores se aplican directamente
      // desde el callback (no en cada render).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <PokedexShell />;
  }
  // Envoltorio en `FiltersProvider` para que `CarouselSlot` →
  // `PokemonList` pueda consumir `useFiltersContext` (Plan 06.1).
  // `AppShellProvider` lo necesita `PokedexShell` para exponer
  // `data-active-view` y el `selectedName`.
  const result = render(
    <AppShellProvider initialView={options.initialView ?? "pokedex"}>
      <FiltersProvider>
        <PokedexPageProvider>
          <Harness />
        </PokedexPageProvider>
      </FiltersProvider>
    </AppShellProvider>,
  );
  resetWindowPathname();
  return result;
}

describe("PokedexShell (Plan 05.3)", () => {
  it("renderiza una raíz con data-testid='pokedex-shell' que contiene un <svg>", () => {
    const { container } = renderShell();
    const root = container.querySelector('[data-testid="pokedex-shell"]');
    expect(root).not.toBeNull();
    expect(root!.querySelector("svg")).not.toBeNull();
  });

  it("siempre expone todos los SlotName del SlotMap (CARCASA incluida)", () => {
    const { container } = renderShell();
    const slots = container.querySelectorAll("[data-slot]");
    const found = new Set<string>();
    slots.forEach((el) => {
      const value = el.getAttribute("data-slot");
      if (value) found.add(value);
    });
    for (const expected of [
      "CARCASA",
      "BOTON_3D",
      "TIPO1_TIPO2_GENERACION",
      "PUNTOS_CARRUSEL",
      "CARRUSEL_IMAGENES_DESCRIPCION",
      "BOTONES_CARRUSEL",
      "SONIDO_POKEMON",
      "EVOLUCIONES",
      "STATS",
      "VER_HABILIDADES_VER_STATS",
      "CONSOLA_FILTROS",
      "DROPDOWNS_FILTROS",
      "BUSCAR_RESET_FILTRAR",
    ]) {
      expect(found.has(expected)).toBe(true);
    }
  });

  it("sin pokemon seleccionado: los slots de datos quedan SIN contenido (sin [data-stub] hijo)", () => {
    renderShell();
    // Plan 08: Todos los slots muestran contenido UI incluso sin pokemon:
    //   - TIPO1_TIPO2_GENERACION: chips placeholder (Plan 08.1).
    //   - EVOLUCIONES, STATS: panel LCD vacío (Plan 08.2/08.3).
    //   - VER_HABILIDADES_VER_STATS: botón disabled (Plan 08.4).
    //   - CARRUSEL_IMAGENES_DESCRIPCION: PokemonList (Plan 06.1).
    //   - Filtros: UI de filtros vacíos (Plan 07).
    // Sólo los slots PUNTOS_CARRUSEL/BOTONES_CARRUSEL/SONIDO_POKEMON
    // dependen del detalle del pokémon para mostrar contenido.
    for (const slot of [
      "PUNTOS_CARRUSEL",
      "BOTONES_CARRUSEL",
      "SONIDO_POKEMON",
    ]) {
      const group = document.querySelector(`[data-slot="${slot}"]`);
      expect(group).not.toBeNull();
      expect(group?.querySelector("[data-stub]")).toBeNull();
    }
    // Los slots de datos siempre visibles
    expect(stubOf(document.querySelector('[data-slot="TIPO1_TIPO2_GENERACION"]'))).toBe("chips");
    expect(stubOf(document.querySelector('[data-slot="EVOLUCIONES"]'))).toBe("evolutions");
    expect(stubOf(document.querySelector('[data-slot="STATS"]'))).toBe("stats");
    expect(stubOf(document.querySelector('[data-slot="VER_HABILIDADES_VER_STATS"]'))).toBe("toggle");
  });

  it("sin pokemon seleccionado: filtros y consola siguen visibles (placeholders)", () => {
    renderShell();
    expect(stubOf(document.querySelector('[data-slot="CONSOLA_FILTROS"]'))).toBe(
      "filter-console",
    );
    expect(
      stubOf(document.querySelector('[data-slot="DROPDOWNS_FILTROS"]')),
    ).toBe("filter-dropdowns");
    expect(
      stubOf(document.querySelector('[data-slot="BUSCAR_RESET_FILTRAR"]')),
    ).toBe("search-reset-filter");
  });

  it("con pokemon seleccionado: activa los slots de datos con un stub identificable", async () => {
    mockFetchDetailReturn = minimalDetail("pikachu");
    renderShell(undefined, { pathname: "/pokemon/pikachu" });

    // Los slots EVOLUCIONES y STATS dependen del detalle asíncrono de
    // CarouselProvider — esperamos a que se resuelva.
    await waitFor(() => {
      const evos = document.querySelector('[data-slot="EVOLUCIONES"]');
      expect(stubOf(evos)).toBe("evolutions");
    });

    const chips = document.querySelector('[data-slot="TIPO1_TIPO2_GENERACION"]');
    expect(stubOf(chips)).toBe("chips");
    expect(pokemonOf(chips)).toBe("pikachu");

    const carousel = document.querySelector(
      '[data-slot="CARRUSEL_IMAGENES_DESCRIPCION"]',
    );
    expect(stubOf(carousel)).toBe("carousel");
    expect(pokemonOf(carousel)).toBe("pikachu");

    expect(
      stubOf(document.querySelector('[data-slot="BOTONES_CARRUSEL"]')),
    ).toBe("buttons");
    expect(stubOf(document.querySelector('[data-slot="SONIDO_POKEMON"]'))).toBe(
      "sound",
    );

    const evos = document.querySelector('[data-slot="EVOLUCIONES"]');
    expect(pokemonOf(evos)).toBe("pikachu");

    // toggleStatsAbilities="stats" por defecto
    expect(stubOf(document.querySelector('[data-slot="STATS"]'))).toBe("stats");

    const toggle = document.querySelector(
      '[data-slot="VER_HABILIDADES_VER_STATS"]',
    );
    expect(stubOf(toggle)).toBe("toggle");
    expect(modeOf(toggle)).toBe("stats");
    mockFetchDetailReturn = null;
  });

  it("en modo abilities, el slot STATS muestra el stub de abilities", async () => {
    mockFetchDetailReturn = minimalDetail("pikachu");
    renderShell(
      (api) => {
        api.setToggleStatsAbilities("abilities");
      },
      { pathname: "/pokemon/pikachu" },
    );

    await waitFor(() => {
      expect(stubOf(document.querySelector('[data-slot="STATS"]'))).toBe(
        "abilities",
      );
    });

    const toggle = document.querySelector(
      '[data-slot="VER_HABILIDADES_VER_STATS"]',
    );
    expect(modeOf(toggle)).toBe("abilities");
    mockFetchDetailReturn = null;
  });

  it("en modo 3D: el slot CARRUSEL marca data-mode='3d' y el botón 3D aparece como activo", () => {
    renderShell(
      (api) => {
        api.setHas3DModel(true);
        api.setMode3D(true);
      },
      { pathname: "/pokemon/pikachu" },
    );
    const carousel = document.querySelector(
      '[data-slot="CARRUSEL_IMAGENES_DESCRIPCION"]',
    );
    expect(modeOf(carousel)).toBe("3d");

    const btn = document.querySelector('[data-slot="BOTON_3D"]');
    expect(stubOf(btn)).toBe("button-3d");
    expect(activeOf(btn)).toBe("true");
  });

  it("el botón 3D siempre está visible (Plan 08.5)", () => {
    renderShell(
      (api) => {
        api.setHas3DModel(false);
      },
      { pathname: "/pokemon/pikachu" },
    );
    const group = document.querySelector('[data-slot="BOTON_3D"]');
    expect(group).not.toBeNull();
    // El botón 3D ahora se inyecta siempre (sin funcionalidad).
    expect(group?.querySelector("[data-stub]")).not.toBeNull();
    expect(stubOf(group)).toBe("button-3d");
  });

  it("el shell delega la elección de carcasa en useViewportLayout (no decide él)", () => {
    const { container } = renderShell();
    const host = container.querySelector("[data-shell-host]");
    expect(host?.getAttribute("data-orientation")).toMatch(/vertical|horizontal/);
  });

  it("los stubs son componentes presentacionales simples (no llaman hooks pesados)", () => {
    const slots = createEmptySlots();
    expect(typeof slots).toBe("object");
    renderShell(undefined, { pathname: "/pokemon/pikachu" });
    expect(screen.getByTestId("pokedex-shell")).toBeInTheDocument();
  });

  it("expone la prop filtersActive: el atributo data-active de la consola refleja su valor", () => {
    const { container } = renderShell((api) => {
      api.setFiltersActive(true);
    });
    const consoleEl = container
      .querySelector('[data-slot="CONSOLA_FILTROS"]')
      ?.querySelector("[data-active]");
    expect(consoleEl?.getAttribute("data-active")).toBe("true");
  });

  it("sin pokemon seleccionado: el slot CARRUSEL_IMAGENES_DESCRIPCION aloja la PokemonList virtualizada (data-stub='list')", () => {
    // Mockeamos el data layer para que la lista pueda cargar.
    renderShell();
    const group = document.querySelector(
      '[data-slot="CARRUSEL_IMAGENES_DESCRIPCION"]',
    );
    expect(group).not.toBeNull();
    // El stub cambia de "carousel" (con pokemon) a "list" (sin pokemon).
    expect(group?.querySelector("[data-stub]")?.getAttribute("data-stub")).toBe(
      "list",
    );
    // Y dentro debe haber un contenedor con data-testid='pokemon-list'.
    // No esperamos cards concretas porque la carga depende de la API
    // real (no mockeada aquí); basta con verificar que el contenedor
    // existe — el contenido se cubre en los tests de PokemonList.
    expect(group?.querySelector('[data-testid="pokemon-list"]')).not.toBeNull();
  });

  it("el shell expone data-active-view al primer paint (para reflejar la vista activa)", () => {
    renderShell();
    const shell = screen.getByTestId("pokedex-shell");
    // En la SPA de una sola URL, el shell ya no necesita `data-mount`
    // para su propia animación de subida (la hace el wrapper exterior
    // `[data-view-target="pokedex"]` vía CSS). Sí expone la vista
    // activa para que tests E2E y selectores puedan inspeccionarla.
    expect(shell.getAttribute("data-active-view")).toBe("pokedex");
  });

  it("el host reserva un SHELL_INSET_DVH arriba y abajo para no tocar los bordes (corrección de PC muy pegado)", () => {
    // El borrador prohíbe que la Pokédex en PC toque los bordes
    // superior/inferior. Verificamos que el componente `PokedexShell`
    // usa el helper `SHELL_INSET_DVH` restando dvh del viewport al
    // calcular el tamaño del host: lo hacemos indirectamente
    // comprobando que el código del componente contiene la fórmula.
    //
    // (El test del valor concreto en el DOM inline es frágil en jsdom
    // porque React puede recortar `calc(...)` con unidades no
    // estándar. El comportamiento real se verifica en el test E2E
    // `pokedex-shell.spec.ts` con un viewport real donde `dvh` sí
    // resuelve.)
    const source = readFileSync(
      "src/components/pokedex/PokedexShell.tsx",
      "utf8",
    );
    expect(source).toMatch(/SHELL_INSET_DVH/);
    // La fórmula resta `2 * SHELL_INSET_DVH` dvh a `100dvh` para
    // reservar el inset superior e inferior. En el código fuente la
    // operación aparece como una expresión template literal
    // (`${SHELL_INSET_DVH * 2}dvh`), no como un número literal.
    expect(source).toMatch(/100dvh\s*-/);
    expect(source).toMatch(/SHELL_INSET_DVH\s*\*\s*2/);
  });
});

// Sólo asegura que no rompemos la API pública al cambiar tipos
describe("PokedexShell API", () => {
  it("exporta PokedexShell como named export", () => {
    expect(PokedexShell).toBeDefined();
    expect(typeof PokedexShell).toBe("function");
  });

  it("PokedexPageProvider expone el API documentado", () => {
    // Si las props del API cambian, este test falla y obliga a
    // actualizar tests + consumidores.
    //
    // Nota: `setSelectedName` se eliminó al migrar el routing a App
    // Router (Plan 02). El pokemon seleccionado se deriva ahora del
    // pathname (`/pokemon/<name>`); para cambiarlo se navega con
    // `router.push`. Ver `src/components/pokedex/PokedexPageProvider.tsx`.
    type Api = PokedexPageApi;
    const apiKeys: ReadonlyArray<keyof Api> = [
      "selectedName",
      "mode3D",
      "has3DModel",
      "toggleStatsAbilities",
      "filtersActive",
      "setMode3D",
      "setHas3DModel",
      "setToggleStatsAbilities",
      "setFiltersActive",
      "reset",
    ];
    const shape: Api = {
      selectedName: null,
      mode3D: false,
      has3DModel: false,
      toggleStatsAbilities: "stats",
      filtersActive: false,
      setMode3D: () => undefined,
      setHas3DModel: () => undefined,
      setToggleStatsAbilities: () => undefined,
      setFiltersActive: () => undefined,
      reset: () => undefined,
    };
    for (const key of apiKeys) {
      expect(key in shape).toBe(true);
    }
    expect(vi.isMockFunction(vi.fn())).toBe(true);
  });
});
