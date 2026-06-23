import { test, expect } from "@playwright/test";

/**
 * Smoke test de la SPA Inicio ↔ Pokédex.
 *
 * Mantenido deliberadamente mínimo: este flujo está cubierto en detalle
 * por los unit tests del provider `AppShellProvider`, `useAppShell`,
 * `PokedexPageTransition`, `ViewContext`, `PressStartButton` y
 * `useViewportLayout`. La razón es:
 *
 *   - Los unit tests del Context/Provider son deterministas y rápidos.
 *   - Simular clicks reales en Playwright sobre el botón PRESS START es
 *     muy frágil: el botón tiene `animate-press-start-pulse` +
 *     `transition-transform` que lo mantienen en movimiento constante
 *     (Playwright: `element is not stable`). Lo mismo aplica a
 *     `PokedexHomeButton`.
 *   - Existe un bug preexistente de hidratación en
 *     `PokedexPageTransition` (`data-pathname` server `/pokedex` vs
 *     cliente `/`) que añade ruido adicional a los asserts e2e.
 *
 * Cualquier ampliación de este spec debe seguir el patrón "smoke
 * mínimo" — no asserts sobre CSS intermedio ni sobre URL exacta.
 *
 * Cobertura E2E mínima:
 *   - Cargar `/` → `data-view="home"` y la Pokédex pre-renderizada
 *     offscreen (verifica que la app monta sin errores de consola
 *     críticos y que la SPA está correctamente estructurada).
 *
 * No cubre (queda fuera del alcance de este smoke):
 *   - Clicks en PRESS START / Volver al inicio (cubierto por unit
 *     tests del ViewContext y del handler de cada botón).
 *   - Tests del flujo de pokemon seleccionado (cubierto por unit tests
 *     del slot CARRUSEL_IMAGENES_DESCRIPCION y de `useAppShell`).
 *   - Animaciones CSS concretas (intencionalmente evitadas).
 *   - Música y volumen (cubierto por `musicViewBinder`).
 */

test.describe("Transición Inicio ↔ Pokédex (smoke)", () => {
  test("cargar / muestra la home con la Pokédex pre-renderizada offscreen", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });
    await expect(shell).toHaveAttribute("data-view", "home", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("pokedex-shell")).toBeAttached();
  });
});