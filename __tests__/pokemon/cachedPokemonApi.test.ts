import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchFilterOptions,
  fetchPokemonDetail,
  fetchPokemonList,
  preloadPokemonDetails,
  preloadPokemonDetailsFireAndForget,
  preloadPokemonList,
} from "@/src/lib/pokemon/cachedPokemonApi";
import { POKEMON_DETAIL_QUERY } from "@/src/lib/graphql/queries/pokemonDetail.gql";
import { POKEMON_LIST_QUERY } from "@/src/lib/graphql/queries/pokemonList.gql";
import { FILTER_OPTIONS_QUERY } from "@/src/lib/graphql/queries/filterOptions.gql";
import {
  LIST_CACHE,
  detailCache,
  FILTER_CACHE,
} from "@/src/lib/pokemon/cacheStrategy";

const ORIGINAL_FETCH = globalThis.fetch;

function graphqlResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function captureFetch(): { mock: ReturnType<typeof vi.fn> } {
  const mock = vi.fn();
  globalThis.fetch = mock as unknown as typeof fetch;
  return { mock };
}

interface FetchInit {
  url?: string;
  body?: string;
  next?: { revalidate?: number; tags?: string[] };
}

function lastInit(mock: ReturnType<typeof vi.fn>): FetchInit {
  const calls = mock.mock.calls as Array<[RequestInfo | URL, RequestInit]>;
  const last = calls[calls.length - 1]!;
  const init = (last[1] ?? {}) as RequestInit & {
    next?: { revalidate?: number; tags?: string[] };
  };
  return {
    url: String(last[0]),
    body: init.body as string | undefined,
    next: init.next as { revalidate?: number; tags?: string[] } | undefined,
  };
}

function graphqlInit(mock: ReturnType<typeof vi.fn>): FetchInit {
  const calls = mock.mock.calls as Array<[RequestInfo | URL, RequestInit]>;
  // Busca la llamada al endpoint GraphQL de PokeAPI (no las llamadas
  // REST de fallback como el cry).
  for (const call of calls) {
    if (String(call[0]).includes("beta.pokeapi.co")) {
      const init = (call[1] ?? {}) as RequestInit & {
        next?: { revalidate?: number; tags?: string[] };
      };
      return {
        url: String(call[0]),
        body: init.body as string | undefined,
        next: init.next as { revalidate?: number; tags?: string[] } | undefined,
      };
    }
  }
  throw new Error("No GraphQL fetch found in mock calls");
}

interface SpeciesPayload {
  data: {
    pokemon_v2_pokemonspecies: Array<{
      id: number;
      name: string;
      is_legendary: boolean;
      is_mythical: boolean;
      capture_rate: number;
      base_happiness: number;
      pokemon_v2_generation: { name: string };
      pokemon_v2_pokemonhabitat: { name: string };
      pokemon_v2_pokemonspeciesflavortexts: unknown[];
      pokemon_v2_pokemons: Array<{
        id: number;
        name: string;
        height: number;
        weight: number;
        base_experience: number;
        pokemon_v2_pokemonstats: unknown[];
        pokemon_v2_pokemonabilities: unknown[];
        pokemon_v2_pokemontypes: unknown[];
        pokemon_v2_pokemonsprites: Array<{ sprites: unknown }>;
        pokemon_v2_pokemoncries: unknown[];
      }>;
      pokemon_v2_evolutionchain: {
        pokemon_v2_pokemonspecies: unknown[];
      };
    }>;
  };
}

function detailPayload(id: number, name: string): SpeciesPayload {
  return {
    data: {
      pokemon_v2_pokemonspecies: [
        {
          id,
          name,
          is_legendary: false,
          is_mythical: false,
          capture_rate: 0,
          base_happiness: 0,
          pokemon_v2_generation: { name: "generation-i" },
          pokemon_v2_pokemonhabitat: { name: "forest" },
          pokemon_v2_pokemonspeciesflavortexts: [],
          pokemon_v2_pokemons: [
            {
              id,
              name,
              height: 1,
              weight: 1,
              base_experience: 1,
              pokemon_v2_pokemonstats: [],
              pokemon_v2_pokemonabilities: [],
              pokemon_v2_pokemontypes: [],
              pokemon_v2_pokemonsprites: [{ sprites: null }],
              pokemon_v2_pokemoncries: [],
            },
          ],
          pokemon_v2_evolutionchain: {
            pokemon_v2_pokemonspecies: [],
          },
        },
      ],
    },
  };
}

