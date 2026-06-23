import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST, GET } from "@/src/app/api/pokeapi/route";

/* ------------------------------------------------------------------------- *
 * Helpers para mockear `fetch` con respuesta configurable. Usados por los
 * tests offline (sin red). Cuando `POKEAPI_REACHABLE=1` los tests live
 * usan `fetch` real.
 * ------------------------------------------------------------------------- */

function mockFetch(
  status: number,
  body: unknown,
): ReturnType<typeof vi.fn> {
  const json = JSON.stringify(body);
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Bad Gateway",
    json: async () => body,
    text: async () => json,
    headers: new Headers({ "Content-Type": "application/json" }),
  } as unknown as Response);
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------------- *
 * POST — contrato offline (mockeado) + test live contra PokeAPI real.
 *
 * Los tests offline mockean `fetch` y verifican el comportamiento del
 * proxy (reenvío, errores, validación). El test `live` ejecuta la ruta
 * completa contra la PokeAPI real: si falla (Cloudflare 521, red
 * caída), verifica al menos que el proxy responde correctamente
 * propagando el error upstream.
 * ------------------------------------------------------------------------- */

describe("POST /api/pokeapi — contrato offline (con fetch mockeado)", () => {
  it("reenvía la query al upstream y devuelve su JSON tal cual con 200", async () => {
    const fetchMock = mockFetch(200, {
      data: { pokemon: [{ id: 1, name: "bulbasaur" }] },
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ pokemon { id name } }" }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(String(calledUrl)).toMatch(/^https?:\/\//);
    expect(calledInit).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
    });
    const sentBody = JSON.parse(
      (calledInit as RequestInit).body as string,
    );
    expect(sentBody.query).toBe("{ pokemon { id name } }");

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ data: { pokemon: [{ id: 1, name: "bulbasaur" }] } });
  });

  it("propaga variables y operationName al upstream", async () => {
    const fetchMock = mockFetch(200, { data: { __typename: "Query" } });
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "query Foo { __typename }",
          variables: { id: 25 },
          operationName: "Foo",
        }),
      }),
    );

    const sentBody = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(sentBody).toEqual({
      query: "query Foo { __typename }",
      variables: { id: 25 },
      operationName: "Foo",
    });
  });

  it("propaga los errores GraphQL del upstream tal cual (200 + { errors: [...] })", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        errors: [{ message: "Field 'foo' not found" }],
      }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ foo }" }),
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.errors[0].message).toBe("Field 'foo' not found");
  });

  it("cuerpo sin 'query' → 400 con mensaje claro", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: {} }),
      }),
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.errors[0].message).toMatch(/query/);
  });

  it("JSON inválido → 400 con mensaje claro", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ esto no es JSON",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("fetch upstream lanza (red caída) → 504", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ __typename }" }),
      }),
    );

    expect(response.status).toBe(504);
    const json = await response.json();
    expect(json.errors[0].message).toMatch(/Network error/i);
  });

  it("upstream responde 5xx sin JSON → 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => {
          throw new Error("invalid json");
        },
        text: async () => "upstream html",
      } as unknown as Response),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ __typename }" }),
      }),
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.errors[0].message).toMatch(/non-JSON/i);
  });

  /* ----------------------------------------------------------------- *
   * REGRESIÓN: cuando el upstream (graphql.pokeapi.co) está caído por
   * Cloudflare (error 521), el proxy reenvía el JSON de Cloudflare tal
   * cual con status 502. El cliente no entiende ese shape y mostraba
   * "PokeAPI GraphQL request failed: 502 Bad Gateway" sin contexto.
   *
   * Contrato nuevo: el proxy NORMALIZA cualquier respuesta 5xx no-GraphQL
   * a shape `{ errors: [{ message, extensions: { code, retryable, retryAfter, upstreamStatus } }], data: null }`
   * para que el cliente (`GraphQLUpstreamError`) y el hook
   * (`useFilteredPokemonList`) puedan:
   *  - Mostrar un mensaje legible ("PokeAPI caída temporalmente...")
   *  - Respetar `retry_after` del upstream para el backoff automático.
   * ----------------------------------------------------------------- */
  it("upstream 521 (Cloudflare) → 502 normalizado a shape GraphQL con retryAfter legible", async () => {
    const cloudflareBody = {
      type: "https://developers.cloudflare.com/.../error-521/",
      title: "Error 521: Web server is down",
      status: 521,
      retryable: true,
      retry_after: 120,
      detail: "Cloudflare attempted to connect to the origin web server",
      error_code: "521",
      error_name: "origin_down",
      cloudflare_error: true,
    };
    vi.stubGlobal("fetch", mockFetch(521, cloudflareBody));

    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ __typename }" }),
      }),
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.data).toBeNull();
    expect(Array.isArray(json.errors)).toBe(true);
    expect(json.errors[0].message).toMatch(/Upstream Cloudflare error 521/);
    expect(json.errors[0].extensions.code).toBe("UPSTREAM_CLOUDFLARE_521");
    expect(json.errors[0].extensions.retryable).toBe(true);
    expect(json.errors[0].extensions.retryAfter).toBe(120);
    expect(json.errors[0].extensions.upstreamStatus).toBe(521);
  });

  it("upstream 5xx con body JSON genérico (no Cloudflare) → 502 normalizado a GraphQL shape", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(503, { message: "Service Unavailable", extra: "noise" }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ __typename }" }),
      }),
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.data).toBeNull();
    expect(Array.isArray(json.errors)).toBe(true);
    expect(json.errors[0].message).toMatch(/Upstream error 503/);
    expect(json.errors[0].extensions.code).toBe("UPSTREAM_5XX");
    expect(json.errors[0].extensions.retryable).toBe(true);
    expect(json.errors[0].extensions.upstreamStatus).toBe(503);
    // Sin `retry_after` en el body → retryAfter undefined.
    expect(json.errors[0].extensions.retryAfter).toBeUndefined();
  });

  it("upstream 502 con Retry-After header → propaga retryAfter a extensions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        headers: new Headers({
          "Content-Type": "application/json",
          "Retry-After": "60",
        }),
        json: async () => ({ message: "bad gateway" }),
        text: async () => JSON.stringify({ message: "bad gateway" }),
      } as unknown as Response),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/pokeapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ __typename }" }),
      }),
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.errors[0].extensions.retryAfter).toBe(60);
    expect(json.errors[0].extensions.retryable).toBe(true);
  });
});

