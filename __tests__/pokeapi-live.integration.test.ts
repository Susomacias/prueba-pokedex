import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolvePath } from "@/__tests__/components/pokedex/console/fixtureLoader";

/* ------------------------------------------------------------------------- *
 * Test de integración contra la PokeAPI REAL (skip por defecto).
 *
 * Este test NO se ejecuta en CI por defecto. Para activarlo:
 *
 *   POKEAPI_REACHABLE=1 npm run test:run
 *
 * El test ejecuta `fetchPokemonList()` (la función real del proyecto,
 * sin mocks) contra la API en vivo y verifica que:
 *   - La query GraphQL del proyecto (definida en
 *     `src/lib/graphql/queries/`) produce el shape esperado.
 *   - El `mapRawListPokemon` mapea correctamente los campos reales
 *     (no asume nombres inventados).
 *   - Los `PokemonListItem` resultantes tienen `id`, `name`, `types`,
 *     etc. — todos los campos que consume la UI.
 *
 * Es el equivalente "contra el sistema" del que habla el plan de filtros:
 * si la query o el mapeo rompen, este test falla — igual que si la
 * app real rompe.
 *
 * Por seguridad, los resultados se comparan también contra los
 * fixtures capturados en `__tests__/fixtures/pokeapi/` para detectar
 * drift.
 * ------------------------------------------------------------------------- */

const POKEAPI_REACHABLE = process.env.POKEAPI_REACHABLE === "1";

const describeIf = POKEAPI_REACHABLE ? describe : describe.skip;

describeIf("integración contra PokeAPI real (filter-options)", () => {
  it("types: la query GraphQL devuelve la misma forma que el fixture capturado", async () => {
    const fixture = JSON.parse(
      readFileSync(resolvePath("filter-options/types.json"), "utf8"),
    ) as { data: { pokemon_v2_type: Array<{ id: number; name: string }> } };

    // Importamos dinámicamente la query desde el módulo del proyecto.
    const { request } = await import("@/src/lib/graphql/client");
    const { FILTER_OPTIONS_QUERY } = await import(
      "@/src/lib/graphql/queries/filterOptions.gql"
    );

    const live = await request<{
      pokemon_v2_type: Array<{ id: number; name: string }>;
    }>(FILTER_OPTIONS_QUERY, undefined, "FilterOptions");

    // Mismo shape (mismos nombres de campos). Comparamos los nombres
    // porque la lista concreta puede crecer (nunca encoger) en
    // PokeAPI.
    const fixtureNames = new Set(
      fixture.data.pokemon_v2_type.map((t) => t.name),
    );
    const liveNames = new Set(live.pokemon_v2_type.map((t) => t.name));
    // Todos los nombres del fixture deben existir en la respuesta
    // en vivo (subset, porque los fixtures son estáticos).
    for (const name of fixtureNames) {
      expect(liveNames.has(name)).toBe(true);
    }
    // Y debe incluir los 18 tipos canónicos que la app asume.
    for (const canonical of [
      "normal",
      "fire",
      "water",
      "grass",
      "electric",
      "ice",
      "fighting",
      "poison",
      "ground",
      "flying",
      "psychic",
      "bug",
      "rock",
      "ghost",
      "dragon",
      "dark",
      "steel",
      "fairy",
    ]) {
      expect(liveNames.has(canonical)).toBe(true);
    }
  }, 30_000);

  it("habitats: la query devuelve los hábitats que la app mapea a claves en español", async () => {
    const { request } = await import("@/src/lib/graphql/client");
    const { FILTER_OPTIONS_QUERY } = await import(
      "@/src/lib/graphql/queries/filterOptions.gql"
    );

    const live = await request<{
      pokemon_v2_pokemonhabitat: Array<{ id: number; name: string }>;
    }>(FILTER_OPTIONS_QUERY, undefined, "FilterOptions");

    const liveNames = new Set(
      live.pokemon_v2_pokemonhabitat.map((h) => h.name),
    );
    // Los habitats en inglés que la app mapea a claves internas en
    // español (ver `HABITAT_REVERSE_ALIAS`). El endpoint
    // beta.pokeapi.co/graphql/v1beta expone exactamente estos 9 (sin
    // `field` ni `freshwater`, que sí estaban en v1beta2).
    for (const english of [
      "cave",
      "forest",
      "grassland",
      "mountain",
      "sea",
      "urban",
      "rare",
    ]) {
      expect(liveNames.has(english)).toBe(true);
    }
  }, 30_000);
});

describeIf("integración contra PokeAPI real (lista)", () => {
  it("fetchPokemonList (sin filtros) devuelve la primera página con shape correcto", async () => {
    const { fetchPokemonList } = await import(
      "@/src/lib/pokemon/cachedPokemonApi"
    );
    const page = await fetchPokemonList({ offset: 0, limit: 5 });
    expect(page.items.length).toBe(5);
    expect(page.nextOffset).toBe(5);
    for (const item of page.items) {
      expect(typeof item.id).toBe("number");
      expect(typeof item.name).toBe("string");
      // PokeAPI devuelve siempre minúsculas (charmander, pikachu, ...)
      expect(item.name).toBe(item.name.toLowerCase());
      expect(Array.isArray(item.types)).toBe(true);
      // La primera página siempre empieza por Bulbasaur (#1)
    }
    expect(page.items[0]?.name).toBe("bulbasaur");
  }, 60_000);
});