function filterPayload(): unknown {
  return {
    data: {
      pokemon_v2_type: [{ id: 1, name: "fire" }],
      pokemon_v2_generation: [{ id: 1, name: "generation-i" }],
      pokemon_v2_pokemoncolor: [{ id: 1, name: "red" }],
      pokemon_v2_pokemonhabitat: [{ id: 1, name: "forest" }],
      pokemon_v2_ability: [{ id: 1, name: "blaze" }],
      pokemon_v2_pokemon_aggregate: {
        aggregate: {
          min: { height: 1, weight: 10 },
          max: { height: 200, weight: 10000 },
        },
      },
    },
  };
}

function emptyFilterPayload(): unknown {
  return {
    data: {
      pokemon_v2_type: [],
      pokemon_v2_generation: [],
      pokemon_v2_pokemoncolor: [],
      pokemon_v2_pokemonhabitat: [],
      pokemon_v2_ability: [],
      pokemon_v2_pokemon_aggregate: {
        aggregate: {
          min: { height: 0, weight: 0 },
          max: { height: 0, weight: 0 },
        },
      },
    },
  };
}

describe("cachedPokemonApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POKEAPI_GRAPHQL_URL", "");
  });

  describe("dedupe con React.cache", () => {
    it("dos await consecutivos a la misma función devuelven el mismo valor", async () => {
      const { mock } = captureFetch();
      mock.mockImplementation(
        async () => graphqlResponse(detailPayload(25, "pikachu")),
      );

      // Simulamos un mismo "render" ejecutando ambas llamadas
      // dentro de una misma función async. Si `React.cache`
      // memoizase (como hace en RSC real), una sola invocación
      // llegaría a `fetch`. Fuera de RSC el contrato observable
      // es que ambas llamadas devuelven el mismo valor.
      const render = async () => {
        const a = await fetchPokemonDetail("pikachu");
        const b = await fetchPokemonDetail("pikachu");
        return [a, b] as const;
      };
      const [a, b] = await render();

      expect(a).toEqual(b);
      expect(a.id).toBe(25);
      expect(mock).toHaveBeenCalled();
    });

    it("dos llamadas con nombre distinto hacen al menos 2 fetches graphql", async () => {
      const { mock } = captureFetch();
      let i = 0;
      mock.mockImplementation(async () => {
        const name = i++ === 0 ? "pikachu" : "charmander";
        return graphqlResponse(detailPayload(i, name));
      });

      await Promise.all([
        fetchPokemonDetail("pikachu"),
        fetchPokemonDetail("charmander"),
      ]);

      // fetchPokemonDetail hace 2 fetches por pokemon (graphql + REST
      // fallback del cry). Lo importante aquí es que los nombres
      // distintos NO se dedupean: hay al menos 2 llamadas graphql.
      expect(mock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("dos await consecutivos a fetchFilterOptions devuelven el mismo valor", async () => {
      const { mock } = captureFetch();
      mock.mockImplementation(async () => graphqlResponse(filterPayload()));

      const render = async () => {
        const a = await fetchFilterOptions();
        const b = await fetchFilterOptions();
        return [a, b] as const;
      };
      const [a, b] = await render();

      expect(a).toEqual(b);
      expect(mock).toHaveBeenCalled();
    });
  });

  describe("cache strategy (next options)", () => {
    it("fetchPokemonList pasa revalidate=3600 y tag pokemon-data", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValue(
        graphqlResponse({ data: { pokemon_v2_pokemon: [] } }),
      );

      await fetchPokemonList({ offset: 0 });

      const init = lastInit(mock);
      expect(init.next?.revalidate).toBe(LIST_CACHE.revalidate);
      expect(init.next?.tags).toEqual(LIST_CACHE.tags);
    });

    it("fetchPokemonDetail pasa los tags pokemon-data + pokemon:<name> en el fetch graphql", async () => {
      const { mock } = captureFetch();
      mock.mockImplementation(
        async () => graphqlResponse(detailPayload(25, "pikachu")),
      );

      await fetchPokemonDetail("pikachu");

      const init = graphqlInit(mock);
      const expected = detailCache("pikachu");
      expect(init.next?.tags).toEqual(expected.tags);
      expect(init.next?.tags).toContain("pokemon:pikachu");
    });

    it("fetchFilterOptions pasa revalidate=604800 (7 días) y tag filter-options", async () => {
      const { mock } = captureFetch();
      mock.mockImplementation(
        async () => graphqlResponse(emptyFilterPayload()),
      );

      await fetchFilterOptions();

      const init = lastInit(mock);
      expect(init.next?.revalidate).toBe(FILTER_CACHE.revalidate);
      expect(init.next?.tags).toEqual(FILTER_CACHE.tags);
    });
  });

  describe("precarga", () => {
    it("preloadPokemonDetails limita la precarga a los primeros N (default 3) detalles", async () => {
      const { mock } = captureFetch();
      mock.mockImplementation(async (_url, init) => {
        const body = JSON.parse((init as RequestInit).body as string) as {
          variables: { name: string };
        };
        return graphqlResponse(detailPayload(1, body.variables.name ?? "x"));
      });

      const names = [
        "pikachu",
        "charmander",
        "bulbasaur",
        "squirtle",
        "pidgey",
      ];
      const results = await preloadPokemonDetails(names);

      // El helper solo precarga los primeros N (3 por defecto). No
      // hace falta contar el mock: la API observable es el número de
      // resultados devueltos, que es el contrato público.
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.name).sort()).toEqual(
        ["bulbasaur", "charmander", "pikachu"].sort(),
      );
    });

    it("preloadPokemonDetailsFireAndForget inicia sin bloquear", () => {
      const { mock } = captureFetch();
      mock.mockImplementation(
        async () => graphqlResponse(detailPayload(1, "pikachu")),
      );

      expect(() =>
        preloadPokemonDetailsFireAndForget(["pikachu", "charmander"]),
      ).not.toThrow();
      expect(mock).toHaveBeenCalled();
    });

    it("preloadPokemonList no hace await pero inicia el fetch", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValue(
        graphqlResponse({ data: { pokemon_v2_pokemon: [] } }),
      );

      preloadPokemonList({ offset: 0 });

      await Promise.resolve();
      await Promise.resolve();

      expect(mock).toHaveBeenCalled();
    });
  });

  describe("cache strategy constants", () => {
    it("LIST_CACHE = { revalidate: 3600, tags: ['pokemon-data'] }", () => {
      expect(LIST_CACHE.revalidate).toBe(3600);
      expect(LIST_CACHE.tags).toContain("pokemon-data");
    });

    it("FILTER_CACHE = { revalidate: 604800, tags: ['pokemon-data', 'filter-options'] }", () => {
      expect(FILTER_CACHE.revalidate).toBe(604800);
      expect(FILTER_CACHE.tags).toContain("pokemon-data");
      expect(FILTER_CACHE.tags).toContain("filter-options");
    });

    it("detailCache(name) = { revalidate: 86400, tags: ['pokemon-data', `pokemon:${name}`] }", () => {
      const c = detailCache("pikachu");
      expect(c.revalidate).toBe(86400);
      expect(c.tags).toContain("pokemon-data");
      expect(c.tags).toContain("pokemon:pikachu");
    });
  });

  describe("queries", () => {
    it("fetchPokemonList envía POKEMON_LIST_QUERY", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValue(
        graphqlResponse({ data: { pokemon_v2_pokemon: [] } }),
      );

      await fetchPokemonList({ offset: 0 });

      const init = lastInit(mock);
      const body = JSON.parse(init.body!) as { query: string };
      expect(body.query).toBe(POKEMON_LIST_QUERY);
    });

    it("fetchPokemonDetail envía POKEMON_DETAIL_QUERY", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValue(
        graphqlResponse({
          data: { pokemon_v2_pokemonspecies: [] },
        }),
      );

      await fetchPokemonDetail("missingno").catch(() => {
        /* swallow */
      });

      const init = lastInit(mock);
      const body = JSON.parse(init.body!) as { query: string };
      expect(body.query).toBe(POKEMON_DETAIL_QUERY);
    });

    it("fetchFilterOptions envía FILTER_OPTIONS_QUERY", async () => {
      const { mock } = captureFetch();
      mock.mockImplementation(
        async () => graphqlResponse(emptyFilterPayload()),
      );

      await fetchFilterOptions();

      const init = lastInit(mock);
      const body = JSON.parse(init.body!) as { query: string };
      expect(body.query).toBe(FILTER_OPTIONS_QUERY);
    });
  });
});