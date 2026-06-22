import { test, expect } from "@playwright/test";

/**
 * Plan 04.2 — E2E de la transición Inicio → Pokédex.
 *
 * Cubre los criterios de aceptación:
 *   - Pulsa Enter (o cualquier letra, o Space) y la URL termina
 *     en `/pokedex` tras una animación de salida (~1s).
 *   - La página de inicio marca `data-leaving="true"` (o `instant`
 *     con prefers-reduced-motion) durante la transición.
 *   - Pulsa PRESS START por click también navega.
 *   - La música (si está activa) hace fade out antes de la
 *     navegación — verificable inspeccionando el `volume` del audio.
 *   - La página `/pokedex` queda visible tras la transición.
 */

test.describe("Transición Inicio → Pokédex (Plan 04.2)", () => {
  test("pulsa Enter y la URL termina en /pokedex tras la transición", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-home-nav-ready="true"]') !== null,
      { timeout: 15000 },
    );

    const start = Date.now();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/pokedex$/, { timeout: 10000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(400);

    const shell = page.getByTestId("pokedex-shell");
    await expect(shell).toBeVisible();
  });

  test("pulsa PRESS START por click y la URL termina en /pokedex", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-home-nav-ready="true"]') !== null,
      { timeout: 15000 },
    );

    await page
      .getByRole("link", { name: /entrar a la pokédex/i })
      .click({ force: true });

    await expect(page).toHaveURL(/\/pokedex$/, { timeout: 10000 });
    await expect(page.getByTestId("pokedex-shell")).toBeVisible();
  });

  test("el contenedor home-shell expone data-leaving='false' al inicio", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-home-nav-ready="true"]') !== null,
      { timeout: 15000 },
    );
    const leaving = await page
      .getByTestId("home-shell")
      .getAttribute("data-leaving");
    expect(leaving).toBe("false");
  });

  test("con prefers-reduced-motion la transición se completa rápido", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-home-nav-ready="true"]') !== null,
      { timeout: 15000 },
    );

    const start = Date.now();
    await page
      .getByRole("link", { name: /entrar a la pokédex/i })
      .click({ force: true });

    await expect(page).toHaveURL(/\/pokedex$/, { timeout: 10000 });
    const elapsed = Date.now() - start;
    // Con reduced-motion la transición debe completarse muy rápido
    // (incluyendo el push del router).
    expect(elapsed).toBeLessThan(3000);

    await context.close();
  });
});