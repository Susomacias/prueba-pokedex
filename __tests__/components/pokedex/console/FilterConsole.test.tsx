import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { FilterConsole } from "@/src/components/pokedex/console/FilterConsole";

/* ------------------------------------------------------------------------- *
 * Mocks
 * ------------------------------------------------------------------------- */

const harnessRef = globalThis as unknown as { __harness?: NavigationHarness };

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => {
    const h = harnessRef.__harness;
    if (!h) {
      throw new Error("harness not initialized");
    }
    const [, setTick] = useState(0);
    useEffect(() => h.subscribe(() => setTick((t) => t + 1)), [h]);
    return {
      pathname: h.pathname,
      searchParams: h.searchParams(),
      router: h.router,
      subscribe: (fn: () => void) => h.subscribe(fn),
    };
  },
}));

/**
 * Mock de `useFilterOptions` con respuestas síncronas y predecibles
 * por clave. Permite probar la consola sin tocar red ni fixtures y
 * sin disparar el `useSyncExternalStore` real.
 *
 * El objeto `optionsByKey` es un mapa `key → result` que el mock
 * devuelve. Por defecto cubre `type`, `generation`, `color`,
 * `habitat`, `ability` (los remotos) y `height`/`weight` (buckets).
 */
const defaultOptionsByKey = {
  type: [
    { value: "fire", label: "Fuego" },
    { value: "water", label: "Agua" },
    { value: "grass", label: "Planta" },
  ],
  generation: [
    { value: "generation-i", label: "Generación I" },
    { value: "generation-ii", label: "Generación II" },
  ],
  color: [
    { value: "red", label: "Rojo" },
    { value: "blue", label: "Azul" },
  ],
  habitat: [
    { value: "bosque", label: "Bosque" },
    { value: "caverna", label: "Caverna" },
  ],
  ability: [{ value: "overgrow", label: "Espesura" }],
  height: [
    { value: "xs", label: "XS", min: 0, max: 1 },
    { value: "s", label: "S", min: 1, max: 3 },
  ],
  weight: [
    { value: "light", label: "Ligero", min: 0, max: 10 },
    { value: "heavy", label: "Pesado", min: 100, max: 1000 },
  ],
};

vi.mock("@/src/components/filters/useFilterOptions", () => ({
  useFilterOptions: (key: string) => {
    const map = (globalThis as unknown as { __filterOpts?: Record<string, unknown> })
      .__filterOpts ?? defaultOptionsByKey;
    const options = (map as Record<string, unknown>)[key] ?? [];
    return {
      status: "ready",
      options: options as ReadonlyArray<unknown>,
      error: null,
    };
  },
}));

vi.mock("@/src/lib/pokemon/cachedPokemonApi", () => ({
  fetchTypeOptions: vi.fn(),
  fetchGenerationOptions: vi.fn(),
  fetchColorOptions: vi.fn(),
  fetchHabitatOptions: vi.fn(),
  fetchAbilityOptions: vi.fn(),
  fetchHeightBuckets: vi.fn(),
  fetchWeightBuckets: vi.fn(),
}));

/* ------------------------------------------------------------------------- *
 * Helpers
 * ------------------------------------------------------------------------- */

function wrapper({ children }: { children: ReactNode }) {
  return <FiltersProvider>{children}</FiltersProvider>;
}

function renderConsole() {
  return render(<FilterConsole />, { wrapper });
}

function getInput(): HTMLInputElement {
  const input = screen.getByLabelText(
    "Comando de la consola de filtros",
  ) as HTMLInputElement;
  return input;
}

function getScreen(): HTMLElement {
  return screen.getByTestId("filter-console-screen");
}

function typeAndSubmit(text: string) {
  const input = getInput();
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
}

function screenText(): string {
  return getScreen().textContent ?? "";
}

/* ------------------------------------------------------------------------- *
 * Tests
 * ------------------------------------------------------------------------- */

