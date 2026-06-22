import { test, expect } from "@playwright/test";

/**
 * Plan 05.4 — E2E del switch responsive vertical/horizontal y layout
 * sin scroll en `/pokedex`.
 *
 * Cubre los criterios de aceptación:
 *   - La ruta `/pokedex` renderiza el shell (`data-testid="pokedex-shell"`)
 *     y dentro un `<svg>`.
 *   - No hay scroll horizontal ni vertical:
 *       scrollWidth <= innerWidth
 *       scrollHeight <= innerHeight + small tolerance
 *   - En un viewport pequeño la carcasa es vertical; en uno grande,
 *     horizontal (verificable por `data-orientation` en el host).
 *   - El `<g data-slot="CARCASA">` siempre está presente (capa base
 *     siempre renderizada).
 */

test.describe("/pokedex — switch responsive y sin scroll (Plan 05.4)", () => {
  test("renderiza el shell con la Pokédex visible", async ({ page }) => {
    await page.goto("/pokedex");
    const shell = page.getByTestId("pokedex-shell");
    await expect(shell).toBeVisible();
    // El SVG siempre está montado; verificamos que está en el DOM con
    // un viewBox correcto y dimensiones explícitas (width/height) para
    // que se vea sin generar scroll.
    const svg = shell.locator("svg").first();
    await expect(svg).toBeAttached();
    await expect(svg).toHaveAttribute("viewBox", /\d/);
    await expect(svg).toHaveAttribute("width", "100%");
    await expect(svg).toHaveAttribute("height", "100%");
  });

  test("no genera scroll horizontal ni vertical en viewport desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pokedex");

    const measurements = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }));

    // Sin scroll horizontal
    expect(measurements.scrollWidth).toBeLessThanOrEqual(
      measurements.innerWidth + 1,
    );
    // Sin scroll vertical (tolerancia pequeña por barras del SO)
    expect(measurements.scrollHeight).toBeLessThanOrEqual(
      measurements.innerHeight + 1,
    );
  });

  test("no genera scroll horizontal ni vertical en viewport mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto("/pokedex");

    const measurements = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }));

    expect(measurements.scrollWidth).toBeLessThanOrEqual(
      measurements.innerWidth + 1,
    );
    expect(measurements.scrollHeight).toBeLessThanOrEqual(
      measurements.innerHeight + 1,
    );
  });

  test("elige carcasa horizontal en viewport >= 768px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pokedex");

    const orientation = await page
      .getByTestId("pokedex-shell")
      .locator("[data-shell-host]")
      .getAttribute("data-orientation");
    expect(orientation).toBe("horizontal");
  });

  test("elige carcasa vertical en viewport < 768px", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto("/pokedex");

    const orientation = await page
      .getByTestId("pokedex-shell")
      .locator("[data-shell-host]")
      .getAttribute("data-orientation");
    expect(orientation).toBe("vertical");
  });

  test("siempre expone el slot CARCASA en el DOM", async ({ page }) => {
    await page.goto("/pokedex");
    const carcasa = page.locator('[data-slot="CARCASA"]');
    await expect(carcasa).toHaveCount(1);
  });
});
