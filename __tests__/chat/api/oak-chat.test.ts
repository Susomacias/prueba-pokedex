import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_FETCH = globalThis.fetch;

function sseChunk(data: string): Uint8Array {
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

function doneChunk(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

function mockMiniMaxStream(
  content: string,
  options?: {
    reasoning?: string;
  },
): Response {
  const chunks: Uint8Array[] = [];

  if (options?.reasoning) {
    chunks.push(
      sseChunk(
        JSON.stringify({
          choices: [{ delta: { reasoning_content: options.reasoning } }],
        }),
      ),
    );
  }

  for (let i = 0; i < content.length; i += 3) {
    const token = content.slice(i, i + 3);
    chunks.push(
      sseChunk(
        JSON.stringify({
          choices: [{ delta: { content: token } }],
        }),
      ),
    );
  }

  chunks.push(doneChunk());

  const allData = new Uint8Array(
    chunks.reduce((acc, c) => acc + c.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    allData.set(chunk, offset);
    offset += chunk.length;
  }

  return new Response(allData, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function mockMiniMaxToolCall(toolName: string, args: Record<string, unknown>): Response {
  const chunk = JSON.stringify({
    id: "test_call_1",
    choices: [
      {
        finish_reason: "tool_calls",
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_test123",
              type: "function",
              function: {
                name: toolName,
                arguments: JSON.stringify(args),
              },
            },
          ],
        },
      },
    ],
    model: "MiniMax-M3",
  });

  const body = `data: ${chunk}\n\ndata: [DONE]\n\n`;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function readSSEStream(
  response: Response,
): Promise<Array<{ event?: string; data: string }>> {
  const events: Array<{ event?: string; data: string }> = [];
  if (!response.body) return events;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent: string | undefined;
    let currentData = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentData) {
          events.push({ event: currentEvent, data: currentData });
          currentData = "";
          currentEvent = undefined;
        }
        continue;
      }
      if (trimmed.startsWith("event: ")) {
        currentEvent = trimmed.slice(7);
      } else if (trimmed.startsWith("data: ")) {
        currentData = trimmed.slice(6);
      }
    }

    if (currentData) {
      events.push({ event: currentEvent, data: currentData });
    }
  }

  return events;
}

