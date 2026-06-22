import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPokemonListPager,
  fetchPokemonList,
  fetchNextPage,
} from "@/src/lib/pokemon/fetchList";
import { POKEMON_LIST_QUERY } from "@/src/lib/graphql/queries/pokemonList.gql";
import {
  POKEMON_TYPES,
  POKEMON_LIST_PAGE_SIZE,
} from "@/src/lib/types/pokemon";

const ORIGINAL_FETCH = globalThis.fetch;

interface RawType {
  slot: number;
  pokemon_v2_type: { name: string };
}

interface RawSpecies {
  pokemon_v2_pokemonhabitat: { name: string } | null;
  pokemon_v2_generation: { name: string } | null;
}

interface RawPokemon {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  pokemon_v2_pokemonsprites: Array<{ sprites: unknown }>;
  pokemon_v2_pokemontypes: RawType[];
  pokemon_v2_pokemonspecies: RawSpecies | null;
}

function buildRaw(
  startId: number,
  count: number,
  overrides: Partial<RawPokemon> = {},
): RawPokemon[] {
  return Array.from({ length: count }, (_, i) => {
    const id = startId + i;
    return {
      id,
      name: `poke-${id}`,
      height: id * 2,
      weight: id * 5,
      pokemon_v2_pokemonsprites: [
        { sprites: { front_default: `https://img/${id}.png` } },
      ],
      pokemon_v2_pokemontypes: [{ slot: 1, pokemon_v2_type: { name: "grass" } }],
      pokemon_v2_pokemonspecies: {
        pokemon_v2_pokemonhabitat: { name: "forest" },
        pokemon_v2_generation: { name: "generation-i" },
      },
      ...overrides,
    };
  });
}

function graphqlResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function expectValidPokemonTypes(
  types: ReadonlyArray<{ name: string }>,
): void {
  for (const t of types) {
    expect(POKEMON_TYPES as ReadonlyArray<string>).toContain(t.name);
  }
}

