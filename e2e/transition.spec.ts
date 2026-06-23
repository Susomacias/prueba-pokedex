import { test, expect } from "@playwright/test";

/**
 * E2E de la transición Inicio ↔ Pokédex (SPA de una sola URL).
 *
 * A diferencia del plan anterior (que usaba `router.push` entre dos
 * rutas distintas), esta arquitectura monta SIEMPRE Home + Pokédex y
 * cambia entre ambas con `data-view`. Esto resuelve el problema de
 * que `router.push` desmontaba la home antes de que la animación
 * arrancase.
 *
 * El test verifica que:
 *
 *   - Al cargar `/`, el contenedor raíz tiene `data-view="home"`.
 *   - La Pokédex está pre-renderizada en el DOM (no se desmonta al
 *     "navegar") y oculta con `translateY(100%)`.
 *   - Al pulsar PRESS START (o cualquier letra/Enter/Space), el
 *     contenedor cambia a `data-view="pokedex"` y la URL SE MANTIENE
 *     en `/` (es una SPA: no hay navegación).
 *   - La Pokédex se vuelve visible (translateY(0)) y la home se
 *     anima fuera de pantalla (sus elementos toman las posiciones
 *     finales definidas por CSS: logo arriba-izquierda, ash a la
 *     izquierda, slider a la derecha, pokedex cerrada + botones
 *     abajo).
 *   - Al pulsar el botón "Volver al inicio" (logo arriba-izquierda),
 *     `data-view` vuelve a "home" y la Pokédex baja con su
 *     animación inversa. La URL sigue en `/`.
 *
 * Lo que NO probamos aquí (y está bien):
 *   - Volumen de la música: el fade está implementado en
 *     `musicViewBinder.tsx` y se prueba por separado.
 *   - Los detalles internos de cada slot: eso vive en los tests
 *     unitarios de cada slot.
 *   - `prefers-reduced-motion`: ya hay cobertura en otros specs;
 *     añadirla aquí duplicaría tiempo sin valor.
 */

const PRESS_START_NAME = /entrar a la pokédex/i;
const VOLVER_AL_INICIO_NAME = /volver al inicio/i;

test.describe("Transición Inicio ↔ Pokédex (SPA, una sola URL)", () => {
  test("al cargar la home, data-view='home' y la Pokédex está pre-renderizada offscreen", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });
    await expect(shell).toHaveAttribute("data-view", "home", {
      timeout: 15_000,
    });

    // El shell de la Pokédex está SIEMPRE en el DOM (offscreen).
    const pokedexShell = page.getByTestId("pokedex-shell");
    await expect(pokedexShell).toBeAttached();

    // Está oculto (transform translateY(100%) aplicado por CSS).
    const transform = await pokedexShell
      .locator("xpath=..")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(transform).not.toBe("matrix(1, 0, 0, 1, 0, 0)");
  });

  test("pulsar PRESS START cambia data-view a 'pokedex' sin cambiar la URL", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });
    await expect(shell).toHaveAttribute("data-view", "home", {
      timeout: 15_000,
    });

    await page.getByRole("button", { name: PRESS_START_NAME }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(shell).toHaveAttribute("data-view", "pokedex");
    await expect(page.getByTestId("pokedex-shell")).toBeVisible();
  });

  test("pulsar una letra (a) también navega sin cambiar URL", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });

    await page.waitForFunction(
      () => document.querySelector('[data-home-nav-ready="true"]') !== null,
      { timeout: 30_000 },
    );

    await page.keyboard.press("a");

    await expect(page).toHaveURL(/\/$/);
    await expect(shell).toHaveAttribute("data-view", "pokedex");
  });

  test("pulsar Enter también navega sin cambiar URL", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });

    await page.waitForFunction(
      () => document.querySelector('[data-home-nav-ready="true"]') !== null,
      { timeout: 30_000 },
    );

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/$/);
    await expect(shell).toHaveAttribute("data-view", "pokedex");
  });

  test("en la vista pokedex, los elementos de la home se animan fuera de pantalla", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });
    await expect(shell).toHaveAttribute("data-view", "home", {
      timeout: 15_000,
    });

    await page.getByRole("button", { name: PRESS_START_NAME }).click();
    await expect(shell).toHaveAttribute("data-view", "pokedex");

    // El logo de la home: el contenedor `.home-exit-target-logo`
    // existe en el DOM (la home está pre-renderizada), pero su CSS
    // transform debe haberlo movido fuera de su sitio original.
    const logoTransform = await page
      .locator(".home-exit-target-logo")
      .first()
      .evaluate((el) => getComputedStyle(el).transform);
    expect(logoTransform).not.toBe("none");
    expect(logoTransform).not.toBe("matrix(1, 0, 0, 1, 0, 0)");

    // El contenedor `.home-view` debe estar con opacity 0 (es el
    // estado final de la transición de salida) y sin pointer-events.
    const homeViewOpacity = await page
      .locator(".home-view")
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(homeViewOpacity)).toBeLessThan(0.05);

    const homeViewPointerEvents = await page
      .locator(".home-view")
      .first()
      .evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(homeViewPointerEvents).toBe("none");
  });

  test("el botón 'Volver al inicio' devuelve la vista a 'home' sin cambiar URL", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });

    await page.getByRole("button", { name: PRESS_START_NAME }).click();
    await expect(shell).toHaveAttribute("data-view", "pokedex");

    await page.getByRole("button", { name: VOLVER_AL_INICIO_NAME }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(shell).toHaveAttribute("data-view", "home");
  });

  test("la Pokédex NO se desmonta al volver a la home (sigue en el DOM)", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });

    await page.getByRole("button", { name: PRESS_START_NAME }).click();
    await expect(shell).toHaveAttribute("data-view", "pokedex");

    // Tras volver, la Pokédex sigue pre-renderizada offscreen.
    await page.getByRole("button", { name: VOLVER_AL_INICIO_NAME }).click();
    await expect(shell).toHaveAttribute("data-view", "home");

    // Sigue en el DOM, sólo oculta.
    const pokedexShell = page.getByTestId("pokedex-shell");
    await expect(pokedexShell).toBeAttached();
    const pokedexViewTransform = await pokedexShell
      .locator("xpath=..")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(pokedexViewTransform).not.toBe("matrix(1, 0, 0, 1, 0, 0)");
  });

  test("la transición es cíclica: home → pokedex → home → pokedex funciona", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("app-shell");
    await shell.waitFor({ state: "attached", timeout: 30_000 });

    await expect(shell).toHaveAttribute("data-view", "home");
    await page.getByRole("button", { name: PRESS_START_NAME }).click();
    await expect(shell).toHaveAttribute("data-view", "pokedex");
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("button", { name: VOLVER_AL_INICIO_NAME }).click();
    await expect(shell).toHaveAttribute("data-view", "home");
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("button", { name: PRESS_START_NAME }).click();
    await expect(shell).toHaveAttribute("data-view", "pokedex");
    await expect(page).toHaveURL(/\/$/);
  });

  test("/pokedex redirige a / y deja la app en estado home", async ({
    page,
  }) => {
    const response = await page.goto("/pokedex", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("app-shell")).toHaveAttribute(
      "data-view",
      "home",
    );
  });
});
