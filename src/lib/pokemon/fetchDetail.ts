import { request } from "@/src/lib/graphql/client";
import { POKEMON_DETAIL_QUERY } from "@/src/lib/graphql/queries/pokemonDetail.gql";
import {
  type EvolutionNode,
  type Generation,
  type Habitat,
  type PokemonAbility,
  type PokemonDetail,
  type PokemonSprites,
  type PokemonSpritesJson,
  type PokemonStat,
  type PokemonType,
  type PokemonTypeRef,
} from "@/src/lib/types/pokemon";
import { detailCache } from "@/src/lib/pokemon/cacheStrategy";

/**
 * Mapeo de habitats inglés→español. Replicado del módulo de lista para
 * mantener este archivo autocontenido.
 */
const HABITAT_ALIAS: Record<string, Habitat> = {
  cave: "caverna",
  forest: "bosque",
  grassland: "pradera",
  mountain: "montana",
  "rough-terrain": "montana",
  field: "campo",
  freshwater: "agua_dulce",
  "waters-edge": "agua_dulce",
  sea: "agua_salada",
  urban: "ciudad",
  rare: "raro",
};

function asHabitat(name: string | null | undefined): Habitat | null {
  if (!name) return null;
  return HABITAT_ALIAS[name] ?? "generico";
}

const GENERATIONS: ReadonlyArray<Generation> = [
  "generation-i",
  "generation-ii",
  "generation-iii",
  "generation-iv",
  "generation-v",
  "generation-vi",
  "generation-vii",
  "generation-viii",
  "generation-ix",
];

function asGeneration(name: string | null | undefined): Generation | null {
  if (!name) return null;
  return (GENERATIONS as ReadonlyArray<string>).includes(name)
    ? (name as Generation)
    : null;
}

const TYPES: ReadonlyArray<PokemonType> = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
];

function asType(name: string): PokemonType | null {
  return (TYPES as ReadonlyArray<string>).includes(name)
    ? (name as PokemonType)
    : null;
}

function mapSprites(raw: unknown): PokemonSprites {
  if (!raw || typeof raw !== "object") {
    return {
      frontDefault: null,
      frontShiny: null,
      backDefault: null,
      backShiny: null,
    };
  }
  const s = raw as PokemonSpritesJson;
  return {
    frontDefault: typeof s.front_default === "string" ? s.front_default : null,
    frontShiny: typeof s.front_shiny === "string" ? s.front_shiny : null,
    backDefault: typeof s.back_default === "string" ? s.back_default : null,
    backShiny: typeof s.back_shiny === "string" ? s.back_shiny : null,
  };
}

/**
 * Forma cruda de `cries` (JSON) según la PokeAPI.
 * La beta GraphQL expone `latest` y `legacy` con URLs opcionales.
 */
interface PokemonCriesJson {
  latest?: string | null;
  legacy?: string | null;
}

function extractCryLatest(cries: unknown): string | null {
  if (!cries || typeof cries !== "object") return null;
  const c = cries as PokemonCriesJson;
  return typeof c.latest === "string" ? c.latest : null;
}

export interface RawPokemonDetailResponse {
  pokemon_v2_pokemonspecies: Array<{
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
    pokemon_v2_pokemons: Array<{
      id: number;
      name: string;
      height: number | null;
      weight: number | null;
      base_experience: number | null;
      pokemon_v2_pokemonstats: Array<{
        base_stat: number;
        pokemon_v2_stat: { name: string };
      }>;
      pokemon_v2_pokemonabilities: Array<{
        is_hidden: boolean;
        slot: number;
        pokemon_v2_ability: { name: string };
      }>;
      pokemon_v2_pokemontypes: Array<{
        slot: number;
        pokemon_v2_type: { name: string };
      }>;
      pokemon_v2_pokemonsprites: Array<{ sprites: unknown }>;
      pokemon_v2_pokemoncries: Array<{ cries: unknown }>;
    }>;
    pokemon_v2_evolutionchain: {
      pokemon_v2_pokemonspecies: Array<{
        id: number;
        name: string;
        evolves_from_species_id: number | null;
      }>;
    } | null;
  }>;
}

/**
 * Normaliza la lista de species de una cadena evolutiva en un array
 * plano ordenado por niveles (BFS desde la raíz).
 *
 * La PokeAPI devuelve todas las species de la cadena como una lista
 * plana con `evolves_from_species_id`. Algunas cadenas (Eevee) tienen
 * varias ramas. Esta función devuelve un orden estable BFS: raíz,
 * luego hijos, nietos, etc. Si la cadena está malformada (varios
 * nodos sin padre) se considera raíz el primero con `id` menor.
 */
