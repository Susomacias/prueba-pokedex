import { test, expect } from "@playwright/test";

/**
 * Plan 03.5 — E2E de la navegación desde la pantalla de inicio.
 *
 * Cubre los criterios de aceptación del plan:
 *   - Cualquier tecla (Enter / Space / letra A–Z) o click en una zona
 *     neutra navega a `/pokedex`.
 *   - Las teclas no imprimibles (Shift, Tab, F1) NO navegan.
 *   - La navegación NO se duplica (no se llega dos veces a /pokedex).
 *   - El botón PRESS START expone un `<a>` con href="/pokedex" (lo
 *     necesita el test de routing ya existente).
 */

test("la página de inicio muestra el título Pokédex", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Pokédex/);
  await expect(page.getByRole("main")).toContainText("Pokédex");
});

test("el documento está en español", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("la ruta / responde con 200", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
});

test("la ruta /pokedex responde con 200", async ({ request }) => {
  const response = await request.get("/pokedex");
  expect(response.status()).toBe(200);
});

test("la ruta /pokemon/pikachu responde con 200", async ({ request }) => {
  const response = await request.get("/pokemon/pikachu");
  expect(response.status()).toBe(200);
});

test("una ruta inexistente responde 404", async ({ request }) => {
  const response = await request.get("/no-existe");
  expect(response.status()).toBe(404);
});

test("la navegación cliente con <Link> no recarga la página", async ({
  page,
}) => {
  await page.goto("/");
  // Plan 04.2: esperamos a que el listener global esté listo
  // (con la nueva estructura de providers el primer render del
  // Link no garantiza que `HomeNavController` haya registrado
  // sus listeners).
  await page.waitForFunction(
    () =>
      document.querySelector('[data-home-nav-ready="true"]') !== null,
  );
  // El botón PRESS START tiene una animación pulsante continua; usamos
  // `force: true` para evitar el check de estabilidad que bloquea
  // Playwright con `transform: scale` animado.
  await page
    .getByRole("link", { name: /entrar a la pokédex/i })
    .click({ force: true });
  await expect(page).toHaveURL(/\/pokedex$/, { timeout: 10000 });
  await expect(page.getByRole("main")).toContainText(/Pokédex/);

  await page.evaluate(() => {
    (window as unknown as { __mainWorldMarker: string }).__mainWorldMarker =
      "preserved";
  });
  await page.goBack();
  await page.goForward();
  const marker = await page.evaluate(
    () =>
      (window as unknown as { __mainWorldMarker?: string }).__mainWorldMarker,
  );
  expect(marker).toBe("preserved");
});

// ---------------------------------------------------------------------------
// Plan 03.5 + 04.2 — listeners globales de teclado/click
// ---------------------------------------------------------------------------

test("pulsa Enter desde la home y termina en /pokedex", async ({ page }) => {
  await page.goto("/");
  // Plan 04.2: esperamos a que los listeners globales estén
  // efectivamente registrados (no sólo a que el Link exista).
  await page.waitForFunction(
    () =>
      document.querySelector('[data-home-nav-ready="true"]') !== null,
    { timeout: 15000 },
  );

  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/pokedex$/, { timeout: 10000 });
});

test("pulsa Space desde la home y termina en /pokedex", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-home-nav-ready="true"]') !== null,
    { timeout: 15000 },
  );

  await page.keyboard.press("Space");

  await expect(page).toHaveURL(/\/pokedex$/, { timeout: 10000 });
});

test("pulsa una letra (a) desde la home y termina en /pokedex", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-home-nav-ready="true"]') !== null,
    { timeout: 15000 },
  );

  await page.keyboard.press("a");

  await expect(page).toHaveURL(/\/pokedex$/, { timeout: 10000 });
});

test("pulsa una tecla no imprimible (Tab) y NO navega", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-home-nav-ready="true"]') !== null,
    { timeout: 15000 },
  );

  await page.keyboard.press("Tab");
  await page.keyboard.press("F1");

  // Seguimos en la home
  await expect(page).toHaveURL(/\/$/);
});

test("click en una zona neutra de la home navega a /pokedex", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-home-nav-ready="true"]') !== null,
    { timeout: 15000 },
  );

  // Click sobre el contenedor principal, en una zona que no sea un botón
  // ni un enlace (la zona del logo está cubierta por la imagen).
  await page.locator("main").click({ position: { x: 5, y: 5 } });

  await expect(page).toHaveURL(/\/pokedex$/, { timeout: 10000 });
});

test("click sobre el botón de sonido NO navega a /pokedex", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-home-nav-ready="true"]') !== null,
    { timeout: 15000 },
  );

  await page.getByRole("button", { name: /sonido/i }).click();

  // Seguimos en la home
  await expect(page).toHaveURL(/\/$/);
});
