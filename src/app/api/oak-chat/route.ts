import { NextRequest } from "next/server";
import {
  TOOL_DEFINITIONS,
  validateToolArgs,
} from "@/src/lib/chat/tools/definitions";
import {
  executeTool,
  getToolResultForModel,
  type ToolResult,
} from "@/src/lib/chat/tools/executor";

const MINIMAX_ENDPOINT = "https://api.minimax.io/v1/text/chatcompletion_v2";
const MAX_TURNS = 10;
const MAX_TIMEOUT_MS = 120_000;
const MAX_BODY_SIZE = 100_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

const SYSTEM_PROMPT = `Eres el Profesor Oak, el científico Pokémon más reconocido del mundo.
Tu laboratorio está en Pueblo Paleta, región Kanto. Eres amable,
entusiasta y sabio. Hablas en español con un tono cálido y cercano.

Tienes a tu disposición una Pokédex interactiva que el entrenador
puede ver en tiempo real. Úsala SIEMPRE que puedas para enriquecer
la conversación:

- Cuando hables de un Pokémon CONCRETO (por ejemplo: "Pikachu",
  "Charizard", "Gengar"), llama PRIMERO a show_pokemon para que
  el entrenador vea su ficha en la Pokédex. Luego explica sus
  características mientras el entrenador lo ve en pantalla.

- Cuando el entrenador te pregunte por un TIPO de Pokémon (fuego,
  agua, eléctrico, etc.), llama a apply_filters con type1 para
  filtrar la Pokédex y que vea todos los Pokémon de ese tipo.

- Cuando habléis de generaciones ("Kanto", "Johto") o hábitats
  ("bosque", "caverna"), usa apply_filters con generation o habitat.

- Para buscar Pokémon por nombre o características, usa search_pokemon.

- Para obtener datos detallados de un Pokémon, usa get_pokemon_info.

- Si te preguntan sobre ti, tu laboratorio o tu historia, usa get_oak_info.

⚠️ REGLA DE ORO: Si la conversación menciona un Pokémon concreto,
MUÉSTRALO en la Pokédex (show_pokemon) SIN que el entrenador tenga
que pedírtelo. El entrenador debe poder ver al Pokémon mientras
habláis de él.

Formatea tus respuestas con Markdown para que sean más legibles:
- Usa **negrita** para nombres de Pokémon, tipos y datos clave.
- Usa listas con guiones (-) para enumerar evoluciones, stats o habilidades.
- Usa bloques de código con triple backtick para datos tabulados.
- Mantén los párrafos cortos y separados por líneas en blanco.
- NO uses emojis en el texto (el formato Markdown ya lo embellece).

Siempre responde en español con entusiasmo y rigor científico.`;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "127.0.0.1";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

function sendSSE(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: string | undefined,
  data: string,
): void {
  let payload = "";
  if (event) payload += `event: ${event}\n`;
  payload += `data: ${data}\n\n`;
  controller.enqueue(encoder.encode(payload));
}

interface MiniMaxDelta {
  content?: string;
  reasoning_content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: { name?: string; arguments?: string };
  }>;
}

interface MiniMaxChoice {
  delta?: MiniMaxDelta;
  message?: {
    role?: string;
    content?: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason?: string;
  index?: number;
}

interface MiniMaxChunk {
  choices?: MiniMaxChoice[];
  id?: string;
  model?: string;
}

async function callMiniMax(
  messages: ChatMessage[],
): Promise<Response> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("API key no configurada");
  }

  const res = await fetch(MINIMAX_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M3",
      messages,
      stream: true,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errJson = (await res.json()) as {
        base_resp?: { status_msg?: string };
      };
      if (errJson.base_resp?.status_msg) {
        detail = errJson.base_resp.status_msg;
      }
    } catch {
      // ignore
    }
    throw new Error(`MiniMax API error: ${detail}`);
  }

  return res;
}