describe("POST /api/oak-chat", () => {
  beforeEach(() => {
    vi.stubEnv("MINIMAX_API_KEY", "sk-test-fake-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
  });

  describe("streaming SSE", () => {
    it("devuelve text/event-stream", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;
      mock.mockResolvedValueOnce(mockMiniMaxStream("¡Hola! Soy el Profesor Oak."));

      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "¿Quién eres?" }],
        }),
      });
      req.headers.set("content-type", "application/json");
      req.headers.set("x-forwarded-for", "127.0.0.1");

      const res = await POST(req);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("emite eventos delta para el texto de respuesta", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;
      mock.mockResolvedValueOnce(
        mockMiniMaxStream("¡Hola! Soy el Profesor Oak."),
      );

      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "¿Quién eres?" }],
        }),
      });
      req.headers.set("content-type", "application/json");
      req.headers.set("x-forwarded-for", "127.0.0.1");

      const res = await POST(req);
      const events = await readSSEStream(res);

      const deltaEvents = events.filter((e) => e.event === "delta");
      expect(deltaEvents.length).toBeGreaterThan(0);
    });

    it("emite evento done al finalizar", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;
      mock.mockResolvedValueOnce(mockMiniMaxStream("¡Hola!"));

      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hola" }],
        }),
      });
      req.headers.set("content-type", "application/json");
      req.headers.set("x-forwarded-for", "127.0.0.1");

      const res = await POST(req);
      const events = await readSSEStream(res);

      const doneEvents = events.filter((e) => e.event === "done");
      expect(doneEvents.length).toBe(1);
    });
  });

  describe("tool calls", () => {
    it("emite pokedex_command para apply_filters", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;

      mock.mockResolvedValueOnce(
        mockMiniMaxToolCall("apply_filters", { type1: "fire" }),
      );
      mock.mockResolvedValueOnce(
        mockMiniMaxStream("He aplicado el filtro de tipo Fuego."),
      );

      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "Filtra por tipo fuego" }],
        }),
      });
      req.headers.set("content-type", "application/json");
      req.headers.set("x-forwarded-for", "127.0.0.2");

      const res = await POST(req);
      const events = await readSSEStream(res);

      const pokedexEvents = events.filter(
        (e) => e.event === "pokedex_command",
      );
      expect(pokedexEvents.length).toBe(1);
      const cmd = JSON.parse(pokedexEvents[0].data) as {
        action: string;
        payload: Record<string, unknown>;
      };
      expect(cmd.action).toBe("apply_filters");
      expect(cmd.payload.type1).toBe("fire");
    });

    it("emite tool_start y tool_end para herramientas server-side", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;

      // Orden de llamadas:
      // 1. MiniMax → tool call get_oak_info
      // 2. Wikipedia → HTML
      // 3. MiniMax → respuesta final
      mock.mockResolvedValueOnce(
        mockMiniMaxToolCall("get_oak_info", {}),
      );
      mock.mockResolvedValueOnce(
        new Response(
          `<html><body><div class="mw-parser-output"><p>El Profesor Oak es un personaje Pokémon de Pueblo Paleta.</p></div></body></html>`,
          { status: 200, headers: { "Content-Type": "text/html" } },
        ),
      );
      mock.mockResolvedValueOnce(
        mockMiniMaxStream(
          "El Profesor Oak es un científico Pokémon de Pueblo Paleta.",
        ),
      );

      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "user", content: "¿Quién es el Profesor Oak?" },
          ],
        }),
      });
      req.headers.set("content-type", "application/json");
      req.headers.set("x-forwarded-for", "127.0.0.3");

      const res = await POST(req);
      const events = await readSSEStream(res);

      const toolStartEvents = events.filter(
        (e) => e.event === "tool_start",
      );
      const toolEndEvents = events.filter((e) => e.event === "tool_end");

      expect(toolStartEvents.length).toBe(1);
      expect(toolEndEvents.length).toBe(1);
    });
  });

  describe("manejo de errores", () => {
    it("emite error cuando MiniMax falla", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;
      mock.mockRejectedValueOnce(new Error("Connection refused"));

      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hola" }],
        }),
      });
      req.headers.set("content-type", "application/json");
      req.headers.set("x-forwarded-for", "127.0.0.4");

      const res = await POST(req);
      const events = await readSSEStream(res);

      const errorEvents = events.filter((e) => e.event === "error");
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it("rechaza body vacío", async () => {
      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
      });
      req.headers.set("x-forwarded-for", "127.0.0.5");

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("rechaza cuando MINIMAX_API_KEY no está configurada", async () => {
      vi.stubEnv("MINIMAX_API_KEY", "");

      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hola" }],
        }),
      });
      req.headers.set("content-type", "application/json");
      req.headers.set("x-forwarded-for", "127.0.0.6");

      const res = await POST(req);
      expect(503).toBe(res.status);
    });
  });

  describe("rate limiting", () => {
    it("bloquea después de 10 requests del mismo IP", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;
      mock.mockResolvedValue(mockMiniMaxStream("OK"));

      const { POST } = await import("@/src/app/api/oak-chat/route");

      // Usar IP única para este test para no interferir con otros
      for (let i = 0; i < 11; i++) {
        const req = new NextRequest("http://localhost/api/oak-chat", {
          method: "POST",
          body: JSON.stringify({
            messages: [{ role: "user", content: "Test" }],
          }),
        });
        req.headers.set("content-type", "application/json");
        req.headers.set("x-forwarded-for", "10.99.99.99");

        const res = await POST(req);
        if (i < 10) {
          expect(res.status).not.toBe(429);
        } else {
          expect(res.status).toBe(429);
        }
      }
    });
  });

  describe("valida argumentos de herramientas", () => {
    it("emite tool_error para argumentos inválidos y reintenta", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;

      mock.mockResolvedValueOnce(
        mockMiniMaxToolCall("apply_filters", { type1: "galaxia" }),
      );
      mock.mockResolvedValueOnce(
        mockMiniMaxToolCall("apply_filters", { type1: "fire" }),
      );
      mock.mockResolvedValueOnce(
        mockMiniMaxStream("He aplicado el filtro de tipo Fuego."),
      );

      const { POST } = await import("@/src/app/api/oak-chat/route");
      const req = new NextRequest("http://localhost/api/oak-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "user", content: "Filtra por tipo galaxia" },
          ],
        }),
      });
      req.headers.set("content-type", "application/json");
      req.headers.set("x-forwarded-for", "127.0.0.7");

      const res = await POST(req);
      const events = await readSSEStream(res);

      const toolErrorEvents = events.filter(
        (e) => e.event === "tool_error",
      );
      expect(toolErrorEvents.length).toBeGreaterThan(0);
    });
  });
});

describe("POST /api/oak-chat — system prompt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
  });

  it("incluye el system prompt del Profesor Oak en la llamada a MiniMax", async () => {
    vi.stubEnv("MINIMAX_API_KEY", "sk-test-fake-key");

    const mock = vi.fn();
    globalThis.fetch = mock as unknown as typeof fetch;
    mock.mockResolvedValueOnce(mockMiniMaxStream("Soy el Profesor Oak."));

    const { POST } = await import("@/src/app/api/oak-chat/route");
    const req = new NextRequest("http://localhost/api/oak-chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "¿Quién eres?" }],
      }),
    });
    req.headers.set("content-type", "application/json");
    req.headers.set("x-forwarded-for", "192.168.1.1");

    const res = await POST(req);
    await readSSEStream(res);

    expect(mock).toHaveBeenCalled();
    const callBody = JSON.parse(
      (mock.mock.calls[0][1] as RequestInit).body as string,
    ) as { messages: Array<{ role: string; content: string }> };

    const systemMsg = callBody.messages.find((m) => m.role === "system");
    expect(systemMsg).toBeDefined();
    expect(systemMsg!.content).toContain("Profesor Oak");
    expect(systemMsg!.content).toContain("Pokémon");
  });
});