describe("fetchList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POKEAPI_GRAPHQL_URL", "");
  });

  describe("query", () => {
    it("pide exactamente los campos definidos en el plan", () => {
      expect(POKEMON_LIST_QUERY).toContain("pokemon_v2_pokemonsprites");
      expect(POKEMON_LIST_QUERY).toContain("pokemon_v2_pokemontypes");
      expect(POKEMON_LIST_QUERY).toContain("pokemon_v2_pokemonspecies");
      expect(POKEMON_LIST_QUERY).toContain("pokemon_v2_pokemonhabitat");
      expect(POKEMON_LIST_QUERY).toContain("pokemon_v2_generation");
      expect(POKEMON_LIST_QUERY).toContain("is_default");
      expect(POKEMON_LIST_QUERY).not.toContain("pokemon_v2_pokemonstats");
      expect(POKEMON_LIST_QUERY).not.toContain("pokemon_v2_pokemonabilities");
      expect(POKEMON_LIST_QUERY).not.toContain("pokemon_v2_pokemonspeciesflavortexts");
      expect(POKEMON_LIST_QUERY).not.toContain("pokemon_v2_pokemoncries");
    });
  });

  describe("fetchPokemonList", () => {
    it("devuelve 30 items con todos los campos normalizados", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            pokemon_v2_pokemon: buildRaw(1, 30),
          },
        }),
      );

      const result = await fetchPokemonList({ offset: 0 });

      expect(result.items).toHaveLength(30);
      expect(result.nextOffset).toBe(30);
      expect(result.total).toBeNull();

      const first = result.items[0]!;
      expect(first).toEqual({
        id: 1,
        name: "poke-1",
        height: 2,
        weight: 5,
        spriteFront: "https://img/1.png",
        types: [{ slot: 1, name: "grass" }],
        habitat: "bosque",
        generation: "generation-i",
      });

      expectValidPokemonTypes(first.types);

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe("https://beta.pokeapi.co/graphql/v1beta");
      const payload = JSON.parse((init as RequestInit).body as string);
      expect(payload.variables).toEqual({
        limit: POKEMON_LIST_PAGE_SIZE,
        offset: 0,
        where: undefined,
        orderBy: { id: "asc" },
      });
      expect(payload.query).toContain("PokemonList");
    });

    it("permite offset + limit personalizados", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ data: { pokemon_v2_pokemon: buildRaw(31, 30) } }),
      );

      const result = await fetchPokemonList({ offset: 30 });

      expect(result.items).toHaveLength(30);
      expect(result.items[0]!.id).toBe(31);
      expect(result.items[29]!.id).toBe(60);
      expect(result.nextOffset).toBe(60);

      const payload = JSON.parse(
        (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
      );
      expect(payload.variables).toMatchObject({ limit: 30, offset: 30 });
    });

    it("los siguientes 30 items son distintos (paginación real)", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      fetchMock
        .mockResolvedValueOnce(
          graphqlResponse({ data: { pokemon_v2_pokemon: buildRaw(1, 30) } }),
        )
        .mockResolvedValueOnce(
          graphqlResponse({ data: { pokemon_v2_pokemon: buildRaw(31, 30) } }),
        );

      const first = await fetchPokemonList({ offset: 0 });
      const second = await fetchPokemonList({ offset: first.nextOffset! });

      expect(first.items.map((i) => i.id)).toEqual(
        Array.from({ length: 30 }, (_, i) => i + 1),
      );
      expect(second.items.map((i) => i.id)).toEqual(
        Array.from({ length: 30 }, (_, i) => i + 31),
      );
      expect(second.nextOffset).toBe(60);
    });

    it("nextOffset es null cuando se devuelven menos de `limit` items", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ data: { pokemon_v2_pokemon: buildRaw(1, 5) } }),
      );

      const result = await fetchPokemonList({ offset: 0, limit: 30 });

      expect(result.items).toHaveLength(5);
      expect(result.nextOffset).toBeNull();
    });

    it("mapea varios tipos y alias de hábitat conocidos", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            pokemon_v2_pokemon: [
              {
                id: 1,
                name: "bulbasaur",
                height: 7,
                weight: 69,
                pokemon_v2_pokemonsprites: [{ sprites: { front_default: "x" } }],
                pokemon_v2_pokemontypes: [
                  { slot: 1, pokemon_v2_type: { name: "grass" } },
                  { slot: 2, pokemon_v2_type: { name: "poison" } },
                ],
                pokemon_v2_pokemonspecies: {
                  pokemon_v2_pokemonhabitat: { name: "grassland" },
                  pokemon_v2_generation: { name: "generation-i" },
                },
              },
              {
                id: 2,
                name: "ivysaur",
                height: 10,
                weight: 130,
                pokemon_v2_pokemonsprites: [{ sprites: null }],
                pokemon_v2_pokemontypes: [
                  { slot: 1, pokemon_v2_type: { name: "poison" } },
                ],
                pokemon_v2_pokemonspecies: {
                  pokemon_v2_pokemonhabitat: null,
                  pokemon_v2_generation: null,
                },
              },
            ],
          },
        }),
      );

      const { items } = await fetchPokemonList({ offset: 0 });

      expect(items[0]!.types).toEqual([
        { slot: 1, name: "grass" },
        { slot: 2, name: "poison" },
      ]);
      expect(items[0]!.habitat).toBe("pradera");
      expect(items[1]!.spriteFront).toBeNull();
      expect(items[1]!.habitat).toBeNull();
      expect(items[1]!.generation).toBeNull();
    });
  });

  describe("createPokemonListPager / fetchNextPage", () => {
    it("acumula items en sucesivas llamadas a fetchNextPage", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      fetchMock
        .mockResolvedValueOnce(
          graphqlResponse({ data: { pokemon_v2_pokemon: buildRaw(1, 30) } }),
        )
        .mockResolvedValueOnce(
          graphqlResponse({ data: { pokemon_v2_pokemon: buildRaw(31, 30) } }),
        )
        .mockResolvedValueOnce(
          graphqlResponse({ data: { pokemon_v2_pokemon: buildRaw(61, 10) } }),
        );

      const pager = createPokemonListPager({ pageSize: 30 });

      expect(pager.hasMore).toBe(true);
      expect(pager.offset).toBe(0);
      expect(pager.items).toHaveLength(0);

      await fetchNextPage(pager);
      expect(pager.items).toHaveLength(30);
      expect(pager.offset).toBe(30);
      expect(pager.hasMore).toBe(true);

      await fetchNextPage(pager);
      expect(pager.items).toHaveLength(60);
      expect(pager.offset).toBe(60);
      expect(pager.hasMore).toBe(true);

      const last = await fetchNextPage(pager);
      expect(last.items).toHaveLength(10);
      expect(pager.items).toHaveLength(70);
      expect(pager.offset).toBe(60);
      expect(pager.hasMore).toBe(false);

      const empty = await fetchNextPage(pager);
      expect(empty.items).toHaveLength(0);
    });
  });
});