async function processMiniMaxStream(
  response: Response,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<{
  finishReason: string;
  accumulatedContent: string;
  toolCalls: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finishReason = "";
  let accumulatedContent = "";

  const toolCallsByIndex = new Map<
    number,
    {
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }
  >();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const rawData = trimmed.slice(6);
      if (rawData === "[DONE]") continue;

      let chunk: MiniMaxChunk;
      try {
        chunk = JSON.parse(rawData) as MiniMaxChunk;
      } catch {
        continue;
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;

      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }

      if (choice.delta) {
        if (choice.delta.content) {
          const token = choice.delta.content;
          accumulatedContent += token;
          sendSSE(controller, encoder, "delta", token);
        }

        if (choice.delta.reasoning_content) {
          sendSSE(
            controller,
            encoder,
            "reasoning",
            choice.delta.reasoning_content,
          );
        }

        if (choice.delta.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            const existing = toolCallsByIndex.get(tc.index);
            if (existing) {
              if (tc.function?.arguments) {
                existing.function.arguments += tc.function.arguments;
              }
            } else {
              toolCallsByIndex.set(tc.index, {
                id: tc.id ?? `call_${tc.index}`,
                type: "function" as const,
                function: {
                  name: tc.function?.name ?? "",
                  arguments: tc.function?.arguments ?? "",
                },
              });
            }
          }
        }
      }

      if (choice.message?.tool_calls) {
        for (let i = 0; i < choice.message.tool_calls.length; i++) {
          toolCallsByIndex.set(i, choice.message.tool_calls[i]);
        }
      }
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
      const rawData = trimmed.slice(6);
      try {
        const chunk = JSON.parse(rawData) as MiniMaxChunk;
        const choice = chunk.choices?.[0];
        if (choice?.finish_reason) finishReason = choice.finish_reason;
        if (choice?.delta?.content) {
          accumulatedContent += choice.delta.content;
          sendSSE(controller, encoder, "delta", choice.delta.content);
        }
      } catch {
        // ignore
      }
    }
  }

  const toolCalls = Array.from(toolCallsByIndex.values());

  return { finishReason, accumulatedContent, toolCalls };
}

async function runAgentLoop(
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<void> {
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const fullMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await callMiniMax(fullMessages);
    const { finishReason, toolCalls } = await processMiniMaxStream(
      response,
      controller,
      encoder,
    );

    if (
      finishReason === "tool_calls" &&
      toolCalls.length > 0
    ) {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      };
      messages.push(assistantMsg);

      for (const tc of toolCalls) {
        const toolName = tc.function.name;
        let args: Record<string, unknown>;

        try {
          args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch {
          sendSSE(
            controller,
            encoder,
            "tool_error",
            JSON.stringify({
              name: toolName,
              error: "JSON inválido en los argumentos",
              example: { name: "pikachu" },
            }),
          );
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: toolName,
            content: JSON.stringify({
              success: false,
              error: "JSON inválido en los argumentos de la herramienta",
            }),
          });
          continue;
        }

        const validation = validateToolArgs(toolName, args);

        if (!validation.valid) {
          sendSSE(
            controller,
            encoder,
            "tool_error",
            JSON.stringify({
              name: toolName,
              error: validation.error,
              example: validation.example,
            }),
          );

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: toolName,
            content: JSON.stringify({
              success: false,
              error: `Argumentos inválidos: ${validation.error}. Ejemplo correcto: ${JSON.stringify(validation.example)}`,
            }),
          });
          continue;
        }

        sendSSE(
          controller,
          encoder,
          "tool_start",
          JSON.stringify({ name: toolName, args }),
        );

        const execution = await executeTool(toolName, args);

        const toolResult: ToolResult = execution.result;

        if (execution.pokedexCommand) {
          sendSSE(
            controller,
            encoder,
            "pokedex_command",
            JSON.stringify(execution.pokedexCommand),
          );
        }

        if (toolResult.success) {
          sendSSE(
            controller,
            encoder,
            "tool_end",
            JSON.stringify({
              name: toolName,
              result: toolResult.data,
            }),
          );
        } else {
          sendSSE(
            controller,
            encoder,
            "tool_error",
            JSON.stringify({
              name: toolName,
              error: toolResult.error,
            }),
          );
        }

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: toolName,
          content: getToolResultForModel(toolName, toolResult),
        });
      }

      continue;
    }

    break;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request);

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Demasiadas peticiones. Espera un minuto." }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_SIZE) {
    return new Response(
      JSON.stringify({ error: "Cuerpo de petición demasiado grande" }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = (await request.json()) as { messages?: ChatMessage[] };
  } catch {
    return new Response(
      JSON.stringify({ error: "Cuerpo JSON inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Se requiere un array 'messages' no vacío" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!process.env.MINIMAX_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "El Profesor Oak está descansando en su laboratorio. (API key no configurada)",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const messages: ChatMessage[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content ?? null,
    ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    ...(m.name ? { name: m.name } : {}),
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      try {
        timeoutId = setTimeout(() => {
          sendSSE(
            controller,
            encoder,
            "error",
            JSON.stringify({
              message:
                "La conexión con el laboratorio es inestable. El Profesor Oak necesita más tiempo.",
            }),
          );
          controller.close();
        }, MAX_TIMEOUT_MS);

        await runAgentLoop(messages, controller, encoder);

        sendSSE(
          controller,
          encoder,
          "done",
          JSON.stringify({ turnId: crypto.randomUUID?.() ?? Date.now().toString() }),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error desconocido";
        sendSSE(
          controller,
          encoder,
          "error",
          JSON.stringify({ message }),
        );
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        try {
          controller.close();
        } catch {
          // Stream may already be closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
