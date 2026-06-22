import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEvolutionChain,
  fetchPokemonDetail,
} from "@/src/lib/pokemon/fetchDetail";
import { POKEMON_DETAIL_QUERY } from "@/src/lib/graphql/queries/pokemonDetail.gql";

const ORIGINAL_FETCH = globalThis.fetch;

interface RawAbility {
  is_hidden: boolean;
  slot: number;
  ability: { name: string };
}

interface RawStat {
  base_stat: number;
  stat: { name: string };
}

interface RawType {
  slot: number;
  type: { name: string };
}

interface RawPokemon {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  base_experience: number | null;
  pokemonstats: RawStat[];
  pokemonabilities: RawAbility[];
  pokemontypes: RawType[];
  pokemonsprites: Array<{ sprites: unknown }>;
  pokemoncries: Array<{ cries: unknown }>;
}

interface RawSpecies {
  id: number;
  name: string;
  is_legendary: boolean;
  is_mythical: boolean;
  capture_rate: number | null;
  base_happiness: number | null;
  generation: { name: string } | null;
  pokemonhabitat: { name: string } | null;
  pokemonspeciesflavortexts: Array<{
    flavor_text: string;
    version: { name: string } | null;
  }>;
  pokemons: RawPokemon[];
  evolutionchain: {
    pokemonspecies: Array<{
      id: number;
      name: string;
      evolves_from_species_id: number | null;
    }>;
  } | null;
}

function pikachuResponse(overrides: Partial<RawSpecies> = {}): { data: { pokemonspecies: RawSpecies[] } } {
  const species: RawSpecies = {
    id: 25,
    name: "pikachu",
    is_legendary: false,
    is_mythical: false,
    capture_rate: 190,
    base_happiness: 70,
    generation: { name: "generation-i" },
    pokemonhabitat: { name: "forest" },
    pokemonspeciesflavortexts: [
      {
        flavor_text: "Cuando se enfada, descarga la energía almacenada en sus mejillas.",
        version: { name: "lets-go-pikachu" },
      },
      {
        flavor_text: "Las mejillas cargadas de electricidad.",
        version: { name: "red" },
      },
    ],
    pokemons: [
      {
        id: 25,
        name: "pikachu",
        height: 4,
        weight: 60,
        base_experience: 112,
        pokemonstats: [
          { base_stat: 35, stat: { name: "hp" } },
          { base_stat: 55, stat: { name: "attack" } },
          { base_stat: 40, stat: { name: "defense" } },
          { base_stat: 50, stat: { name: "special-attack" } },
          { base_stat: 50, stat: { name: "special-defense" } },
          { base_stat: 90, stat: { name: "speed" } },
        ],
        pokemonabilities: [
          { is_hidden: false, slot: 1, ability: { name: "static" } },
          { is_hidden: true, slot: 3, ability: { name: "lightning-rod" } },
        ],
        pokemontypes: [
          { slot: 1, type: { name: "electric" } },
        ],
        pokemonsprites: [
          {
            sprites: {
              front_default: "https://img/pikachu.png",
              front_shiny: "https://img/pikachu-shiny.png",
              back_default: "https://img/pikachu-back.png",
              back_shiny: "https://img/pikachu-back-shiny.png",
            },
          },
        ],
        pokemoncries: [
          { cries: { latest: "https://cries/pikachu.ogg", legacy: "https://cries/pikachu-old.ogg" } },
        ],
      },
    ],
    evolutionchain: {
      pokemonspecies: [
        { id: 172, name: "pichu", evolves_from_species_id: null },
        { id: 25, name: "pikachu", evolves_from_species_id: 172 },
        { id: 26, name: "raichu", evolves_from_species_id: 25 },
      ],
    },
    ...overrides,
  };
  return { data: { pokemonspecies: [species] } };
}

function graphqlResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchDetail", () => {
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
      expect(POKEMON_DETAIL_QUERY).toContain("pokemonspecies");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemonstats");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemonabilities");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemontypes");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemonsprites");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemoncries");
      expect(POKEMON_DETAIL_QUERY).toContain("generation");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemonhabitat");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemonspeciesflavortexts");
      expect(POKEMON_DETAIL_QUERY).toContain("evolutionchain");
      expect(POKEMON_DETAIL_QUERY).toContain('_eq: "es"');
      expect(POKEMON_DETAIL_QUERY).not.toContain("pokemonmoves");
      expect(POKEMON_DETAIL_QUERY).not.toContain("encounters");
      expect(POKEMON_DETAIL_QUERY).not.toContain("pokemonitems");
    });
  });

  describe("buildEvolutionChain", () => {
    it("ordena una cadena lineal por niveles (BFS)", () => {
      const result = buildEvolutionChain([
        { id: 1, name: "a", evolves_from_species_id: null },
        { id: 2, name: "b", evolves_from_species_id: 1 },
        { id: 3, name: "c", evolves_from_species_id: 2 },
      ]);
      expect(result.map((n) => n.name)).toEqual(["a", "b", "c"]);
    });

    it("ordena cadenas con múltiples hijos por id del hijo", () => {
      const result = buildEvolutionChain([
        { id: 133, name: "eevee", evolves_from_species_id: null },
        { id: 134, name: "vaporeon", evolves_from_species_id: 133 },
        { id: 135, name: "jolteon", evolves_from_species_id: 133 },
        { id: 136, name: "flareon", evolves_from_species_id: 133 },
      ]);
      expect(result.map((n) => n.name)).toEqual([
        "eevee",
        "vaporeon",
        "jolteon",
        "flareon",
      ]);
    });

    it("encadena nietos de cada rama", () => {
      const result = buildEvolutionChain([
        { id: 1, name: "a", evolves_from_species_id: null },
        { id: 2, name: "b", evolves_from_species_id: 1 },
        { id: 3, name: "c", evolves_from_species_id: 1 },
        { id: 4, name: "d", evolves_from_species_id: 2 },
      ]);
      expect(result.map((n) => n.name)).toEqual(["a", "b", "c", "d"]);
    });

    it("devuelve array vacío si la cadena está vacía", () => {
      expect(buildEvolutionChain([])).toEqual([]);
    });

    it("ignora referencias a species que no están en la cadena", () => {
      const result = buildEvolutionChain([
        { id: 1, name: "a", evolves_from_species_id: 999 },
        { id: 2, name: "b", evolves_from_species_id: 1 },
      ]);
      expect(result.map((n) => n.name)).toEqual(["a", "b"]);
    });
  });

  describe("fetchPokemonDetail", () => {
    it("devuelve stats, abilities, types y evolution de pikachu", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(graphqlResponse(pikachuResponse()));

      const detail = await fetchPokemonDetail("pikachu");

      expect(detail.id).toBe(25);
      expect(detail.name).toBe("pikachu");
      expect(detail.height).toBe(4);
      expect(detail.weight).toBe(60);
      expect(detail.baseExperience).toBe(112);
      expect(detail.generation).toBe("generation-i");
      expect(detail.habitat).toBe("bosque");

      expect(detail.types).toEqual([{ slot: 1, name: "electric" }]);
      expect(detail.stats.map((s) => s.name)).toEqual([
        "hp",
        "attack",
        "defense",
        "special-attack",
        "special-defense",
        "speed",
      ]);
      expect(detail.stats[0]!.baseStat).toBe(35);
      expect(detail.abilities).toEqual([
        { name: "static", isHidden: false, slot: 1 },
        { name: "lightning-rod", isHidden: true, slot: 3 },
      ]);
      expect(detail.sprites).toEqual({
        frontDefault: "https://img/pikachu.png",
        frontShiny: "https://img/pikachu-shiny.png",
        backDefault: "https://img/pikachu-back.png",
        backShiny: "https://img/pikachu-back-shiny.png",
        officialArtwork: null,
        officialArtworkShiny: null,
        homeFront: null,
        homeShiny: null,
      });
      expect(detail.cryLatestUrl).toBe("https://cries/pikachu.ogg");
      expect(detail.evolutionChain.map((n) => n.name)).toEqual([
        "pichu",
        "pikachu",
        "raichu",
      ]);

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe("https://graphql.pokeapi.co/v1beta2");
      const payload = JSON.parse((init as RequestInit).body as string);
      expect(payload.variables).toEqual({ name: "pikachu" });
      expect(payload.query).toContain("PokemonDetail");
    });

    it("devuelve flavor text en español si está disponible", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(graphqlResponse(pikachuResponse()));

      const detail = await fetchPokemonDetail("pikachu");

      expect(detail.flavorText).toBe(
        "Cuando se enfada, descarga la energía almacenada en sus mejillas.",
      );
      expect(detail.flavorTextVersion).toBe("lets-go-pikachu");
    });

    it("devuelve flavorText null si no hay versión en español", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse(
          pikachuResponse({
            pokemonspeciesflavortexts: [],
          }),
        ),
      );

      const detail = await fetchPokemonDetail("pikachu");

      expect(detail.flavorText).toBeNull();
      expect(detail.flavorTextVersion).toBeNull();
    });

    it("lanza error cuando el pokemon no existe", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse({ data: { pokemonspecies: [] } }),
      );

      await expect(fetchPokemonDetail("missingno")).rejects.toThrow(
        /not found/i,
      );
    });

    it("devuelve cry null si no hay cries", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse(
          pikachuResponse({
            pokemons: [
              {
                ...pikachuResponse().data.pokemonspecies[0]!
                  .pokemons[0]!,
                pokemoncries: [],
              },
            ],
          }),
        ),
      );

      const detail = await fetchPokemonDetail("pikachu");
      expect(detail.cryLatestUrl).toBeNull();
    });

    it("marca legendarios y mythical correctamente", async () => {
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      fetchMock.mockResolvedValueOnce(
        graphqlResponse(
          pikachuResponse({ is_legendary: true, is_mythical: false }),
        ),
      );
      const detail = await fetchPokemonDetail("pikachu");
      expect(detail.isLegendary).toBe(true);
      expect(detail.isMythical).toBe(false);
    });
  });
});