describe("FilterConsole — renderizado inicial y bienvenida", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("tiene el rol 'log' y el aria-label adecuado para accesibilidad", () => {
    renderConsole();
    const root = screen.getByRole("log", { name: "Consola de filtros" });
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("aria-live", "polite");
  });

  it("muestra una pantalla con scroll interno y el input con prompt '>'", () => {
    renderConsole();
    expect(getScreen()).toBeInTheDocument();
    const input = getInput();
    expect(input).toBeInTheDocument();
    const prompt = screen.getByText(">", { selector: ".fc-prompt" });
    expect(prompt).toBeInTheDocument();
  });

  it("al iniciar muestra el mensaje de bienvenida", () => {
    renderConsole();
    const text = screenText();
    expect(text).toContain("Pokédex");
    expect(text).toContain("Pokémon");
    expect(text).toContain("help");
  });
});

describe("FilterConsole — comandos básicos", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("help muestra la lista de comandos y filtros", () => {
    renderConsole();
    typeAndSubmit("help");
    const text = screenText();
    expect(text).toContain("Comandos disponibles");
    expect(text).toContain("filtro");
    expect(text).toContain("options");
    expect(text).toContain("resumen");
    expect(text).toContain("quitar");
    expect(text).toContain("clear");
    expect(text).toContain("limpiar");
    // Lista de filtros también
    expect(text).toContain("Tipo 1");
    expect(text).toContain("Generación");
  });

  it("ayuda funciona como alias de help", () => {
    renderConsole();
    typeAndSubmit("ayuda");
    expect(screenText()).toContain("Comandos disponibles");
  });

  it("comando desconocido muestra mensaje de error con sugerencia de help", () => {
    renderConsole();
    typeAndSubmit("xyzcomando");
    const text = screenText();
    expect(text).toMatch(/xyzcomando/);
    expect(text).toMatch(/help/);
  });

  it("eco del input se muestra con el prompt '>'", () => {
    renderConsole();
    typeAndSubmit("help");
    expect(screenText()).toContain("> help");
  });

  it("input vacío no hace nada (noop)", () => {
    renderConsole();
    const before = screenText();
    typeAndSubmit("   ");
    // Sólo se añade una línea (eco del prompt vacío); no se añade contenido
    // accionable ni cambia la pantalla.
    const after = screenText();
    expect(after.length).toBeGreaterThan(before.length);
    expect(after).toContain(">");
  });
});

describe("FilterConsole — aplicar filtros via consola", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("'tipo1 fuego' aplica el filtro (value 'fire') y actualiza la URL", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("tipo1 fuego");
    expect(replace).toHaveBeenCalled();
    const url = replace.mock.calls[0]?.[0] as string;
    // La URL serializa la etiqueta traducida ("Fuego" para "fire")
    expect(url).toMatch(/type1=Fuego/);
  });

  it("'tipo1 fire' (valor interno) también aplica el filtro", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("tipo1 fire");
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/type1=Fuego/);
  });

  it("'habitat forest' se traduce al interno 'bosque'", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("habitat forest");
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/habitat=bosque/);
  });

  it("'altura 0-1' aplica un bucket numérico libre", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("altura 0-1");
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/height=0_1/);
  });

  it("'generation generation-i' aplica usando el value real de PokeAPI", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("generation generation-i");
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/generation=generation-i/);
  });

  it("un valor inválido para type1 produce error amable sin mutar la URL", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("tipo1 psi");
    expect(replace).not.toHaveBeenCalled();
    const text = screenText();
    expect(text).toMatch(/psi/);
    expect(text).toMatch(/options type1/);
  });

  it("'clear' quita todos los filtros activos", () => {
    harnessRef.__harness!.setSearch("type1=Fuego&habitat=bosque");
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("clear");
    expect(replace).toHaveBeenCalledWith("/pokedex");
  });

  it("'quitar tipo1' elimina solo ese filtro", () => {
    harnessRef.__harness!.setSearch("type1=Fuego&habitat=bosque");
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("quitar tipo1");
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/habitat=bosque/);
    expect(url).not.toMatch(/type1/);
  });

  it("'resumen' muestra los filtros aplicados", () => {
    harnessRef.__harness!.setSearch("type1=Fuego");
    renderConsole();
    typeAndSubmit("resumen");
    const text = screenText();
    expect(text).toContain("Tipo 1");
    expect(text).toContain("Fuego");
  });

  it("'resumen' sin filtros muestra mensaje claro", () => {
    renderConsole();
    typeAndSubmit("resumen");
    expect(screenText()).toMatch(/No hay filtros aplicados/);
  });

  it("'limpiar' limpia la pantalla (pero mantiene filtros en la URL)", () => {
    harnessRef.__harness!.setSearch("type1=Fuego");
    renderConsole();
    typeAndSubmit("limpiar");
    // Tras `limpiar` la pantalla queda vacía (el eco del comando se
    // añade antes de `setLines([])` y React agrupa ambas updates, así
    // que el resultado final es la pantalla vacía).
    const screenEl = getScreen();
    expect(screenEl.textContent ?? "").toBe("");
  });
});

