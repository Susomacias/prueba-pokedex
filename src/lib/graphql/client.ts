import type {
  GraphQLRequestError,
  GraphQLResponse,
  GraphQLResponseError,
} from "./types";

/**
 * Error lanzado por `request()` cuando el endpoint (proxy o upstream
 * directo) responde con un HTTP status no-OK y el body no es un
 * `GraphQLResponse` válido. Esto cubre el caso real donde el proxy
 * `/api/pokeapi` recibe un 502/504 desde el upstream de Cloudflare con
 * un body JSON que NO es GraphQL (p.ej. el error 521 de Cloudflare).
 *
 * El cliente puede inspeccionar `status`, `retryable` y `retryAfterMs`
 * para mostrar UI útil (mensaje legible, contador de espera) y para
 * que el hook `useFilteredPokemonList` respete el backoff sugerido por
 * el upstream en su auto-retry (ver `__tests__/app/api/pokeapi/route.test.ts`).
 */
export class GraphQLUpstreamError extends Error implements GraphQLRequestError {
  readonly errors: readonly GraphQLResponseError[];
  readonly status: number;
  readonly retryable: boolean;
  /** Sugerencia de espera del upstream en ms. `null` si no hay. */
  readonly retryAfterMs: number | null;

  constructor(
    status: number,
    errors: readonly GraphQLResponseError[],
    options: { retryable?: boolean; retryAfterMs?: number | null } = {},
  ) {
    const first = errors[0];
    super(first?.message ?? `Upstream error: HTTP ${status}`);
    this.name = "GraphQLUpstreamError";
    this.status = status;
    this.errors = errors;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs =
      options.retryAfterMs === undefined ? null : options.retryAfterMs;
  }
}

/**
 * Endpoint por defecto de la GraphQL de PokeAPI (v1beta).
 *
 * El endpoint histórico `https://graphql.pokeapi.co/v1beta2` (que
 * exponía los tipos SIN el prefijo `pokemon_v2_`) lleva caído desde
 * junio de 2026 con HTTP 521 (Cloudflare `origin_down`). El endpoint
 * `https://beta.pokeapi.co/graphql/v1beta` sigue respondiendo y expone
 * el schema CON el prefijo `pokemon_v2_` (igual que la PokeAPI REST
 * `/api/v2/...` y que los queries de Postman/curl de toda la vida).
 *
 * Por eso todas las queries en `src/lib/graphql/queries/*.gql.ts` y
 * los `Raw*Response` shapes en `src/lib/pokemon/` usan el prefijo
 * `pokemon_v2_` y este endpoint.
 *
 * CORS: `beta.pokeapi.co` devuelve `Access-Control-Allow-Origin: *`
 * para los POST cross-origin, así que en navegador real podemos
 * pegar directamente. En RSC / tests jsdom seguimos usando este URL
 * por defecto. Si en el futuro hace falta proxy same-origin, ver
 * `src/app/api/pokeapi/route.ts`.
 */
export const DEFAULT_POKEAPI_GRAPHQL_URL = "https://beta.pokeapi.co/graphql/v1beta";

/**
 * Ruta interna del proxy same-origin.
 *
 * Sólo se usa en el **cliente**. El servidor (`getPokeApiEndpoint()`)
 * sigue hablando directamente con PokeAPI para no añadir latencia
 * innecesaria.
 */
const CLIENT_PROXY_PATH = "/api/pokeapi";

/**
 * Devuelve la URL del endpoint GraphQL de PokeAPI.
 *
 * Política de selección (en orden):
 *  1. Si `NEXT_PUBLIC_POKEAPI_GRAPHQL_URL` está definida → se usa tal
 *     cual (útil para mirrors propios o entornos donde el CORS ya está
 *     resuelto).
 *  2. Si estamos en el navegador (real, no jsdom) Y
 *     `NEXT_PUBLIC_POKEAPI_USE_PROXY !== "false"` → devolvemos
 *     `/api/pokeapi` (proxy same-origin del proyecto, evita CORS).
 *  3. Resto de casos → `DEFAULT_POKEAPI_GRAPHQL_URL` (servidor,
 *     tests jsdom, RSC, Route Handlers).
 *
 * Detección de "navegador real" vs jsdom: jsdom define `window`
 * pero su `navigator.userAgent` es siempre `"Node.js"` o
 * `"jsdom/..."`. En un navegador real, el user-agent contiene
 * siempre una cadena identificativa del navegador. Usamos ese
 * discriminador para no romper los tests.
 */
export function getPokeApiEndpoint(): string {
  const fromEnv = process.env.NEXT_PUBLIC_POKEAPI_GRAPHQL_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  if (isRealBrowser()) {
    const useProxy = process.env.NEXT_PUBLIC_POKEAPI_USE_PROXY;
    if (useProxy !== "false") {
      return CLIENT_PROXY_PATH;
    }
  }
  return DEFAULT_POKEAPI_GRAPHQL_URL;
}

/**
 * ¿Estamos ejecutando en un navegador real? `jsdom` define
 * `window` y `navigator`, pero su `navigator.userAgent` no contiene
 * los marcadores de un navegador de verdad (`Mozilla`, `Chrome`,
 * `Safari`, `Firefox`, `Edg/`, etc.).
 */
