import { test, expect } from "@playwright/test";

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

  await page.getByRole("link", { name: /entrar a la pokédex/i }).click();
  await expect(page).toHaveURL(/\/pokedex$/);
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
