import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyFiltersToList } from "@/src/lib/pokemon/fetchListFiltered";
import { POKEMON_LIST_PAGE_SIZE } from "@/src/lib/types/pokemon";

const ORIGINAL_FETCH = globalThis.fetch;

function graphqlResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

interface RawType {
  slot: number;
  type: { name: string };
}

interface RawSpecies {
  pokemonhabitat: { name: string } | null;
  generation: { name: string } | null;
  pokemoncolor: { name: string } | null;
  pokemonspeciesflavortexts: Array<{
    flavor_text: string;
    language: { name: string };
  }>;
}

interface RawPokemon {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  pokemonsprites: Array<{ sprites: unknown }>;
  pokemontypes: RawType[];
  pokemonspecy: RawSpecies | null;
}

function captureFetch(): { mock: ReturnType<typeof vi.fn> } {
  const mock = vi.fn();
  globalThis.fetch = mock as unknown as typeof fetch;
  return { mock };
}

function callsOf(mock: ReturnType<typeof vi.fn>): Array<{
  limit?: number;
  offset?: number;
  where?: Record<string, unknown> | undefined;
  orderBy?: Record<string, unknown>;
}> {
  return mock.mock.calls.map(([, init]) => {
    const body = JSON.parse((init as RequestInit).body as string) as {
      variables?: {
        limit?: number;
        offset?: number;
        where?: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
      };
    };
    return body.variables ?? {};
  });
}

function fire(
  raw: RawPokemon[],
  aggregate: { count: number } | null = null,
): Response {
  const data: Record<string, unknown> = {
    pokemon: raw,
  };
  if (aggregate !== null) {
    data.pokemon_aggregate = { aggregate };
  }
  return graphqlResponse({ data });
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
      pokemonsprites: [
        { sprites: { front_default: `https://img/${id}.png` } },
      ],
      pokemontypes: [{ slot: 1, type: { name: "grass" } }],
      pokemonspecy: {
        pokemonhabitat: { name: "forest" },
        generation: { name: "generation-i" },
        pokemoncolor: { name: "green" },
        pokemonspeciesflavortexts: [],
      },
      ...overrides,
    };
  });
}

describe("applyFiltersToList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POKEAPI_GRAPHQL_URL", "");
  });

