import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAbilityOptions,
  fetchColorOptions,
  fetchFilterOptions,
  fetchGenerationOptions,
  fetchHabitatOptions,
  fetchHeightBuckets,
  fetchTypeOptions,
  fetchWeightBuckets,
} from "@/src/lib/pokemon/fetchFilterOptions";
import { POKEMON_TYPES } from "@/src/lib/types/pokemon";

const ORIGINAL_FETCH = globalThis.fetch;

function graphqlResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

interface CapturedCall {
  query: string;
  variables: Record<string, unknown> | undefined;
  operationName: string | undefined;
}

function parseCall(init: RequestInit | undefined): CapturedCall {
  const body = JSON.parse((init?.body as string) ?? "{}") as {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  };
  return {
    query: body.query,
    variables: body.variables,
    operationName: body.operationName,
  };
}

function captureFetch(): { mock: ReturnType<typeof vi.fn> } {
  const mock = vi.fn();
  globalThis.fetch = mock as unknown as typeof fetch;
  return { mock };
}

function callsOf(mock: ReturnType<typeof vi.fn>): CapturedCall[] {
  return mock.mock.calls.map(([, init]) => parseCall(init as RequestInit));
}

describe("fetchFilterOptions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POKEAPI_GRAPHQL_URL", "");
  });

  describe("fetchTypeOptions", () => {
    it("devuelve un array no vacío de tipos canónicos excluyendo unknown y shadow", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            type: [
              { id: 1, name: "normal" },
              { id: 2, name: "fire" },
              { id: 3, name: "unknown" },
              { id: 4, name: "shadow" },
              { id: 5, name: "stellar" },
              { id: 6, name: "water" },
            ],
          },
        }),
      );

      const result = await fetchTypeOptions();
      const calls = callsOf(mock);

      expect(result.length).toBeGreaterThan(0);
      expect(
        result.every((o) =>
          (POKEMON_TYPES as ReadonlyArray<string>).includes(o.value),
        ),
      ).toBe(true);
      const names = result.map((o) => o.value);
      expect(names).not.toContain("unknown");
      expect(names).not.toContain("shadow");
      expect(calls).toHaveLength(1);
      expect(calls[0]!.query).toContain("type");
      expect(calls[0]!.query).not.toContain("pokemon");
    });

    it("cada opción incluye value y label en español", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            type: [
              { id: 10, name: "fire" },
              { id: 11, name: "water" },
            ],
          },
        }),
      );

      const result = await fetchTypeOptions();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ value: "fire" });
      expect(typeof result[0]!.label).toBe("string");
      expect(result[0]!.label.length).toBeGreaterThan(0);
      expect(result[0]!.label).toBe("Fuego");
    });
  });

  describe("fetchGenerationOptions", () => {
    it("devuelve las 9 generaciones en orden y con etiqueta en español", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            generation: [
              { id: 1, name: "generation-i" },
              { id: 2, name: "generation-ii" },
              { id: 3, name: "generation-iii" },
              { id: 4, name: "generation-iv" },
              { id: 5, name: "generation-v" },
              { id: 6, name: "generation-vi" },
              { id: 7, name: "generation-vii" },
              { id: 8, name: "generation-viii" },
              { id: 9, name: "generation-ix" },
            ],
          },
        }),
      );

      const result = await fetchGenerationOptions();

      expect(result).toHaveLength(9);
      expect(result.map((o) => o.value)).toEqual([
        "generation-i",
        "generation-ii",
        "generation-iii",
        "generation-iv",
        "generation-v",
        "generation-vi",
        "generation-vii",
        "generation-viii",
        "generation-ix",
      ]);
      expect(result[0]!.label).toBe("Generación I");
    });
  });

  describe("fetchColorOptions", () => {
    it("devuelve colores como opciones simples", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            pokemoncolor: [
              { id: 1, name: "red" },
              { id: 2, name: "blue" },
              { id: 3, name: "green" },
            ],
          },
        }),
      );

      const result = await fetchColorOptions();

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ value: "red" });
      expect(typeof result[0]!.label).toBe("string");
      expect(result[0]!.label.length).toBeGreaterThan(0);
    });
  });

  describe("fetchHabitatOptions", () => {
    it("mapea hábitats inglés → claves en español y agrupa aliases", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            pokemonhabitat: [
              { id: 1, name: "cave" },
              { id: 2, name: "forest" },
              { id: 3, name: "grassland" },
              { id: 4, name: "mountain" },
              { id: 5, name: "rough-terrain" },
              { id: 6, name: "field" },
              { id: 7, name: "freshwater" },
              { id: 8, name: "waters-edge" },
              { id: 9, name: "sea" },
              { id: 10, name: "urban" },
              { id: 11, name: "rare" },
            ],
          },
        }),
      );

      const result = await fetchHabitatOptions();

      const values = result.map((o) => o.value);
      expect(values).toContain("caverna");
      expect(values).toContain("bosque");
      expect(values).toContain("pradera");
      expect(values).toContain("montana");
      expect(values).toContain("campo");
      expect(values).toContain("agua_dulce");
      expect(values).toContain("agua_salada");
      expect(values).toContain("ciudad");
      expect(values).toContain("raro");
      // "mountain" y "rough-terrain" colapsan a "montana"
      expect(values.filter((v) => v === "montana")).toHaveLength(1);
    });

    it("cada opción incluye value, label en español e image", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            pokemonhabitat: [{ id: 1, name: "forest" }],
          },
        }),
      );

      const result = await fetchHabitatOptions();

      expect(result).toHaveLength(1);
      expect(result[0]!.value).toBe("bosque");
      expect(result[0]!.label.length).toBeGreaterThan(0);
      expect(result[0]!.image).toMatch(/^\/habitats\/.+\.webp$/);
    });
  });

  describe("fetchAbilityOptions", () => {
    it("devuelve habilidades no vacío", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            ability: [
              { id: 1, name: "stench" },
              { id: 2, name: "drizzle" },
              { id: 65, name: "overgrow" },
            ],
          },
        }),
      );

      const result = await fetchAbilityOptions();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({ value: "stench" });
      expect(typeof result[0]!.label).toBe("string");
    });
  });

  describe("buckets de altura y peso", () => {
    it("fetchHeightBuckets devuelve rangos predefinidos y no solapados", async () => {
      const buckets = await fetchHeightBuckets();
      expect(buckets.length).toBeGreaterThanOrEqual(2);
      for (const b of buckets) {
        expect(b).toMatchObject({
          value: expect.stringMatching(/.+/),
          label: expect.stringMatching(/.+/),
          min: expect.any(Number),
          max: expect.any(Number),
        });
        expect(b.min).toBeLessThanOrEqual(b.max);
      }
    });

    it("fetchWeightBuckets devuelve rangos predefinidos y no solapados", async () => {
      const buckets = await fetchWeightBuckets();
      expect(buckets.length).toBeGreaterThanOrEqual(2);
      for (const b of buckets) {
        expect(b).toMatchObject({
          value: expect.stringMatching(/.+/),
          label: expect.stringMatching(/.+/),
          min: expect.any(Number),
          max: expect.any(Number),
        });
        expect(b.min).toBeLessThanOrEqual(b.max);
      }
    });
  });

  describe("fetchFilterOptions", () => {
    it("devuelve un mapa con los 8 filtros del plan", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            type: [{ id: 1, name: "fire" }],
            generation: [{ id: 1, name: "generation-i" }],
            pokemoncolor: [{ id: 1, name: "red" }],
            pokemonhabitat: [{ id: 1, name: "forest" }],
            ability: [{ id: 1, name: "blaze" }],
            pokemon_aggregate: {
              aggregate: {
                min: { height: 1, weight: 10 },
                max: { height: 200, weight: 10000 },
              },
            },
          },
        }),
      );

      const map = await fetchFilterOptions();

      expect(Object.keys(map).sort()).toEqual(
        [
          "ability",
          "color",
          "generation",
          "habitat",
          "height",
          "type1",
          "type2",
          "weight",
        ].sort(),
      );
      expect(map.type1).toEqual(map.type2);
    });

    it("las opciones están en español cuando el campo lo permite (habitat)", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            type: [{ id: 1, name: "fire" }],
            generation: [{ id: 1, name: "generation-i" }],
            pokemoncolor: [{ id: 1, name: "red" }],
            pokemonhabitat: [{ id: 1, name: "forest" }],
            ability: [{ id: 1, name: "blaze" }],
            pokemon_aggregate: {
              aggregate: {
                min: { height: 1, weight: 10 },
                max: { height: 200, weight: 10000 },
              },
            },
          },
        }),
      );

      const map = await fetchFilterOptions();

      expect(map.habitat[0]!.value).toBe("bosque");
      expect(map.habitat[0]!.label.toLowerCase()).not.toBe("forest");
    });
  });

  describe("errores", () => {
    it("fetchTypeOptions propaga errores de red", async () => {
      const { mock } = captureFetch();
      mock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      await expect(fetchTypeOptions()).rejects.toThrow(/Failed to fetch/);
    });

    it("fetchHabitatOptions propaga GraphQLError", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          errors: [{ message: "rate limited" }],
        }),
      );
      await expect(fetchHabitatOptions()).rejects.toMatchObject({
        name: "GraphQLError",
      });
    });
  });

  describe("payload", () => {
    it("envía la query por POST al endpoint beta con Content-Type JSON", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: { type: [{ id: 1, name: "fire" }] },
        }),
      );

      await fetchTypeOptions();

      const calls = callsOf(mock);
      const callsArr = mock.mock.calls as Array<[RequestInfo | URL, RequestInit]>;
      const [url, init] = callsArr[0]!;
      expect(String(url)).toBe("https://graphql.pokeapi.co/v1beta2");
      expect(init.method).toBe("POST");
      expect(
        (init.headers as Record<string, string>)["Content-Type"],
      ).toBe("application/json");
      expect(calls[0]!.query).toContain("type");
    });
  });
});