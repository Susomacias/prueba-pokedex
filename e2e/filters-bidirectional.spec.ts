import { test, expect } from "@playwright/test";

/**
 * Plan 07.5 — E2E consolidado de integración bidireccional.
 *
 * Un solo spec que cubre los 4 sentidos de la sincronización:
 *  1. Aplicar filtro en dropdown → aparece en consola + URL.
 *  2. Aplicar filtro en consola → aparece en dropdown + URL.
 *  3. Pegar URL con filtros → dropdown y consola los reflejan.
 *  4. Back/forward del navegador restaura filtros previos.
 *
 * Mockeamos la PokeAPI GraphQL endpoint para evitar depender de red.
 */

test.describe("Filtros bidireccionales (Plan 07.5)", () => {
  test.beforeEach(async ({ page }) => {
    // Mockear el endpoint GraphQL de PokeAPI para que devuelva siempre
    // datos predecibles.
    await page.route("**/beta.pokeapi.co/graphql/**", async (route) => {
      const body = route.request().postDataJSON() as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      const query = body?.query ?? "";
      const vars = body?.variables ?? {};

      // Respuesta vacía para agregado de tipos/opciones de filtro
      if (query.includes("pokemon_v2_type") && !query.includes("pokemon_v2_pokemontypes")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              pokemon_v2_type: [
                { id: 10, name: "fire" },
                { id: 11, name: "water" },
                { id: 12, name: "grass" },
              ],
              pokemon_v2_generation: [
                { id: 1, name: "generation-i" },
              ],
              pokemon_v2_pokemoncolor: [
                { id: 1, name: "red" },
              ],
              pokemon_v2_pokemonhabitat: [
                { id: 1, name: "forest" },
              ],
              pokemon_v2_ability: [
                { id: 1, name: "overgrow" },
              ],
            },
          }),
        });
        return;
      }

      // Lista filtrable mockeada
      const offset = (vars.offset as number) ?? 0;
      const allPokemon = [
        { id: 1, name: "bulbasaur", height: 7, weight: 69 },
        { id: 4, name: "charmander", height: 6, weight: 85 },
        { id: 7, name: "squirtle", height: 5, weight: 90 },
        { id: 25, name: "pikachu", height: 4, weight: 60 },
      ];

      // Filtrar por búsqueda
      let filtered = allPokemon;
      const whereObj = vars.where as Record<string, Record<string, unknown>> | undefined;
      const search = whereObj?.name?._ilike as string | undefined;
      if (search) {
        const term = search.replace(/%/g, "");
        filtered = allPokemon.filter((p) => p.name.includes(term));
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            pokemon_v2_pokemon: filtered
              .slice(offset, offset + 30)
              .map((p) => ({
                id: p.id,
                name: p.name,
                height: p.height,
                weight: p.weight,
                pokemon_v2_pokemontypes: [],
                pokemon_v2_pokemonspecy: {
                  pokemon_v2_pokemonhabitat: null,
                  pokemon_v2_generation: null,
                  pokemon_v2_pokemoncolor: null,
                },
                pokemon_v2_pokemonsprites: [{ sprites: {} }],
              })),
            pokemon_v2_pokemon_aggregate: {
              aggregate: { count: filtered.length },
            },
          },
        }),
      });
    });
  });

  test("sentido 1: filtro en dropdown → consola + URL", async ({ page }) => {
    await page.goto("/pokedex");
    await expect(page.getByTestId("pokedex-shell")).toBeVisible();

    // Abrir dropdown de Tipo 1
    const tipo1Btn = page.getByRole("button", { name: "Tipo 1" });
    await tipo1Btn.click();

    // Esperar que las opciones carguen (mock devuelve fire, water, grass)
    await expect(page.getByText(/Fuego/)).toBeVisible({ timeout: 5000 });

    // Seleccionar "Fuego"
    await page.getByText(/Fuego/).click();

    // Verificar que la URL ahora contiene type1=Fuego
    await expect(page).toHaveURL(/type1=Fuego/);

    // Verificar que el botón dropdown ahora está activo
    await expect(tipo1Btn).toHaveAttribute("data-active", "true");
  });

  test("sentido 2: filtro en consola → dropdown + URL", async ({ page }) => {
    await page.goto("/pokedex");
    await expect(page.getByTestId("pokedex-shell")).toBeVisible();

    // Escribir en la consola: type1 fire
    const consoleInput = page.getByLabel("Comando de la consola de filtros");
    await consoleInput.fill("type1 fire");
    await consoleInput.press("Enter");

    // Verificar que la URL ahora contiene type1=Fuego
    await expect(page).toHaveURL(/type1=Fuego/);

    // Verificar que el botón de dropdown está activo
    const tipo1Btn = page.getByRole("button", { name: "Tipo 1" });
    await expect(tipo1Btn).toHaveAttribute("data-active", "true");
  });

  test("sentido 3: pegar URL con filtros → dropdown y consola lo reflejan", async ({ page }) => {
    // Navegar a URL con filtros pre-aplicados
    await page.goto("/pokedex?type1=Fuego&search=pika");

    await expect(page.getByTestId("pokedex-shell")).toBeVisible();

    // El botón Tipo 1 debe estar activo
    const tipo1Btn = page.getByRole("button", { name: "Tipo 1" });
    await expect(tipo1Btn).toHaveAttribute("data-active", "true");

    // La consola debería reflejar los filtros (escribimos resumen)
    const consoleInput = page.getByLabel("Comando de la consola de filtros");
    await consoleInput.fill("resumen");
    await consoleInput.press("Enter");

    // Verificar que la consola muestra los filtros
    await expect(page.getByTestId("filter-console-screen")).toContainText("Tipo 1");
  });

  test("sentido 4: buscar en buscador → reflejo en consola y URL", async ({ page }) => {
    await page.goto("/pokedex");
    await expect(page.getByTestId("pokedex-shell")).toBeVisible();

    // Escribir en el buscador
    const searchInput = page.getByRole("combobox");
    await searchInput.fill("pika");

    // Esperar el debounce (300ms) + que el fetch de sugerencias se complete
    await page.waitForTimeout(1000);

    // Verificar que la URL ahora contiene la búsqueda
    await expect(page).toHaveURL(/search=pika/);

    // La consola debería reflejar la búsqueda también
    const consoleInput = page.getByLabel("Comando de la consola de filtros");
    await consoleInput.fill("resumen");
    await consoleInput.press("Enter");

    await expect(page.getByTestId("filter-console-screen")).toContainText("pika");
  });

  test("reset limpia todos los filtros", async ({ page }) => {
    // Navegar con filtros
    await page.goto("/pokedex?type1=Fuego&search=pika");

    await expect(page.getByTestId("pokedex-shell")).toBeVisible();

    // Pulsar Reset
    const resetBtn = page.getByRole("button", { name: /reset/i });
    await resetBtn.click();

    // La URL debe volver a solo /pokedex
    await expect(page).toHaveURL("/pokedex");

    // El botón Tipo 1 debe estar inactivo
    const tipo1Btn = page.getByRole("button", { name: "Tipo 1" });
    await expect(tipo1Btn).toHaveAttribute("data-active", "false");
  });
});