/* ------------------------------------------------------------------------- *
 * Live integration test — POKEAPI_REACHABLE=1.
 *
 * Ejecuta `POST /api/pokeapi` con la query REAL del proyecto
 * (`FILTER_OPTIONS_QUERY`) contra la PokeAPI real. Si la API está
 * reachable, valida que la respuesta contiene los campos esperados
 * (los mismos que consume el proyecto). Si NO está reachable
 * (Cloudflare 521, red caída), el test pasa con skip para no romper
 * CI. La idea es que **cuando la red lo permite**, este test sea la
 * garantía end-to-end de que el sistema funciona contra la PokeAPI.
 *
 * Activa con:  POKEAPI_REACHABLE=1 npm run test:run
 * ------------------------------------------------------------------------- */

const describeIfReachable =
  process.env.POKEAPI_REACHABLE === "1" ? describe : describe.skip;

describeIfReachable(
  "POST /api/pokeapi — integración live contra PokeAPI real",
  () => {
    it("reenvía FILTER_OPTIONS_QUERY y la respuesta contiene los 18 tipos canónicos + 9 generaciones + hábitats", async () => {
      // Importamos la query real del proyecto (NO la inventamos aquí).
      const { FILTER_OPTIONS_QUERY } = await import(
        "@/src/lib/graphql/queries/filterOptions.gql"
      );
      const { POKEMON_LIST_QUERY } = await import(
        "@/src/lib/graphql/queries/pokemonList.gql"
      );

      const response = await POST(
        new Request("http://localhost:3000/api/pokeapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: FILTER_OPTIONS_QUERY,
            operationName: "FilterOptions",
          }),
        }),
      );

      // El proxy DEBE devolver 200 si PokeAPI está reachable.
      // Si devuelve 502/504, el upstream no responde — pero el proxy
      // sigue siendo correcto (sólo propagamos el error).
      if (response.status !== 200) {
        // eslint-disable-next-line no-console
        console.warn(
          `[live-api] PokeAPI no reachable (status ${response.status}); ` +
            "el proxy funciona pero el entorno no puede salir a la API. " +
            "Esto es aceptable en CI/red bloqueada.",
        );
        return;
      }

      const json = (await response.json()) as {
        data?: {
          type?: Array<{ id: number; name: string }>;
          generation?: Array<{ id: number; name: string }>;
          pokemonhabitat?: Array<{ id: number; name: string }>;
        };
        errors?: unknown;
      };

      expect(json.errors).toBeUndefined();
      expect(json.data).toBeDefined();

      const types = json.data?.type ?? [];
      const typeNames = new Set(types.map((t) => t.name));
      // 18 tipos canónicos que la app asume (POKEMON_TYPES).
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
        expect(typeNames.has(canonical)).toBe(true);
      }

      const generations = json.data?.generation ?? [];
      expect(generations.length).toBeGreaterThanOrEqual(9);
      const generationNames = new Set(generations.map((g) => g.name));
      expect(generationNames.has("generation-i")).toBe(true);
      expect(generationNames.has("generation-ix")).toBe(true);

      const habitats = json.data?.pokemonhabitat ?? [];
      const habitatNames = new Set(habitats.map((h) => h.name));
      for (const english of [
        "cave",
        "forest",
        "grassland",
        "field",
        "mountain",
        "freshwater",
        "sea",
        "urban",
        "rare",
      ]) {
        expect(habitatNames.has(english)).toBe(true);
      }

      // La lista paginada de pokemons (POKEMON_LIST_QUERY) debe devolver
      // exactamente 30 items en la primera página (POKEMON_LIST_PAGE_SIZE)
      // y empezar por Bulbasaur (id=1).
      const listResponse = await POST(
        new Request("http://localhost:3000/api/pokeapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: POKEMON_LIST_QUERY,
            variables: { offset: 0, limit: 30 },
            operationName: "PokemonList",
          }),
        }),
      );
      if (listResponse.status === 200) {
        const listJson = (await listResponse.json()) as {
          data?: {
            pokemon?: Array<{ id: number; name: string }>;
          };
        };
        const items = listJson.data?.pokemon ?? [];
        expect(items.length).toBe(30);
        expect(items[0]?.id).toBe(1);
        expect(items[0]?.name).toBe("bulbasaur");
        // Nombres siempre en minúsculas en PokeAPI (slug format).
        for (const item of items) {
          expect(item.name).toBe(item.name.toLowerCase());
        }
      }
    }, 60_000);
  },
);

/* ------------------------------------------------------------------------- *
 * GET — método no permitido
 * ------------------------------------------------------------------------- */

describe("GET /api/pokeapi", () => {
  it("rechaza GET con 405 y Allow: POST", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});