describe("FilterConsole — búsqueda libre (search)", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("texto suelto aplica el filtro search tal cual", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("pikachu");
    expect(replace).toHaveBeenCalled();
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/search=pikachu/);
  });

  it("búsqueda multi-palabra: 'Charman Pika' se conserva íntegra (la normalización ocurre en la capa de datos)", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("Charman Pika");
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/search=Charman\+Pika|Charman%20Pika/);
  });

  it("'buscar' es alias del comando de búsqueda", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("buscar charmander");
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toMatch(/search=charmander/);
  });

  it("'quitar search' limpia el término de búsqueda", () => {
    harnessRef.__harness!.setSearch("search=pikachu");
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("quitar search");
    expect(replace.mock.calls[0]?.[0]).toBe("/pokedex");
  });

  it("los cambios externos en la URL se reflejan al ejecutar `resumen`", () => {
    harnessRef.__harness!.setSearch("search=eevee");
    renderConsole();
    // El estado unificado (`useFilters`) refleja la URL automáticamente,
    // y `resumen` lee de ese estado. Lo verificamos lanzando `resumen`
    // y comprobando que el término aparece.
    typeAndSubmit("resumen");
    const text = screenText();
    expect(text).toContain("eevee");
  });
});

describe("FilterConsole — historial con flechas", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("ArrowUp recupera el último comando enviado", () => {
    renderConsole();
    typeAndSubmit("help");
    const input = getInput();
    fireEvent.keyDown(input, { key: "ArrowUp", code: "ArrowUp" });
    expect(input.value).toBe("help");
  });

  it("ArrowUp varias veces recorre el historial hacia atrás", () => {
    renderConsole();
    typeAndSubmit("help");
    typeAndSubmit("resumen");
    const input = getInput();
    fireEvent.keyDown(input, { key: "ArrowUp", code: "ArrowUp" });
    expect(input.value).toBe("resumen");
    fireEvent.keyDown(input, { key: "ArrowUp", code: "ArrowUp" });
    expect(input.value).toBe("help");
  });

  it("ArrowDown tras ArrowUp avanza hacia adelante y vacía al final", () => {
    renderConsole();
    typeAndSubmit("help");
    typeAndSubmit("resumen");
    const input = getInput();
    fireEvent.keyDown(input, { key: "ArrowUp", code: "ArrowUp" });
    expect(input.value).toBe("resumen");
    fireEvent.keyDown(input, { key: "ArrowUp", code: "ArrowUp" });
    expect(input.value).toBe("help");
    fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
    expect(input.value).toBe("resumen");
    fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
    expect(input.value).toBe("");
  });

  it("los comandos que no son válidos también entran en el historial", () => {
    renderConsole();
    typeAndSubmit("xyzcomando");
    const input = getInput();
    fireEvent.keyDown(input, { key: "ArrowUp", code: "ArrowUp" });
    expect(input.value).toBe("xyzcomando");
  });

  it("input vacío no se mete en el historial", () => {
    renderConsole();
    typeAndSubmit("help");
    typeAndSubmit("   ");
    const input = getInput();
    fireEvent.keyDown(input, { key: "ArrowUp", code: "ArrowUp" });
    expect(input.value).toBe("help");
  });
});

