import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GraphQLError,
  GraphQLUpstreamError,
  getPokeApiEndpoint,
  request,
} from "@/src/lib/graphql/client";

const ORIGINAL_FETCH = globalThis.fetch;

function graphqlResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
}

describe("graphql client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
  });

  describe("getPokeApiEndpoint", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_POKEAPI_GRAPHQL_URL", "");
    });

    it("usa NEXT_PUBLIC_POKEAPI_GRAPHQL_URL cuando está definida", () => {
      vi.stubEnv(
        "NEXT_PUBLIC_POKEAPI_GRAPHQL_URL",
        "https://custom.example.com/graphql",
      );
      expect(getPokeApiEndpoint()).toBe("https://custom.example.com/graphql");
    });

    it("hace fallback al endpoint v1beta oficial si no hay variable (servidor / jsdom)", () => {
      vi.stubEnv("NEXT_PUBLIC_POKEAPI_GRAPHQL_URL", "");
      // jsdom no se identifica como navegador real, así que el helper
      // sigue devolviendo la URL absoluta.
      expect(getPokeApiEndpoint()).toBe(
        "https://beta.pokeapi.co/graphql/v1beta",
      );
    });

    it("devuelve el proxy /api/pokeapi cuando se ejecuta en un navegador real (user-agent con marca de navegador)", () => {
      // Simulamos un navegador real definiendo un `userAgent` con la
      // marca de Chrome. Importante: jsdom no mockea `navigator.userAgent`
      // por defecto con este valor.
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      });
      try {
        expect(getPokeApiEndpoint()).toBe("/api/pokeapi");
      } finally {
        Object.defineProperty(navigator, "userAgent", {
          configurable: true,
          value: originalUA,
        });
      }
    });

    it("permite desactivar el proxy con NEXT_PUBLIC_POKEAPI_USE_PROXY=false (incluso en navegador real)", () => {
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      });
      vi.stubEnv("NEXT_PUBLIC_POKEAPI_USE_PROXY", "false");
      try {
        expect(getPokeApiEndpoint()).toBe(
          "https://beta.pokeapi.co/graphql/v1beta",
        );
      } finally {
        Object.defineProperty(navigator, "userAgent", {
          configurable: true,
          value: originalUA,
        });
      }
    });
  });

  describe("request", () => {
    it("devuelve data tipada cuando la respuesta es correcta", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      fetchMock.mockResolvedValueOnce(
        graphqlResponse({
          data: { pokemon_v2_pokemon: [{ id: 1, name: "bulbasaur" }] },
        }),
      );

      const data = await request<{
        pokemon_v2_pokemon: Array<{ id: number; name: string }>;
      }>(
        "query Test { pokemon_v2_pokemon { id name } }",
        { limit: 1 },
        "Test",
      );

      expect(data).toEqual({
        pokemon_v2_pokemon: [{ id: 1, name: "bulbasaur" }],
      });

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe("https://beta.pokeapi.co/graphql/v1beta");
      const payload = JSON.parse((init as RequestInit).body as string);
      expect(payload).toEqual({
        query: "query Test { pokemon_v2_pokemon { id name } }",
        variables: { limit: 1 },
        operationName: "Test",
      });
      expect((init as RequestInit).method).toBe("POST");
    });

    it("lanza GraphQLError cuando la respuesta incluye errors", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const errorBody = {
        errors: [
          {
            message: "Cannot query field `foo` on type `Query`.",
            locations: [{ line: 1, column: 3 }],
          },
        ],
      };

      fetchMock
        .mockResolvedValueOnce(graphqlResponse(errorBody))
        .mockResolvedValueOnce(graphqlResponse(errorBody));

      await expect(request("{ broken }")).rejects.toMatchObject({
        name: "GraphQLError",
      });

      try {
        await request("{ broken }");
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).errors).toHaveLength(1);
        expect((error as GraphQLError).errors[0]!.message).toMatch(/foo/);
      }
    });

    it("propaga errores de red cuando fetch rechaza", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(request("{ pokemon { id } }")).rejects.toThrowError(
        "Failed to fetch",
      );
    });

    it("lanza error cuando el HTTP status no es ok", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse(
          { errors: [{ message: "rate limited" }] },
          { status: 429 },
        ),
      );

      await expect(request("{ pokemon { id } }")).rejects.toThrow();
    });

    /* ------------------------------------------------------------------ *
     * REGRESIÓN: cuando el proxy /api/pokeapi devuelve 502 con un body
     * JSON tipo Cloudflare (no-GraphQL), el cliente debe propagar la
     * información útil (mensaje legible + `retryAfter` para el auto-retry)
     * en vez de un mensaje críptico "PokeAPI GraphQL request failed: 502".
     *
     * Caso real observado: Cloudflare 521 con body
     *   { type, title: "Error 521: ...", retryable: true, retry_after: 120, ... }
     * Ver `__tests__/app/api/pokeapi/route.test.ts` para la normalización
     * upstream→cliente. Ver `useFilteredPokemonList` para el consumo de
     * `retryAfter`.
     * ------------------------------------------------------------------ */
    it("cuando el proxy devuelve 502 con body JSON no-GraphQL, lanza GraphQLUpstreamError con retryAfter legible", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      const cloudflareBody = {
        errors: [
          {
            message:
              "Upstream Cloudflare error 521: Web server is down (retryable)",
            extensions: {
              code: "UPSTREAM_CLOUDFLARE_521",
              retryable: true,
              retryAfter: 120,
              upstreamStatus: 521,
            },
          },
        ],
      };
      fetchMock.mockResolvedValueOnce(
        graphqlResponse(cloudflareBody, { status: 502 }),
      );

      try {
        await request("{ pokemon { id } }");
        throw new Error("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLUpstreamError);
        const e = error as GraphQLUpstreamError;
        expect(e.status).toBe(502);
        expect(e.retryable).toBe(true);
        expect(e.retryAfterMs).toBe(120_000);
        expect(e.message).toMatch(/Upstream Cloudflare error 521/);
        expect(e.errors[0]?.extensions?.retryAfter).toBe(120);
      }
    });

    it("cuando el HTTP es 4xx (no-GraphQL), lanza GraphQLUpstreamError NO retryable sin retryAfter", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      // 4xx ≠ 5xx: la PokeAPI/proxy NO está caída, el error es del
      // cliente. No merece la pena reintentar y no hay retryAfter.
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({}, { status: 400 }),
      );

      try {
        await request("{ pokemon { id } }");
        throw new Error("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLUpstreamError);
        const e = error as GraphQLUpstreamError;
        expect(e.status).toBe(400);
        expect(e.retryable).toBe(false);
        expect(e.retryAfterMs).toBeNull();
      }
    });

    it("cuando el HTTP 5xx viene con header Retry-After (en segundos), lo respeta", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }),
      );

      try {
        await request("{ pokemon { id } }");
        throw new Error("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLUpstreamError);
        const e = error as GraphQLUpstreamError;
        expect(e.status).toBe(503);
        expect(e.retryAfterMs).toBe(60_000);
      }
    });
  });
});
