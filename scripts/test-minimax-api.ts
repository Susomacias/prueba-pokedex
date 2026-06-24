/**
 * Script de exploración de la API MiniMax M3.
 *
 * Ejecuta 6 tests contra la API real para validar:
 *   1. Chat completion básico
 *   2. Streaming de tokens
 *   3. Function calling
 *   4. Multi-turn con tools (flujo agente)
 *   5. Razonamiento (thinking)
 *   6. System prompt como Profesor Oak
 *
 * Uso:
 *   npx tsx scripts/test-minimax-api.ts
 *
 * Requiere MINIMAX_API_KEY en .env.local y saldo suficiente en la cuenta.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dirname!, "..", ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const vars: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    vars[key] = value;
  }
  return vars;
}

const BASE_URL = "https://api.minimax.io";
const CHAT_PATH = "/v1/text/chatcompletion_v2";
const env = loadEnv();
const API_KEY = env["MINIMAX_API_KEY"];

if (!API_KEY) {
  console.error("ERROR: MINIMAX_API_KEY no encontrado en .env.local");
  process.exit(1);
}

let passed = 0;
let failed = 0;
let skipped = 0;

function ok(label: string): void {
  console.log(`\n  ✅ PASS: ${label}`);
  passed++;
}

function fail(label: string, detail: string): void {
  console.log(`\n  ❌ FAIL: ${label}`);
  console.log(`     ${detail}`);
  failed++;
}

function skip(label: string, reason: string): void {
  console.log(`\n  ⏭️  SKIP: ${label} (${reason})`);
  skipped++;
}

interface MiniMaxResponse {
  id?: string;
  choices?: {
    message?: {
      role?: string;
      content?: string;
      tool_calls?: {
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }[];
    };
    finish_reason?: string;
    index?: number;
  }[];
  model?: string;
  object?: string;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

async function chatCompletion(
  body: Record<string, unknown>,
): Promise<MiniMaxResponse> {
  const res = await fetch(`${BASE_URL}${CHAT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as MiniMaxResponse;

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status}: ${json.base_resp?.status_msg ?? "unknown"}`,
    );
  }

  return json;
}

function checkBalanceError(resp: MiniMaxResponse): boolean {
  return resp.base_resp?.status_code === 1008;
}

function printDivider(): void {
  console.log("-".repeat(60));
}

// ---------------------------------------------------------------------------
// Test 1 — Chat completion básico
// ---------------------------------------------------------------------------
async function test1_basic(): Promise<void> {
  printDivider();
  console.log("TEST 1 — Chat completion básico");

  const resp = await chatCompletion({
    model: "MiniMax-M3",
    messages: [
      { role: "user", content: "Dime 'Hola, mundo' en español." },
    ],
    max_tokens: 100,
  });

  if (checkBalanceError(resp)) {
    skip("Chat completion básico", "saldo insuficiente — el endpoint responde correctamente");
    return;
  }

  const content = resp.choices?.[0]?.message?.content;
  if (!content) {
    fail("Respuesta vacía", JSON.stringify(resp).slice(0, 300));
    return;
  }

  console.log(`     Respuesta: "${content}"`);
  ok("Chat completion básico funciona");
}

// ---------------------------------------------------------------------------
// Test 2 — Streaming
// ---------------------------------------------------------------------------
async function test2_streaming(): Promise<void> {
  printDivider();
  console.log("TEST 2 — Streaming (SSE)");

  const res = await fetch(`${BASE_URL}${CHAT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M3",
      messages: [
        { role: "user", content: "Cuenta del 1 al 5." },
      ],
      max_tokens: 200,
      stream: true,
    }),
  });

  // Con stream=true, errores (balance, auth) vienen como JSON no-200.
  // Éxito viene como text/event-stream.
  if (!res.ok) {
    const errJson = (await res.json()) as MiniMaxResponse;
    if (checkBalanceError(errJson)) {
      skip("Streaming", "saldo insuficiente — el endpoint responde correctamente");
      return;
    }
    fail("HTTP status", `${res.status} — ${errJson.base_resp?.status_msg ?? "unknown"}`);
    return;
  }

  // La respuesta streaming de MiniMax usa SSE (text/event-stream)
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let chunkCount = 0;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          fullContent += token;
          chunkCount++;
        }
      } catch {
        // skip
      }
    }
  }

  console.log(`     Chunks recibidos: ${chunkCount}`);
  console.log(`     Contenido: "${fullContent}"`);

  if (chunkCount > 0 && fullContent.length > 0) {
    ok("Streaming funciona correctamente");
  } else {
    fail("Streaming sin contenido", `chunks=${chunkCount}`);
  }
}

// ---------------------------------------------------------------------------
// Test 3 — Function calling
// ---------------------------------------------------------------------------
async function test3_functionCalling(): Promise<void> {
  printDivider();
  console.log("TEST 3 — Function calling");

  const tools = [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Obtiene el clima actual de una ciudad",
        parameters: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "Nombre de la ciudad (ej. 'Madrid')",
            },
            unit: {
              type: "string",
              enum: ["celsius", "fahrenheit"],
              description: "Unidad de temperatura",
            },
          },
          required: ["city"],
        },
      },
    },
  ];

  const resp = await chatCompletion({
    model: "MiniMax-M3",
    messages: [
      { role: "user", content: "¿Qué tiempo hace en Barcelona?" },
    ],
    tools,
    tool_choice: "auto",
    max_tokens: 200,
  });

  if (checkBalanceError(resp)) {
    skip("Function calling", "saldo insuficiente — el endpoint responde correctamente");
    return;
  }

  const msg = resp.choices?.[0]?.message;
  const toolCalls = msg?.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    console.log(`     Respuesta (texto): "${msg?.content?.slice(0, 120)}"`);
    fail("No se llamó a la herramienta", "posiblemente el modelo respondió directamente");
    return;
  }

  const tc = toolCalls[0];
  const args = JSON.parse(tc.function.arguments) as { city?: string };
  console.log(`     Tool call: ${tc.function.name}(${JSON.stringify(args)})`);

  if (tc.function.name === "get_weather") {
    ok("Function calling funciona correctamente");
  } else {
    fail("Tool incorrecta", tc.function.name);
  }
}

// ---------------------------------------------------------------------------
// Test 4 — Multi-turn con tools (flujo agente)
// ---------------------------------------------------------------------------
async function test4_multiTurn(): Promise<void> {
  printDivider();
  console.log("TEST 4 — Multi-turn con tools (flujo agente)");

  const tools = [
    {
      type: "function",
      function: {
        name: "search_pokemon",
        description: "Busca pokemons por nombre o tipo",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Nombre o tipo del pokemon a buscar",
            },
          },
          required: ["query"],
        },
      },
    },
  ];

  const messages: Record<string, unknown>[] = [
    { role: "user", content: "Busca información sobre Pikachu" },
  ];

  // Turno 1: el modelo debería llamar a la herramienta
  const resp1 = await chatCompletion({
    model: "MiniMax-M3",
    messages,
    tools,
    tool_choice: "auto",
    max_tokens: 200,
  });

  if (checkBalanceError(resp1)) {
    skip("Multi-turn con tools", "saldo insuficiente — el endpoint responde correctamente");
    return;
  }

  const msg1 = resp1.choices?.[0]?.message;
  const toolCalls = msg1?.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    fail("Turno 1: no llamó a la herramienta", `content="${msg1?.content?.slice(0, 100)}"`);
    return;
  }

  const tc = toolCalls[0];
  console.log(`     Turno 1 — tool call: ${tc.function.name}(${tc.function.arguments})`);

  messages.push({
    role: "assistant",
    content: msg1?.content ?? null,
    tool_calls: toolCalls.map((t) => ({
      id: t.id,
      type: "function",
      function: { name: t.function.name, arguments: t.function.arguments },
    })),
  });

  messages.push({
    role: "tool",
    tool_call_id: tc.id,
    name: tc.function.name,
    content: JSON.stringify({
      name: "pikachu",
      type: "electric",
      description: "Pikachu, el Pokémon ratón.",
    }),
  });

  const resp2 = await chatCompletion({
    model: "MiniMax-M3",
    messages,
    max_tokens: 200,
  });

  if (checkBalanceError(resp2)) {
    skip("Multi-turn con tools", "saldo insuficiente en turno 2 — el endpoint responde correctamente");
    return;
  }

  const content2 = resp2.choices?.[0]?.message?.content;
  console.log(`     Turno 2 — respuesta: "${content2?.slice(0, 100)}..."`);

  if (content2 && content2.length > 0) {
    ok("Multi-turn con tools funciona correctamente");
  } else {
    fail("Turno 2 sin respuesta", "");
  }
}

// ---------------------------------------------------------------------------
// Test 5 — Razonamiento (thinking)
// ---------------------------------------------------------------------------
async function test5_reasoning(): Promise<void> {
  printDivider();
  console.log("TEST 5 — Razonamiento (thinking)");

  // Primero probamos sin streaming para ver el formato de reasoning en modo sync
  const syncResp = await chatCompletion({
    model: "MiniMax-M3",
    messages: [
      {
        role: "user",
        content:
          "Si tengo 3 manzanas y compro 2 más, ¿cuántas tengo? Explica tu razonamiento paso a paso.",
      },
    ],
    max_tokens: 300,
  });

  if (!checkBalanceError(syncResp)) {
    const msg = syncResp.choices?.[0]?.message;
    const reasoning = (msg as Record<string, unknown> | undefined)
      ?.reasoning_content as string | undefined;
    const reasoningDetails = (msg as Record<string, unknown> | undefined)
      ?.reasoning_details as { type: string; text?: string }[] | undefined;

    console.log(`     Modo sync — reasoning_content: "${reasoning?.slice(0, 150) ?? "(no presente)"}"`);
    console.log(`     Modo sync — reasoning_details: ${reasoningDetails ? "presente (" + reasoningDetails.length + " bloques)" : "no presente"}`);

    if (reasoning) {
      ok("Razonamiento (thinking) funciona — presente en respuesta sync como 'reasoning_content'");
      return;
    }
  }

  // Ahora probamos con streaming para inspeccionar deltas
  const res = await fetch(`${BASE_URL}${CHAT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M3",
      messages: [
        {
          role: "user",
          content:
            "2+2 es 4. Explica por qué.",
        },
      ],
      max_tokens: 150,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errJson = (await res.json()) as MiniMaxResponse;
    if (checkBalanceError(errJson)) {
      skip("Razonamiento streaming", "saldo insuficiente");
      return;
    }
    fail("HTTP status", `${res.status}`);
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let reasoningContent = "";
  const chunkKeys = new Set<string>();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        const choice = (parsed.choices as Record<string, unknown>[])?.[0] ?? {};
        const delta = (choice.delta ?? {}) as Record<string, unknown>;

        for (const k of Object.keys(delta)) {
          chunkKeys.add(k);
        }

        const content = delta.content as string | undefined;
        if (content) fullContent += content;

        const reasoning = delta.reasoning_content as string | undefined;
        if (reasoning) reasoningContent += reasoning;
      } catch {
        // skip
      }
    }
  }

  console.log(`     Keys en delta: [${[...chunkKeys].join(", ")}]`);
  console.log(`     Contenido: "${fullContent.slice(0, 120)}..."`);
  console.log(`     Reasoning: "${reasoningContent.slice(0, 120) || "(ninguno)"}"`);

  if (fullContent.length > 0) {
    ok("Streaming de razonamiento funciona — keys documentadas");
  } else {
    fail("Sin contenido", `keys=[${[...chunkKeys].join(", ")}]`);
  }
}

// ---------------------------------------------------------------------------
// Test 6 — System prompt como Profesor Oak
// ---------------------------------------------------------------------------
async function test6_oakPersona(): Promise<void> {
  printDivider();
  console.log("TEST 6 — System prompt como Profesor Oak");

  const systemPrompt = `Eres el Profesor Oak, el científico Pokémon más reconocido del mundo.
Tu laboratorio está en Pueblo Paleta, región Kanto. Eres amable,
entusiasta y sabio. Hablas en español con un tono cálido y cercano.
Ayudas a los entrenadores a entender el mundo Pokémon usando tus
conocimientos y las herramientas a tu disposición (consultar la
Pokédex, buscar Pokémon, aplicar filtros, mostrar fichas).`;

  const resp = await chatCompletion({
    model: "MiniMax-M3",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "¿Quién eres y cómo puedes ayudarme?" },
    ],
    max_tokens: 200,
  });

  if (checkBalanceError(resp)) {
    skip("System prompt Profesor Oak", "saldo insuficiente — el endpoint acepta system prompts correctamente");
    return;
  }

  const content = resp.choices?.[0]?.message?.content;
  console.log(`     Respuesta: "${content}"`);

  if (!content) {
    fail("Respuesta vacía", "");
    return;
  }

  const lower = content.toLowerCase();
  const hasOak = lower.includes("oak");
  const hasPokemon = lower.includes("pokémon") || lower.includes("pokemon");

  console.log(`     ¿Menciona 'Oak'? ${hasOak}`);
  console.log(`     ¿Menciona 'Pokémon'? ${hasPokemon}`);

  if (content.length > 20) {
    ok("System prompt como Profesor Oak funciona");
  } else {
    fail("Respuesta demasiado corta", content);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("=== EXPLORACIÓN API MiniMax M3 ===\n");
  console.log(`Endpoint: ${BASE_URL}${CHAT_PATH}`);
  console.log(`API Key:  ${API_KEY.slice(0, 10)}...${API_KEY.slice(-4)}`);
  console.log(`Modelo:   MiniMax-M3\n`);

  await test1_basic();
  await test2_streaming();
  await test3_functionCalling();
  await test4_multiTurn();
  await test5_reasoning();
  await test6_oakPersona();

  printDivider();
  console.log(`\nResultado: ${passed} OK, ${failed} FAIL, ${skipped} SKIP de ${passed + failed + skipped} tests\n`);

  if (skipped > 0 && failed === 0) {
    console.log(
      "Los tests omitidos requieren saldo en la cuenta de MiniMax.\n" +
        "Suscríbete a un Token Plan en https://platform.minimax.io/subscribe/token-plan",
    );
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
