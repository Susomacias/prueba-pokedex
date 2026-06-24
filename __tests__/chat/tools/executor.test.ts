import { afterEach, describe, expect, it, vi } from "vitest";
import type { PokemonDetail } from "@/src/lib/types/pokemon";

const ORIGINAL_FETCH = globalThis.fetch;

function graphqlResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("executeTool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
  });

  describe("search_pokemon", () => {
    it("llama a PokeAPI con los filtros adecuados", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;

      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            pokemon_v2_pokemon: [
              {
                id: 6,
                name: "charizard",
                height: 17,
                weight: 905,
                pokemon_v2_pokemonsprites: [
                  { sprites: { front_default: "/charizard.png" } },
                ],
                pokemon_v2_pokemontypes: [
                  { slot: 1, pokemon_v2_type: { name: "fire" } },
                  { slot: 2, pokemon_v2_type: { name: "flying" } },
                ],
                pokemon_v2_pokemonspecy: {
                  pokemon_v2_pokemonhabitat: { name: "mountain" },
                  pokemon_v2_generation: { name: "generation-i" },
                  pokemon_v2_pokemoncolor: { name: "red" },
                  pokemon_v2_pokemonspeciesflavortexts: [],
                },
              },
            ],
            pokemon_v2_pokemon_aggregate: {
              aggregate: { count: 1 },
            },
          },
        }),
      );

      const { executeTool } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const result = await executeTool("search_pokemon", {
        type: "fire",
        limit: 5,
      });

      expect(result.result.success).toBe(true);
      if (result.result.success) {
        const data = result.result.data as {
          items: Array<{ name: string }>;
        };
        expect(data.items).toHaveLength(1);
        expect(data.items[0].name).toBe("charizard");
      }

      // Verifica que se hizo la petición GraphQL
      expect(mock).toHaveBeenCalledTimes(1);
      const callArgs = mock.mock.calls[0] as unknown[];
      const init = callArgs[1] as RequestInit;
      const body = JSON.parse(init.body as string) as {
        query: string;
        variables: Record<string, unknown>;
      };
      expect(body.query).toBeDefined();
      expect(body.variables).toBeDefined();
    });
  });

  describe("get_pokemon_info", () => {
    it("llama a PokeAPI para obtener el detalle del pokemon", async () => {
      const detail: PokemonDetail = {
        id: 25,
        name: "pikachu",
        height: 4,
        weight: 60,
        baseExperience: 112,
        isLegendary: false,
        isMythical: false,
        captureRate: 190,
        baseHappiness: 70,
        generation: "generation-i",
        habitat: "bosque",
        types: [{ slot: 1, name: "electric" }],
        stats: [
          { name: "hp", baseStat: 35 },
          { name: "attack", baseStat: 55 },
          { name: "defense", baseStat: 40 },
          { name: "special-attack", baseStat: 50 },
          { name: "special-defense", baseStat: 50 },
          { name: "speed", baseStat: 90 },
        ],
        abilities: [
          { name: "static", isHidden: false, slot: 1 },
          { name: "lightning-rod", isHidden: true, slot: 3 },
        ],
        sprites: {
          frontDefault: "/pikachu.png",
          frontShiny: null,
          backDefault: null,
          backShiny: null,
          officialArtwork: "/pikachu_official.png",
          homeFront: null,
          homeShiny: null,
          officialArtworkShiny: null,
        },
        cryLatestUrl: "/cries/pikachu.ogg",
        flavorText:
          "When several of\nthese POKéMON\ngather, their\u000celectricity could\nbuild and cause\nlightning storms.",
        flavorTextVersion: "red",
        evolutionChain: [],
      };

      // Mock del módulo de fetchPokemonDetail
      vi.doMock("@/src/lib/pokemon/fetchDetail", () => ({
        fetchPokemonDetail: vi.fn().mockResolvedValue(detail),
      }));

      const { executeTool } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const result = await executeTool("get_pokemon_info", {
        name: "pikachu",
      });

      expect(result.result.success).toBe(true);
      if (result.result.success) {
        const data = result.result.data as Record<string, unknown>;
        expect(data.name).toBe("pikachu");
        expect(data.types).toBeDefined();
        expect(data.stats).toBeDefined();
        expect(data.description).toBeDefined();
      }
    });

    it("maneja el caso de pokemon no encontrado", async () => {
      vi.doMock("@/src/lib/pokemon/fetchDetail", () => ({
        fetchPokemonDetail: vi
          .fn()
          .mockRejectedValue(new Error("Pokemon not found: missingno")),
      }));

      const { executeTool } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const result = await executeTool("get_pokemon_info", {
        name: "missingno",
      });

      expect(result.result.success).toBe(false);
      if (!result.result.success) {
        expect(result.result.error).toContain("missingno");
      }
    });
  });

  describe("get_oak_info", () => {
    it("devuelve info del Profesor Oak desde Wikipedia", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;

      mock.mockResolvedValueOnce(
        new Response(
          `<html><body>
            <div class="mw-parser-output">
              <p>El <b>Profesor Oak</b> es un personaje ficticio del universo Pokémon.</p>
              <p>Es el científico Pokémon más reconocido del mundo.</p>
            </div>
          </body></html>`,
          { status: 200, headers: { "Content-Type": "text/html" } },
        ),
      );

      const { executeTool } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const result = await executeTool("get_oak_info", {});

      expect(result.result.success).toBe(true);
      if (result.result.success) {
        const data = result.result.data as { text: string };
        expect(data.text).toBeDefined();
        expect(data.text.length).toBeGreaterThan(0);
        expect(data.text).toContain("Pokémon");
      }

      expect(mock).toHaveBeenCalledTimes(1);
      const url = (mock.mock.calls[0] as string[])[0] as string;
      expect(url).toContain("wikipedia.org");
      expect(url).toContain("Profesor_Oak");
    });

    it("maneja error de red al consultar Wikipedia", async () => {
      const mock = vi.fn();
      globalThis.fetch = mock as unknown as typeof fetch;
      mock.mockRejectedValueOnce(new Error("Network error"));

      const { executeTool } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const result = await executeTool("get_oak_info", {});

      expect(result.result.success).toBe(false);
      if (!result.result.success) {
        expect(result.result.error).toBeDefined();
      }
    });
  });

  describe("apply_filters", () => {
    it("devuelve pokedexCommand para filtros válidos", async () => {
      const { executeTool } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const result = await executeTool("apply_filters", {
        type1: "fire",
        generation: "generation-i",
      });

      expect(result.result.success).toBe(true);
      expect(result.pokedexCommand).toBeDefined();
      expect(result.pokedexCommand?.action).toBe("apply_filters");
      expect(result.pokedexCommand?.payload).toEqual({
        type1: "fire",
        generation: "generation-i",
      });
    });
  });

  describe("show_pokemon", () => {
    it("devuelve pokedexCommand para mostrar un pokemon", async () => {
      const { executeTool } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const result = await executeTool("show_pokemon", {
        name: "pikachu",
      });

      expect(result.result.success).toBe(true);
      expect(result.pokedexCommand).toBeDefined();
      expect(result.pokedexCommand?.action).toBe("show_pokemon");
      expect(result.pokedexCommand?.payload).toEqual({ name: "pikachu" });
    });
  });

  describe("getToolResultForModel", () => {
    it("formatea resultado exitoso como JSON", async () => {
      const { getToolResultForModel } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const content = getToolResultForModel("search_pokemon", {
        success: true,
        data: { items: [{ name: "pikachu" }] },
      });
      const parsed = JSON.parse(content) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
    });

    it("formatea error como JSON", async () => {
      const { getToolResultForModel } = await import(
        "@/src/lib/chat/tools/executor"
      );
      const content = getToolResultForModel("get_pokemon_info", {
        success: false,
        error: "Pokemon not found",
      });
      const parsed = JSON.parse(content) as Record<string, unknown>;
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Pokemon not found");
    });
  });
});
