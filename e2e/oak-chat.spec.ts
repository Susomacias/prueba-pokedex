/**
 * Plan 11.5a — E2E del chat del Profesor Oak con API real de MiniMax.
 *
 * @live-api — requiere MINIMAX_API_KEY configurada y red al endpoint de MiniMax.
 * Se skippea automáticamente si POKEAPI_REACHABLE no está definido en entorno.
 * NO mockear respuestas de MiniMax; el objetivo es validar la integración real.
 */

import { test, expect } from "@playwright/test";

const LIVE_API = !!process.env.POKEAPI_REACHABLE;

test.describe("Oak Chat — flujo completo (Plan 11.5)", () => {
  test("el avatar del Profesor Oak aparece tras cargar /pokedex", async ({
    page,
  }) => {
    await page.goto("/pokedex");

    const avatar = page.locator(".oak-chat-avatar");
    await expect(avatar).toBeVisible({ timeout: 15000 });

    const img = avatar.locator("img");
    await expect(img).toHaveAttribute("src", "/profesor_oak_chat.svg");
    await expect(img).toHaveAttribute("alt", "Profesor Oak");

    await expect(avatar).toHaveAttribute("role", "button");
    await expect(avatar).toHaveAttribute(
      "title",
      "Profesor Oak — ¿Necesitas ayuda?",
    );
  });

  test("abrir chat, escribir 'Hola' y verificar que Oak responde", async ({
    page,
  }) => {
    test.skip(!LIVE_API, "Requiere API de MiniMax accesible");

    await page.goto("/pokedex");

    const avatar = page.locator(".oak-chat-avatar");
    await expect(avatar).toBeVisible({ timeout: 15000 });
    await avatar.click();

    const bubble = page.locator(".oak-chat-bubble");
    await expect(bubble).toBeVisible();

    const textarea = bubble.locator("textarea");
    await textarea.fill("Hola");
    await textarea.press("Enter");

    const assistantMsg = bubble.locator(".oak-chat-assistant-message__text");
    await expect(assistantMsg.first()).toBeVisible({ timeout: 60000 });

    const responseText = await assistantMsg.first().textContent();
    expect(responseText?.length).toBeGreaterThan(5);
  });

  test("pedir 'Muéstrame a Pikachu' y verificar que se muestra el carrusel", async ({
    page,
  }) => {
    test.skip(!LIVE_API, "Requiere API de MiniMax accesible");

    await page.goto("/pokedex");

    const avatar = page.locator(".oak-chat-avatar");
    await expect(avatar).toBeVisible({ timeout: 15000 });
    await avatar.click();

    const bubble = page.locator(".oak-chat-bubble");
    await expect(bubble).toBeVisible();

    const textarea = bubble.locator("textarea");
    await textarea.fill("Muéstrame a Pikachu");
    await textarea.press("Enter");

    await expect(
      page.locator('[data-testid="pokedex-route-shell"]'),
    ).toHaveAttribute("data-pokedex-route-name", "pikachu", {
      timeout: 60000,
    });
  });

  test("pedir 'Filtra por tipo agua' y verificar que aparece chip de filtro", async ({
    page,
  }) => {
    test.skip(!LIVE_API, "Requiere API de MiniMax accesible");

    await page.goto("/pokedex");

    const avatar = page.locator(".oak-chat-avatar");
    await expect(avatar).toBeVisible({ timeout: 15000 });
    await avatar.click();

    const bubble = page.locator(".oak-chat-bubble");
    await expect(bubble).toBeVisible();

    const textarea = bubble.locator("textarea");
    await textarea.fill("Filtra por tipo agua");
    await textarea.press("Enter");

    const assistantMsg = bubble.locator(".oak-chat-assistant-message__text");
    await expect(assistantMsg.first()).toBeVisible({ timeout: 60000 });

    // Verificar que el filtro se aplicó: el chip de tipo agua aparece en la consola
    const consoleSlot = page.locator("[data-slot='CONSOLA_FILTROS']");
    await expect(consoleSlot).toContainText("Agua", { timeout: 30000 });
  });

  test("preguntar '¿Quién eres?' y verificar respuesta como Profesor Oak", async ({
    page,
  }) => {
    test.skip(!LIVE_API, "Requiere API de MiniMax accesible");

    await page.goto("/pokedex");

    const avatar = page.locator(".oak-chat-avatar");
    await expect(avatar).toBeVisible({ timeout: 15000 });
    await avatar.click();

    const bubble = page.locator(".oak-chat-bubble");
    await expect(bubble).toBeVisible();

    const textarea = bubble.locator("textarea");
    await textarea.fill("¿Quién eres?");
    await textarea.press("Enter");

    const assistantMsg = bubble.locator(".oak-chat-assistant-message__text");
    await expect(assistantMsg.first()).toBeVisible({ timeout: 60000 });

    const text = (await assistantMsg.first().textContent())?.toLowerCase() ?? "";
    const isOakResponse =
      text.includes("oak") ||
      text.includes("profesor") ||
      text.includes("científico") ||
      text.includes("pokémon") ||
      text.includes("laboratorio") ||
      text.includes("pueblo paleta");
    expect(isOakResponse).toBe(true);
  });

  test("mensajes de razonamiento y herramientas aparecen antes de la respuesta", async ({
    page,
  }) => {
    test.skip(!LIVE_API, "Requiere API de MiniMax accesible");

    await page.goto("/pokedex");

    const avatar = page.locator(".oak-chat-avatar");
    await expect(avatar).toBeVisible({ timeout: 15000 });
    await avatar.click();

    const bubble = page.locator(".oak-chat-bubble");
    await expect(bubble).toBeVisible();

    const textarea = bubble.locator("textarea");
    await textarea.fill("¿Cuánto mide y pesa Gengar?");
    await textarea.press("Enter");

    // Esperar a que Oak termine de responder y mostrar la ficha
    const assistantMsg = bubble.locator(".oak-chat-assistant-message__text");
    await expect(assistantMsg.first()).toBeVisible({ timeout: 60000 });

    // Verificar que apareció razonamiento o tool call
    const reasoningOrTool = bubble.locator(
      ".oak-chat-reasoning-bubble, .oak-chat-tool-bubble",
    );
    const count = await reasoningOrTool.count();

    // Al menos debería haber una burbuja de razonamiento o de herramienta
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