function isRealBrowser(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // jsdom canónico: "Node.js/vX.Y.Z" o "jsdom/...". Cualquier cosa
  // con marcadores de navegador real es un browser.
  if (/Node\.js|jsdom/i.test(ua)) return false;
  return /Mozilla|Chrome|Safari|Firefox|Edg|Opera|AppleWebKit/i.test(ua);
}

/**
 * Error lanzado cuando la respuesta GraphQL contiene `errors` con HTTP
 * 2xx (errores lógicos: query mal formado, campo inexistente, etc.).
 * Expone el listado original para depuración y logging.
 *
 * Para errores de transporte (HTTP 5xx upstream, 502 del proxy, etc.)
 * ver `GraphQLUpstreamError` — ese tipo preserva `status`,
 * `retryable` y `retryAfterMs` para que el cliente y el hook de
 * auto-retry puedan mostrar UI útil y respetar el backoff del upstream.
 */
export class GraphQLError extends Error implements GraphQLRequestError {
  readonly errors: readonly GraphQLResponseError[];

  constructor(errors: readonly GraphQLResponseError[]) {
    const first = errors[0];
    super(first?.message ?? "GraphQL response contained errors");
    this.name = "GraphQLError";
    this.errors = errors;
  }
}

interface RequestOptions {
  /** Cabeceras adicionales a enviar en el POST. */
  readonly headers?: Record<string, string>;
  /**
   * Configuración de caché del `fetch` de Next.js.
   * Útil para marcar la query como cacheable sin usar `use cache`.
   */
  readonly next?:
    | RequestInit["next"]
    | Readonly<Record<string, unknown>>;
}

/**
 * Lee el header `Retry-After` (en segundos o fecha HTTP) y devuelve
 * milisegundos. Si está ausente o malformado devuelve `null`.
 *
 * Sólo se aplica a errores de transporte: el auto-retry del cliente
 * usa esto para esperar lo que sugiere el upstream antes de reintentar
 * (Cloudflare suele pedir 60-120 s en 5xx).
 */
function readRetryAfterMs(response: Response): number | null {
  const raw = response.headers.get("retry-after");
  if (!raw) return null;
  const asSeconds = Number(raw);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.round(asSeconds * 1000);
  }
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return null;
}

/**
 * Decide si un error upstream se considera recuperable (merece la pena
 * reintentar). Heurística: 5xx, 408, 429 y status 0 (red muerta).
 * Los 4xx restantes son errores del cliente que NO se reintentan.
 */
function isRetryableStatus(status: number): boolean {
  if (status === 0) return true;
  if (status === 408 || status === 429) return true;
  return status >= 500 && status < 600;
}

/**
 * Ejecuta una query GraphQL contra el endpoint de PokeAPI.
 *
 * @typeParam T - Forma esperada de `data` en la respuesta.
 * @param query        - Documento GraphQL en texto (query/mutation).
 * @param variables    - Variables inyectadas en el documento.
 * @param operationName- Nombre de la operación cuando el documento tiene varias.
 * @param options      - Cabeceras/caché adicionales.
 *
 * @throws {GraphQLError}          cuando la respuesta 2xx incluye `errors` (errores lógicos).
 * @throws {GraphQLUpstreamError}  cuando el HTTP status no es OK (errores de transporte).
 *                                  Preserva `status`, `retryable` y `retryAfterMs` del upstream.
 * @throws {Error}                 para errores de red puros (fetch rechaza antes de obtener respuesta).
 */
export async function request<T>(
  query: string,
  variables?: Record<string, unknown>,
  operationName?: string,
  options?: RequestOptions,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(getPokeApiEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
      body: JSON.stringify({ query, variables, operationName }),
      ...(options?.next ? { next: options.next as RequestInit["next"] } : {}),
    });
  } catch (cause) {
    if (cause instanceof Error) throw cause;
    throw new Error("Network error while contacting PokeAPI GraphQL endpoint", {
      cause,
    });
  }

  if (!response.ok) {
    let payload: GraphQLResponse<unknown> | undefined;
    try {
      payload = (await response.json()) as GraphQLResponse<unknown>;
    } catch {
      payload = undefined;
    }
    const errors =
      payload?.errors && payload.errors.length > 0
        ? payload.errors
        : [
            {
              message: `PokeAPI GraphQL request failed: ${response.status} ${response.statusText}`,
            },
          ];
    // El proxy /api/pokeapi (route.ts) puede adjuntar `retryAfter` (en
    // segundos) en `extensions` del body normalizado. Lo respetamos
    // porque Cloudflare suele pedir esperas de 60-120 s en 5xx.
    const bodyRetryAfterSec = (() => {
      const first = errors[0] as
        | { extensions?: { retryAfter?: unknown } }
        | undefined;
      const v = first?.extensions?.retryAfter;
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    })();
    const retryAfterMs =
      bodyRetryAfterSec !== null
        ? Math.round(bodyRetryAfterSec * 1000)
        : readRetryAfterMs(response);
    throw new GraphQLUpstreamError(response.status, errors, {
      retryable: isRetryableStatus(response.status),
      retryAfterMs,
    });
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    throw new GraphQLError(json.errors);
  }

  if (json.data === undefined) {
    throw new Error("PokeAPI GraphQL response did not include data");
  }

  return json.data;
}
