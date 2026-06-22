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
