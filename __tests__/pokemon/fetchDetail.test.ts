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
  pokemon_v2_ability: { name: string };
}

interface RawStat {
  base_stat: number;
  pokemon_v2_stat: { name: string };
}

interface RawType {
  slot: number;
  pokemon_v2_type: { name: string };
}

interface RawPokemon {
  id: number;
  name: string;
  height: number | null;
  weight: number | null;
  base_experience: number | null;
  pokemon_v2_pokemonstats: RawStat[];
  pokemon_v2_pokemonabilities: RawAbility[];
  pokemon_v2_pokemontypes: RawType[];
  pokemon_v2_pokemonsprites: Array<{ sprites: unknown }>;
  pokemon_v2_pokemoncries: Array<{ cries: unknown }>;
}

interface RawSpecies {
  id: number;
  name: string;
  is_legendary: boolean;
  is_mythical: boolean;
  capture_rate: number | null;
  base_happiness: number | null;
  pokemon_v2_generation: { name: string } | null;
  pokemon_v2_pokemonhabitat: { name: string } | null;
  pokemon_v2_pokemonspeciesflavortexts: Array<{
    flavor_text: string;
    pokemon_v2_version: { name: string } | null;
  }>;
  pokemon_v2_pokemons: RawPokemon[];
  pokemon_v2_evolutionchain: {
    pokemon_v2_pokemonspecies: Array<{
      id: number;
      name: string;
      evolves_from_species_id: number | null;
    }>;
  } | null;
}

function pikachuResponse(overrides: Partial<RawSpecies> = {}): { data: { pokemon_v2_pokemonspecies: RawSpecies[] } } {
  const species: RawSpecies = {
    id: 25,
    name: "pikachu",
    is_legendary: false,
    is_mythical: false,
    capture_rate: 190,
    base_happiness: 70,
    pokemon_v2_generation: { name: "generation-i" },
    pokemon_v2_pokemonhabitat: { name: "forest" },
    pokemon_v2_pokemonspeciesflavortexts: [
      {
        flavor_text: "Cuando se enfada, descarga la energía almacenada en sus mejillas.",
        pokemon_v2_version: { name: "lets-go-pikachu" },
      },
      {
        flavor_text: "Las mejillas cargadas de electricidad.",
        pokemon_v2_version: { name: "red" },
      },
    ],
    pokemon_v2_pokemons: [
      {
        id: 25,
        name: "pikachu",
        height: 4,
        weight: 60,
        base_experience: 112,
        pokemon_v2_pokemonstats: [
          { base_stat: 35, pokemon_v2_stat: { name: "hp" } },
          { base_stat: 55, pokemon_v2_stat: { name: "attack" } },
          { base_stat: 40, pokemon_v2_stat: { name: "defense" } },
          { base_stat: 50, pokemon_v2_stat: { name: "special-attack" } },
          { base_stat: 50, pokemon_v2_stat: { name: "special-defense" } },
          { base_stat: 90, pokemon_v2_stat: { name: "speed" } },
        ],
        pokemon_v2_pokemonabilities: [
          { is_hidden: false, slot: 1, pokemon_v2_ability: { name: "static" } },
          { is_hidden: true, slot: 3, pokemon_v2_ability: { name: "lightning-rod" } },
        ],
        pokemon_v2_pokemontypes: [
          { slot: 1, pokemon_v2_type: { name: "electric" } },
        ],
        pokemon_v2_pokemonsprites: [
          {
            sprites: {
              front_default: "https://img/pikachu.png",
              front_shiny: "https://img/pikachu-shiny.png",
              back_default: "https://img/pikachu-back.png",
              back_shiny: "https://img/pikachu-back-shiny.png",
            },
          },
        ],
        pokemon_v2_pokemoncries: [
          { cries: { latest: "https://cries/pikachu.ogg", legacy: "https://cries/pikachu-old.ogg" } },
        ],
      },
    ],
    pokemon_v2_evolutionchain: {
      pokemon_v2_pokemonspecies: [
        { id: 172, name: "pichu", evolves_from_species_id: null },
        { id: 25, name: "pikachu", evolves_from_species_id: 172 },
        { id: 26, name: "raichu", evolves_from_species_id: 25 },
      ],
    },
    ...overrides,
  };
  return { data: { pokemon_v2_pokemonspecies: [species] } };
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
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_pokemonspecies");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_pokemonstats");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_pokemonabilities");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_pokemontypes");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_pokemonsprites");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_pokemoncries");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_generation");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_pokemonhabitat");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_pokemonspeciesflavortexts");
      expect(POKEMON_DETAIL_QUERY).toContain("pokemon_v2_evolutionchain");
      expect(POKEMON_DETAIL_QUERY).toContain('_eq: "es"');
      expect(POKEMON_DETAIL_QUERY).not.toContain("pokemon_v2_pokemonmoves");
      expect(POKEMON_DETAIL_QUERY).not.toContain("pokemon_v2_encounters");
      expect(POKEMON_DETAIL_QUERY).not.toContain("pokemon_v2_pokemonitems");
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
      });
      expect(detail.cryLatestUrl).toBe("https://cries/pikachu.ogg");
      expect(detail.evolutionChain.map((n) => n.name)).toEqual([
        "pichu",
        "pikachu",
        "raichu",
      ]);

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe("https://beta.pokeapi.co/graphql/v1beta");
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
            pokemon_v2_pokemonspeciesflavortexts: [],
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
        graphqlResponse({ data: { pokemon_v2_pokemonspecies: [] } }),
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
            pokemon_v2_pokemons: [
              {
                ...pikachuResponse().data.pokemon_v2_pokemonspecies[0]!
                  .pokemon_v2_pokemons[0]!,
                pokemon_v2_pokemoncries: [],
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
