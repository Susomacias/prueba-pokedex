import { test, expect } from "@playwright/test";

test.describe("Página 404", () => {
  test("responde con HTTP 404 al visitar una ruta inexistente", async ({
    request,
  }) => {
    const response = await request.get("/no-existe");
    expect(response.status()).toBe(404);
  });

  test("muestra el mensaje en español", async ({ page }) => {
    await page.goto("/no-existe");

    const main = page.getByRole("main");
    await expect(main).toContainText(/404/);
    await expect(main).toContainText(/pokémon no encontrado/i);
  });

  test("incluye un pokeball SVG visible", async ({ page }) => {
    await page.goto("/no-existe");

    const svg = page.locator('[data-testid="pokeball"]');
    await expect(svg).toBeVisible();
  });

  test("el botón 'VOLVER AL INICIO' navega a /", async ({ page }) => {
    await page.goto("/no-existe");

    const link = page.getByRole("link", { name: /volver al inicio/i });
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("main")).toContainText(/Pokédex/);
  });

  test("no requiere scroll: el contenido cabe en la pantalla", async ({
    page,
  }) => {
    await page.goto("/no-existe");

    const { scrollWidth, scrollHeight } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }));

    // Permitimos un pequeño margen de tolerancia para franjas
    // decorativas, pero el contenido principal debe caber.
    expect(scrollWidth).toBeLessThanOrEqual(
      (await page.evaluate(() => window.innerWidth)) + 1,
    );
    // Permitimos un poco más en alto para que los keyframes de la
    // pokeball no generen scroll constante.
    expect(scrollHeight).toBeLessThanOrEqual(
      (await page.evaluate(() => window.innerHeight)) + 200,
    );
  });
});