describe("FilterConsole — integración con estado compartido", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("al aplicar un filtro vía consola, se ve reflejado en la lista de filtros (resumen)", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });
    renderConsole();
    typeAndSubmit("tipo1 fuego");
    // Forzamos notificación del harness para que el estado reflejado
    // en el provider se sincronice (simula router.replace real).
    act(() => {
      harnessRef.__harness!.setSearch("type1=Fuego");
    });
    typeAndSubmit("resumen");
    expect(screenText()).toContain("Tipo 1");
  });

  it("los filtros activos de la URL están disponibles vía useFilters", () => {
    harnessRef.__harness!.setSearch("search=eevee");
    renderConsole();
    // El estado unificado debe reflejar la URL: lo verificamos
    // lanzando `resumen` en la consola, que lee de `useFilters`.
    typeAndSubmit("resumen");
    expect(screenText()).toMatch(/Búsqueda/);
    expect(screenText()).toMatch(/eevee/);
  });

  it("opciones asíncronas (estado 'ready') se muestran en 'options <filtro>'", () => {
    renderConsole();
    typeAndSubmit("options tipo1");
    const text = screenText();
    expect(text).toContain("Fuego");
    expect(text).toContain("Agua");
    expect(text).toContain("Planta");
    expect(text).toContain("(fire)");
    expect(text).toMatch(/Aplica con: `type1 <valor>`/);
  });

  it("'options habitat' lista los hábitats disponibles (con clave interna)", () => {
    renderConsole();
    typeAndSubmit("options habitat");
    const text = screenText();
    expect(text).toContain("Bosque");
    expect(text).toContain("Caverna");
  });
});

describe("FilterConsole — scroll y foco", () => {
  beforeEach(() => {
    harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  });

  it("el contenedor .fc-root y .fc-screen existen y .fc-screen es el área scrollable", () => {
    renderConsole();
    const root = screen.getByTestId("filter-console-root");
    const screenEl = screen.getByTestId("filter-console-screen");
    // Verificación estructural: ambos elementos existen y el screen
    // está anidado dentro del root. La validación de las reglas CSS
    // exactas (`overflow: hidden`, `overflow-y: auto`, `min-height: 0`)
    // se hace manualmente sobre `filter-console.css` y mediante el
    // smoke e2e de la consola (`e2e/pokedex-shell.spec.ts`); jsdom
    // no computa el `getComputedStyle` de hojas CSS importadas.
    expect(root).toContainElement(screenEl);
    // Marcadores estructurales en el DOM que SÍ podemos inspeccionar:
    expect(root.className).toContain("fc-root");
    expect(screenEl.className).toContain("fc-screen");
  });

  it("auto-scroll al añadir líneas: scrollTop se lleva al fondo tras enviar un comando", () => {
    renderConsole();
    const screenEl = screen.getByTestId(
      "filter-console-screen",
    ) as HTMLDivElement;

    // Aseguramos que hay overflow forzando muchas líneas (con `help`
    // se añaden ~20 líneas; suficiente para que el container tenga
    // `scrollHeight > clientHeight` en jsdom si forzamos un tamaño
    // finito).
    Object.defineProperty(screenEl, "clientHeight", {
      configurable: true,
      value: 40,
    });
    Object.defineProperty(screenEl, "scrollHeight", {
      configurable: true,
      value: 400,
    });
    const setSpy = vi.fn();
    Object.defineProperty(screenEl, "scrollTop", {
      configurable: true,
      get: () => 0,
      set: setSpy,
    });

    typeAndSubmit("help");
    // Tras añadir líneas, el efecto debe haber ajustado scrollTop al
    // menos una vez (incluso tras varios reintentos con rAF).
    expect(setSpy).toHaveBeenCalled();
    const lastCall = setSpy.mock.calls.at(-1)?.[0];
    expect(lastCall).toBe(400);
  });

  it("mantiene el foco en el input tras enviar un comando (para teclear el siguiente)", () => {
    renderConsole();
    const input = getInput();
    input.focus();
    typeAndSubmit("help");
    // El input debe seguir enfocado (el DOM real lo gestiona pero
    // verificamos que no se desmonta y que su `name` accesible sigue
    // siendo el correcto para siguientes comandos).
    expect(document.activeElement).toBe(input);
  });
});