describe("filtros combinables", () => {
    it("filtra por tipo1 (fire) → solo pokemons de tipo fire", async () => {
      const { mock } = captureFetch();
      // El mock simula la respuesta del servidor tras aplicar el
      // `where` server-side: solo devuelve charmander.
      mock.mockResolvedValueOnce(
        fire([
          {
            id: 1,
            name: "charmander",
            height: 6,
            weight: 85,
            pokemonsprites: [
              { sprites: { front_default: "x" } },
            ],
            pokemontypes: [
              { slot: 1, type: { name: "fire" } },
            ],
            pokemonspecy: {
              pokemonhabitat: { name: "mountain" },
              generation: { name: "generation-i" },
              pokemoncolor: { name: "red" },
              pokemonspeciesflavortexts: [],
            },
          },
        ]),
      );

      const page = await applyFiltersToList({ type1: "fire" }, 0);

      expect(page.items.map((i) => i.name)).toEqual(["charmander"]);
      // El `where` enviado debe filtrar por type=fire
      const where = callsOf(mock)[0]!.where as Record<string, unknown>;
      expect(JSON.stringify(where)).toContain("fire");
    });

it("combina tipo + generación con AND", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        fire([
          {
            id: 1,
            name: "charmander",
            height: 6,
            weight: 85,
            pokemonsprites: [
              { sprites: { front_default: "x" } },
            ],
            pokemontypes: [
              { slot: 1, type: { name: "fire" } },
            ],
            pokemonspecy: {
              pokemonhabitat: { name: "mountain" },
              generation: { name: "generation-i" },
              pokemoncolor: { name: "red" },
              pokemonspeciesflavortexts: [],
            },
          },
        ]),
      );

      await applyFiltersToList(
        { type1: "fire", generation: "generation-i" },
        0,
      );

      const where = callsOf(mock)[0]!.where as {
        _and: Array<Record<string, unknown>>;
      };
      // AND combinando tipo + generación
      expect(where._and.length).toBe(2);
      const dump = JSON.stringify(where);
      expect(dump).toContain("fire");
      expect(dump).toContain("generation-i");
    });

    it("filtra por habitat (en español)", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        fire([
          {
            id: 10,
            name: "pikachu",
            height: 4,
            weight: 60,
            pokemonsprites: [
              { sprites: { front_default: "x" } },
            ],
            pokemontypes: [
              { slot: 1, type: { name: "electric" } },
            ],
            pokemonspecy: {
              pokemonhabitat: { name: "forest" },
              generation: { name: "generation-i" },
              pokemoncolor: { name: "yellow" },
              pokemonspeciesflavortexts: [],
            },
          },
        ]),
      );

      await applyFiltersToList({ habitat: "bosque" }, 0);

      const where = callsOf(mock)[0]!.where as {
        _and: Array<Record<string, unknown>>;
      };
      const dump = JSON.stringify(where);
      // La clave interna "bosque" se traduce a "forest" antes de enviarse
      expect(dump).toContain("forest");
      expect(dump).not.toContain("bosque");
    });

    it("filtra por ability", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(fire(buildRaw(1, 1)));

      await applyFiltersToList({ ability: "static" }, 0);

      const where = callsOf(mock)[0]!.where as {
        _and: Array<Record<string, unknown>>;
      };
      const dump = JSON.stringify(where);
      expect(dump).toContain("pokemonabilities");
      expect(dump).toContain("static");
    });

    it("filtra por bucket de altura", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(fire(buildRaw(1, 1)));

      await applyFiltersToList(
        {
          height: {
            value: "s",
            label: "S (3–10 dm)",
            min: 3,
            max: 10,
          },
        },
        0,
      );

      const where = callsOf(mock)[0]!.where as {
        _and: Array<Record<string, unknown>>;
      };
      const dump = JSON.stringify(where);
      expect(dump).toContain("height");
      expect(dump).toContain("_gte");
      expect(dump).toContain("_lte");
    });

    it("filtra por bucket de peso", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(fire(buildRaw(1, 1)));

      await applyFiltersToList(
        {
          weight: {
            value: "heavy",
            label: "Pesado (500–1000 hg)",
            min: 500,
            max: 1000,
          },
        },
        0,
      );

      const where = callsOf(mock)[0]!.where as {
        _and: Array<Record<string, unknown>>;
      };
      const dump = JSON.stringify(where);
      expect(dump).toContain("weight");
    });
  });

  describe("buscador", () => {
it("búsqueda por nombre parcial devuelve coincidencias", async () => {
      const { mock } = captureFetch();
      // El mock simula la respuesta del servidor tras el filtro
      // `name: { _ilike: "%pika%" }`: solo devuelve pikachu.
      mock.mockResolvedValueOnce(
        fire([
          {
            id: 25,
            name: "pikachu",
            height: 4,
            weight: 60,
            pokemonsprites: [
              { sprites: { front_default: "x" } },
            ],
            pokemontypes: [
              { slot: 1, type: { name: "electric" } },
            ],
            pokemonspecy: {
              pokemonhabitat: { name: "forest" },
              generation: { name: "generation-i" },
              pokemoncolor: { name: "yellow" },
              pokemonspeciesflavortexts: [],
            },
          },
        ]),
      );

      const page = await applyFiltersToList({}, 0, { search: "pika" });

      expect(page.items.map((i) => i.name)).toEqual(["pikachu"]);
      const where = callsOf(mock)[0]!.where as Record<string, unknown>;
      const dump = JSON.stringify(where);
      expect(dump).toContain("name");
      expect(dump).toContain("_ilike");
      expect(dump).toContain("%pika%");
    });

    it("búsqueda con 4+ letras y 0 resultados amplía a flavor_text", async () => {
      const { mock } = captureFetch();
      // Primera llamada: nombre sin resultados
      mock.mockResolvedValueOnce(fire([]));
      // Segunda llamada: búsqueda ampliada (flavor text + tipos + habitat + generation)
      mock.mockResolvedValueOnce(
        fire([
          {
            id: 25,
            name: "pikachu",
            height: 4,
            weight: 60,
            pokemonsprites: [
              { sprites: { front_default: "x" } },
            ],
            pokemontypes: [
              { slot: 1, type: { name: "electric" } },
            ],
            pokemonspecy: {
              pokemonhabitat: { name: "forest" },
              generation: { name: "generation-i" },
              pokemoncolor: { name: "yellow" },
              pokemonspeciesflavortexts: [
                {
                  flavor_text: "Electric mouse.",
                  language: { name: "en" },
                },
              ],
            },
          },
        ]),
      );

      const page = await applyFiltersToList({}, 0, {
        search: "electric mouse",
      });

      expect(page.items.map((i) => i.name)).toEqual(["pikachu"]);
      expect(mock.mock.calls.length).toBe(2);

const whereExpanded = callsOf(mock)[1]!.where as Record<
        string,
        unknown
      >;
      const dump = JSON.stringify(whereExpanded);
      expect(dump).toContain("pokemonspeciesflavortexts");
      expect(dump).toContain("pokemonhabitat");
      expect(dump).toContain("generation");
      expect(dump).toContain("type");
    });

    it("búsqueda con <3 letras NO amplía a flavor text", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(fire([]));

      const page = await applyFiltersToList({}, 0, { search: "pi" });

      expect(page.items).toHaveLength(0);
      expect(mock.mock.calls.length).toBe(1);
    });

    it("si la primera búsqueda devuelve resultados no amplía", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        fire([
          {
            id: 25,
            name: "pikachu",
            height: 4,
            weight: 60,
            pokemonsprites: [
              { sprites: { front_default: "x" } },
            ],
            pokemontypes: [
              { slot: 1, type: { name: "electric" } },
            ],
            pokemonspecy: {
              pokemonhabitat: { name: "forest" },
              generation: { name: "generation-i" },
              pokemoncolor: { name: "yellow" },
              pokemonspeciesflavortexts: [],
            },
          },
        ]),
      );

      await applyFiltersToList({}, 0, { search: "pikachu" });

      expect(mock.mock.calls.length).toBe(1);
    });
  });

  describe("caso especial: resultado único", () => {
    it("marca `single: true` cuando hay 1 solo resultado y hay búsqueda activa", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        fire([
          {
            id: 25,
            name: "pikachu",
            height: 4,
            weight: 60,
            pokemonsprites: [
              { sprites: { front_default: "x" } },
            ],
            pokemontypes: [
              { slot: 1, type: { name: "electric" } },
            ],
            pokemonspecy: {
              pokemonhabitat: { name: "forest" },
              generation: { name: "generation-i" },
              pokemoncolor: { name: "yellow" },
              pokemonspeciesflavortexts: [],
            },
          },
        ]),
      );

      const page = await applyFiltersToList({}, 0, { search: "pikachu" });

      expect(page.single).toBe(true);
      expect(page.items).toHaveLength(1);
    });

    it("marca `single: true` cuando los filtros aplicados devuelven 1 solo pokemon", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        fire([
          {
            id: 25,
            name: "pikachu",
            height: 4,
            weight: 60,
            pokemonsprites: [
              { sprites: { front_default: "x" } },
            ],
            pokemontypes: [
              { slot: 1, type: { name: "electric" } },
            ],
            pokemonspecy: {
              pokemonhabitat: { name: "forest" },
              generation: { name: "generation-i" },
              pokemoncolor: { name: "yellow" },
              pokemonspeciesflavortexts: [],
            },
          },
        ]),
      );

      const page = await applyFiltersToList({ type1: "electric" }, 0);

      expect(page.single).toBe(true);
    });
  });

  describe("total y paginación", () => {
    it("devuelve total cuando el agregador lo expone", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            pokemon: buildRaw(1, 30),
            pokemon_aggregate: { aggregate: { count: 1025 } },
          },
        }),
      );

      const page = await applyFiltersToList({}, 0);

      expect(page.total).toBe(1025);
      expect(page.nextOffset).toBe(30);
    });

    it("pasa offset y limit correctos", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(fire(buildRaw(31, 30)));

      await applyFiltersToList({}, 60, { limit: 30 });

const vars = callsOf(mock)[0]!;
      expect(vars.offset).toBe(60);
      expect(vars.limit).toBe(30);
    });

    it("usa POKEMON_LIST_PAGE_SIZE por defecto", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(fire(buildRaw(1, POKEMON_LIST_PAGE_SIZE)));

      await applyFiltersToList({}, 0);

      const vars = callsOf(mock)[0]!;
      expect(vars.limit).toBe(POKEMON_LIST_PAGE_SIZE);
    });

    it("nextOffset es null cuando se devuelven menos del limit", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(fire(buildRaw(1, 3)));

      const page = await applyFiltersToList({}, 0, { limit: 30 });

      expect(page.nextOffset).toBeNull();
      expect(page.items).toHaveLength(3);
    });
  });

describe("query", () => {
    it("usa la query filtrable", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(fire([]));

      await applyFiltersToList({}, 0);

      const firstCall = mock.mock.calls[0] as [RequestInfo | URL, RequestInit];
      const body = JSON.parse(firstCall[1].body as string) as {
        query: string;
      };
      // La query filtrable extiende la base añadiendo campos
      // (color, flavor_text, abilities) y `_aggregate`.
      expect(body.query).toContain("pokemoncolor");
      expect(body.query).toContain("pokemonspeciesflavortexts");
      expect(body.query).toContain("pokemon_aggregate");
    });

    it("incluye pokemon_aggregate en la query cuando se pide total", async () => {
      const { mock } = captureFetch();
      mock.mockResolvedValueOnce(
        graphqlResponse({
          data: {
            pokemon: buildRaw(1, 1),
            pokemon_aggregate: { aggregate: { count: 1 } },
          },
        }),
      );

      await applyFiltersToList({}, 0, { withTotal: true });

      const firstCall = mock.mock.calls[0] as [RequestInfo | URL, RequestInit];
      const body = JSON.parse(firstCall[1].body as string) as {
        query: string;
      };
      expect(body.query).toContain("pokemon_aggregate");
    });
  });
});
