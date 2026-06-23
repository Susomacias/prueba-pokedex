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
      officialArtwork: null,
      homeFront: null,
      homeShiny: null,
      officialArtworkShiny: null,
    };
  }
  const s = raw as PokemonSpritesJson;
  const other = (s.other ?? {}) as Record<string, unknown>;
  const officialArtwork = (other["official-artwork"] ?? {}) as Record<
    string,
    unknown
  >;
  const home = (other.home ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === "string" ? v : null;
  return {
    frontDefault: str(s.front_default),
    frontShiny: str(s.front_shiny),
    backDefault: str(s.back_default),
    backShiny: str(s.back_shiny),
    officialArtwork: str(officialArtwork.front_default),
    officialArtworkShiny: str(officialArtwork.front_shiny),
    homeFront: str(home.front_default),
    homeShiny: str(home.front_shiny),
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

/**
 * Fallback a la PokeAPI REST para obtener el cry cuando la query
 * GraphQL beta (`v1beta2`) no lo expone.
 *
 * La beta de GraphQL no incluye los cries de la mayoría de pokemons
 * (devuelve `pokemoncries: []` siempre). Sin embargo, la PokeAPI
 * REST (`/api/v2/pokemon/{name}`) sí expone `cries.latest` para los
 * pokemons que tienen cry disponible. Como fallback, cuando el
 * GraphQL no devuelve cry, hacemos una llamada REST adicional
 * ligera para extraerlo. La llamada falla silenciosamente (devuelve
 * `null`) si el pokemon no tiene cry o si la red falla.
 *
 * La URL del cry suele ser:
 *   https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/{id}.ogg
 * Pero no todos los IDs tienen cry disponible, así que validamos
 * que el endpoint REST devuelva `cries.latest` no nulo.
 */
async function fetchCryFromRest(pokemonId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`, {
      // Cache agresivo: los cries no cambian.
      next: { revalidate: 86400 * 7 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      cries?: { latest?: string | null; legacy?: string | null };
    };
    const latest = data.cries?.latest;
    return typeof latest === "string" && latest.length > 0 ? latest : null;
  } catch {
    return null;
  }
}

export interface RawPokemonDetailResponse {
  pokemonspecies: Array<{
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
    pokemons: Array<{
      id: number;
      name: string;
      height: number | null;
      weight: number | null;
      base_experience: number | null;
      pokemonstats: Array<{
        base_stat: number;
        stat: { name: string };
      }>;
      pokemonabilities: Array<{
        is_hidden: boolean;
        slot: number;
        ability: { name: string };
      }>;
      pokemontypes: Array<{
        slot: number;
        type: { name: string };
      }>;
      pokemonsprites: Array<{ sprites: unknown }>;
      pokemoncries: Array<{ cries: unknown }>;
    }>;
    evolutionchain: {
      pokemonspecies: Array<{
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

  const species = data.pokemonspecies[0];
  if (!species) throw new Error(`Pokemon not found: ${name}`);

  const pokemon = species.pokemons[0];
  if (!pokemon) throw new Error(`Pokemon default form not found: ${name}`);

  const types: PokemonTypeRef[] = [];
  for (const t of pokemon.pokemontypes) {
    const typeName = asType(t.type.name);
    if (typeName) types.push({ slot: t.slot, name: typeName });
  }
  types.sort((a, b) => a.slot - b.slot);

  const stats: PokemonStat[] = pokemon.pokemonstats.map((s) => ({
    name: s.stat.name,
    baseStat: s.base_stat,
  }));

  const abilities: PokemonAbility[] = pokemon.pokemonabilities
    .map((a) => ({
      name: a.ability.name,
      isHidden: a.is_hidden,
      slot: a.slot,
    }))
    .sort((a, b) => a.slot - b.slot);

  const sprites = mapSprites(pokemon.pokemonsprites[0]?.sprites);

  // Cry: la query GraphQL beta (`v1beta2`) no expone los cries
  // (`pokemoncries: []` siempre). Para que el botón de sonido
  // funcione, hacemos una llamada adicional a la PokeAPI REST
  // (`/api/v2/pokemon/{id}`) **en paralelo** al mapeo. La latencia
  // total del detalle es `max(graphql, rest)` en lugar de
  // `graphql + rest` secuencial.
  //
  // Si GraphQL devuelve cry (caso raro), lo usamos y descartamos
  // la promesa REST. Si no, esperamos al REST.
  const cryGraphql = extractCryLatest(pokemon.pokemoncries[0]?.cries);
  const restCryPromise: Promise<string | null> = cryGraphql
    ? Promise.resolve(null)
    : fetchCryFromRest(pokemon.id);
  const cryLatestUrl = cryGraphql ?? (await restCryPromise);

  // Flavor text: prioridad al primer elemento (ordenado por version_id DESC).
  const firstFlavor = species.pokemonspeciesflavortexts[0];

  const evolutionChain = buildEvolutionChain(
    species.evolutionchain?.pokemonspecies ?? [],
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
    generation: asGeneration(species.generation?.name),
    habitat: asHabitat(species.pokemonhabitat?.name),
    types,
    stats,
    abilities,
    sprites,
    cryLatestUrl,
    flavorText: firstFlavor?.flavor_text ?? null,
    flavorTextVersion: firstFlavor?.version?.name ?? null,
    evolutionChain,
  };
}