export function buildEvolutionChain(
  raw: Array<{
    id: number;
    name: string;
    evolves_from_species_id: number | null;
  }>,
): ReadonlyArray<EvolutionNode> {
  if (raw.length === 0) return [];

  const nodes: EvolutionNode[] = raw.map((n) => ({
    id: n.id,
    name: n.name,
    evolvesFromSpeciesId: n.evolves_from_species_id,
  }));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childIdsByParent = new Map<number, number[]>();
  for (const n of nodes) {
    if (n.evolvesFromSpeciesId != null) {
      const list = childIdsByParent.get(n.evolvesFromSpeciesId) ?? [];
      list.push(n.id);
      childIdsByParent.set(n.evolvesFromSpeciesId, list);
    }
  }

  // Raíces: species que no tienen padre dentro de la cadena.
  const roots = nodes
    .filter(
      (n) =>
        n.evolvesFromSpeciesId == null ||
        !byId.has(n.evolvesFromSpeciesId),
    )
    .map((n) => n.id);
  roots.sort((a, b) => a - b);

  const ordered: EvolutionNode[] = [];
  const visited = new Set<number>();
  const queue: number[] = [...roots];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (node) ordered.push(node);
    const children = childIdsByParent.get(id) ?? [];
    children.sort((a, b) => a - b);
    queue.push(...children);
  }

  // Si la cadena es disjunta (no debería pasar con PokeAPI pero por
  // seguridad), añadimos al final los nodos no visitados.
  for (const n of nodes) {
    if (!visited.has(n.id)) ordered.push(n);
  }

  return ordered;
}

/**
 * Devuelve un fragmento de la cadena evolutiva con `pivot` en la
 * posición central. Se usa en la UI para que el pokemon consultado
 * aparezca destacado (como el del medio). No se implementa aquí
 * porque es responsabilidad del plan 08 (detalle); se deja la
 * lista BFS completa para que el consumidor la proyecte.
 */

/**
 * Recupera el detalle completo de un pokemon a partir de su nombre
 * (en inglés, según la PokeAPI).
 *
 * Lanza `Error("Pokemon not found")` si la especie no existe.
 */
export async function fetchPokemonDetail(name: string): Promise<PokemonDetail> {
  const data = await request<RawPokemonDetailResponse>(
    POKEMON_DETAIL_QUERY,
    { name },
    "PokemonDetail",
    { next: detailCache(name) },
  );

  const species = data.pokemon_v2_pokemonspecies[0];
  if (!species) throw new Error(`Pokemon not found: ${name}`);

  const pokemon = species.pokemon_v2_pokemons[0];
  if (!pokemon) throw new Error(`Pokemon default form not found: ${name}`);

  const types: PokemonTypeRef[] = [];
  for (const t of pokemon.pokemon_v2_pokemontypes) {
    const typeName = asType(t.pokemon_v2_type.name);
    if (typeName) types.push({ slot: t.slot, name: typeName });
  }
  types.sort((a, b) => a.slot - b.slot);

  const stats: PokemonStat[] = pokemon.pokemon_v2_pokemonstats.map((s) => ({
    name: s.pokemon_v2_stat.name,
    baseStat: s.base_stat,
  }));

  const abilities: PokemonAbility[] = pokemon.pokemon_v2_pokemonabilities
    .map((a) => ({
      name: a.pokemon_v2_ability.name,
      isHidden: a.is_hidden,
      slot: a.slot,
    }))
    .sort((a, b) => a.slot - b.slot);

  const sprites = mapSprites(pokemon.pokemon_v2_pokemonsprites[0]?.sprites);
  const cryLatestUrl = extractCryLatest(
    pokemon.pokemon_v2_pokemoncries[0]?.cries,
  );

  // Flavor text: prioridad al primer elemento (ordenado por version_id DESC).
  const firstFlavor = species.pokemon_v2_pokemonspeciesflavortexts[0];

  const evolutionChain = buildEvolutionChain(
    species.pokemon_v2_evolutionchain?.pokemon_v2_pokemonspecies ?? [],
  );

  return {
    id: pokemon.id,
    name: pokemon.name,
    height: pokemon.height,
    weight: pokemon.weight,
    baseExperience: pokemon.base_experience,
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
    captureRate: species.capture_rate,
    baseHappiness: species.base_happiness,
    generation: asGeneration(species.pokemon_v2_generation?.name),
    habitat: asHabitat(species.pokemon_v2_pokemonhabitat?.name),
    types,
    stats,
    abilities,
    sprites,
    cryLatestUrl,
    flavorText: firstFlavor?.flavor_text ?? null,
    flavorTextVersion: firstFlavor?.pokemon_v2_version?.name ?? null,
    evolutionChain,
  };
}
