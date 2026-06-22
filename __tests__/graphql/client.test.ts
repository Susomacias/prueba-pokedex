import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GraphQLError,
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

    it("hace fallback al endpoint beta oficial si no hay variable", () => {
      vi.stubEnv("NEXT_PUBLIC_POKEAPI_GRAPHQL_URL", "");
      expect(getPokeApiEndpoint()).toBe(
        "https://beta.pokeapi.co/graphql/v1beta",
      );
    });
  });

  describe("request", () => {
    it("devuelve data tipada cuando la respuesta es correcta", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ data: { pokemon: [{ id: 1, name: "bulbasaur" }] } }),
      );

      const data = await request<{
        pokemon: Array<{ id: number; name: string }>;
      }>("query Test { pokemon { id name } }", { limit: 1 }, "Test");

      expect(data).toEqual({ pokemon: [{ id: 1, name: "bulbasaur" }] });

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe("https://beta.pokeapi.co/graphql/v1beta");
      const payload = JSON.parse((init as RequestInit).body as string);
      expect(payload).toEqual({
        query: "query Test { pokemon { id name } }",
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
  });
});
