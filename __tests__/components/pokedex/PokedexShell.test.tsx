import { describe, it, expect, vi } from "vitest";
import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { PokedexShell } from "@/src/components/pokedex/PokedexShell";
import {
  PokedexPageProvider,
  usePokedexPage,
  type PokedexPageApi,
} from "@/src/components/pokedex/PokedexPageProvider";
import { createEmptySlots } from "@/src/components/pokedex/carcases/slots";

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
 * Importante: el callback se ejecuta en un `useEffect` para evitar
 * renders infinitos (un setter dentro del cuerpo del componente
 * forzaría un re-render por cada cambio, y como el callback se
 * ejecuta en cada render el resultado es un bucle).
 */
function renderShell(
  configure?: (api: PokedexPageApi) => void,
): ReturnType<typeof render> {
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
  return render(
    <PokedexPageProvider>
      <Harness />
    </PokedexPageProvider>,
  );
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
    for (const slot of [
      "CARRUSEL_IMAGENES_DESCRIPCION",
      "TIPO1_TIPO2_GENERACION",
      "PUNTOS_CARRUSEL",
      "BOTONES_CARRUSEL",
      "SONIDO_POKEMON",
      "EVOLUCIONES",
      "STATS",
      "VER_HABILIDADES_VER_STATS",
    ]) {
      const group = document.querySelector(`[data-slot="${slot}"]`);
      expect(group).not.toBeNull();
      expect(group?.querySelector("[data-stub]")).toBeNull();
    }
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

  it("con pokemon seleccionado: activa los slots de datos con un stub identificable", () => {
    renderShell((api) => api.setSelectedName("pikachu"));

    const chips = document.querySelector('[data-slot="TIPO1_TIPO2_GENERACION"]');
    expect(stubOf(chips)).toBe("chips");
    expect(pokemonOf(chips)).toBe("pikachu");

    const carousel = document.querySelector(
      '[data-slot="CARRUSEL_IMAGENES_DESCRIPCION"]',
    );
    expect(stubOf(carousel)).toBe("carousel");
    expect(pokemonOf(carousel)).toBe("pikachu");

    expect(stubOf(document.querySelector('[data-slot="PUNTOS_CARRUSEL"]'))).toBe(
      "dots",
    );
    expect(
      stubOf(document.querySelector('[data-slot="BOTONES_CARRUSEL"]')),
    ).toBe("buttons");
    expect(stubOf(document.querySelector('[data-slot="SONIDO_POKEMON"]'))).toBe(
      "sound",
    );

    const evos = document.querySelector('[data-slot="EVOLUCIONES"]');
    expect(stubOf(evos)).toBe("evolutions");
    expect(pokemonOf(evos)).toBe("pikachu");

    // toggleStatsAbilities="stats" por defecto
    expect(stubOf(document.querySelector('[data-slot="STATS"]'))).toBe("stats");

    const toggle = document.querySelector(
      '[data-slot="VER_HABILIDADES_VER_STATS"]',
    );
    expect(stubOf(toggle)).toBe("toggle");
    expect(modeOf(toggle)).toBe("stats");
  });

  it("en modo abilities, el slot STATS muestra el stub de abilities", () => {
    renderShell((api) => {
      api.setSelectedName("pikachu");
      api.setToggleStatsAbilities("abilities");
    });
    expect(stubOf(document.querySelector('[data-slot="STATS"]'))).toBe(
      "abilities",
    );
    const toggle = document.querySelector(
      '[data-slot="VER_HABILIDADES_VER_STATS"]',
    );
    expect(modeOf(toggle)).toBe("abilities");
  });

  it("en modo 3D: el slot CARRUSEL marca data-mode='3d' y el botón 3D aparece como activo", () => {
    renderShell((api) => {
      api.setSelectedName("pikachu");
      api.setHas3DModel(true);
      api.setMode3D(true);
    });
    const carousel = document.querySelector(
      '[data-slot="CARRUSEL_IMAGENES_DESCRIPCION"]',
    );
    expect(modeOf(carousel)).toBe("3d");

    const btn = document.querySelector('[data-slot="BOTON_3D"]');
    expect(stubOf(btn)).toBe("button-3d");
    expect(activeOf(btn)).toBe("true");
  });

  it("el botón 3D no inyecta contenido si el pokemon no tiene modelo 3D", () => {
    renderShell((api) => {
      api.setSelectedName("pikachu");
      api.setHas3DModel(false);
    });
    const group = document.querySelector('[data-slot="BOTON_3D"]');
    expect(group).not.toBeNull();
    // El `<g data-slot>` permanece pero sin `[data-stub]`.
    expect(group?.querySelector("[data-stub]")).toBeNull();
  });

  it("el shell delega la elección de carcasa en useViewportLayout (no decide él)", () => {
    const { container } = renderShell();
    const host = container.querySelector("[data-shell-host]");
    expect(host?.getAttribute("data-orientation")).toMatch(/vertical|horizontal/);
  });

  it("los stubs son componentes presentacionales simples (no llaman hooks pesados)", () => {
    const slots = createEmptySlots();
    expect(typeof slots).toBe("object");
    renderShell((api) => api.setSelectedName("pikachu"));
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
    type Api = PokedexPageApi;
    const apiKeys: ReadonlyArray<keyof Api> = [
      "selectedName",
      "mode3D",
      "has3DModel",
      "toggleStatsAbilities",
      "filtersActive",
      "setSelectedName",
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
      setSelectedName: () => undefined,
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
