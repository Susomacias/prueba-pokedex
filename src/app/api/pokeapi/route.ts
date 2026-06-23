import { NextResponse } from "next/server";
import { DEFAULT_POKEAPI_GRAPHQL_URL } from "@/src/lib/graphql/client";

/**
 * Proxy same-origin para la PokeAPI (Plan 07.1 / Fix CORS).
 *
 * El navegador bloquea con CORS los `POST` directos contra
 * `https://graphql.pokeapi.co/v1beta2` desde `http://localhost:3000`
 * (y desde cualquier otro origen) porque PokeAPI no devuelve
 * `Access-Control-Allow-Origin`. Para resolverlo sin renunciar a la
 * cache ni a la deduplicación de `React.cache`, el cliente (cuando
 * corre en el navegador) pega contra este endpoint local
 * (`/api/pokeapi`) y nosotros reenviamos la query al endpoint
 * oficial server-to-server — donde NO hay CORS.
 *
 * Comportamiento:
 *  - Acepta `POST` con `Content-Type: application/json` y body
 *    `{ query, variables, operationName }`.
 *  - Reenvía al endpoint configurado en `NEXT_PUBLIC_POKEAPI_GRAPHQL_URL`
 *    o al oficial `graphql.pokeapi.co/v1beta2` como fallback.
 *  - Si la red falla, devuelve 504 con shape GraphQL.
 *  - Si el upstream responde 5xx (Cloudflare caído, 521 origin_down,
 *    502/503/504 del propio GraphQL), NORMALIZA el body a shape GraphQL
 *    estándar:
 *
 *      {
 *        data: null,
 *        errors: [{
 *          message: "Upstream Cloudflare error 521: ... (retryable)",
 *          extensions: {
 *            code: "UPSTREAM_CLOUDFLARE_521" | "UPSTREAM_5XX" | "UPSTREAM_NON_JSON",
 *            retryable: true,
 *            retryAfter: 120,        // segundos, si el upstream lo sugiere
 *            upstreamStatus: 521,
 *          }
 *        }]
 *      }
 *
 *    Esto permite que `GraphQLUpstreamError` (cliente) y
 *    `useFilteredPokemonList` (hook) propaguen un mensaje legible al
 *    usuario y respeten el backoff sugerido por el upstream en su
 *    auto-retry (Cloudflare suele pedir 60-120 s).
 *  - Para cualquier otro método (`GET`, `PUT`, etc.) devuelve 405.
 *
 * IMPORTANTE: NO se añade cache HTTP propia porque la cache de
 * servidor (Data Cache de Next.js) ya la gestiona `request()` con
 * `next.revalidate` / `next.tags` en la capa de datos. Aquí sólo
 * somos un puente HTTP.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProxyBody {
  readonly query: string;
  readonly variables?: Record<string, unknown>;
  readonly operationName?: string;
}

interface NormalizedErrorExtensions {
  readonly code:
    | "UPSTREAM_NETWORK"
    | "UPSTREAM_CLOUDFLARE_521"
    | "UPSTREAM_CLOUDFLARE_5XX"
    | "UPSTREAM_5XX"
    | "UPSTREAM_NON_JSON";
  readonly retryable: boolean;
  readonly upstreamStatus: number;
  /** Segundos sugeridos por el upstream antes de reintentar. */
  readonly retryAfter?: number;
}

interface NormalizedGraphQLError {
  readonly message: string;
  readonly extensions: NormalizedErrorExtensions;
}

interface NormalizedErrorResponse {
  readonly data: null;
  readonly errors: ReadonlyArray<NormalizedGraphQLError>;
}

/** Devuelve milisegundos a partir del header `Retry-After` o `null`. */
function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const asSeconds = Number(headerValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.round(asSeconds * 1000);
  }
  const asDate = Date.parse(headerValue);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return null;
}

interface UpstreamErrorInfo {
  readonly message: string;
  readonly code: NormalizedErrorExtensions["code"];
  readonly retryable: boolean;
  readonly upstreamStatus: number;
  readonly retryAfterMs: number | null;
}

/**
 * Detecta si un body JSON de upstream es un error de Cloudflare y
 * devuelve la información normalizada. La heurística combina:
 *  1. El status HTTP del upstream. Cloudflare responde con códigos
 *     521-527 cuando el origin server falla:
 *     - 521: origin down
 *     - 522: connection timeout
 *     - 523: origin unreachable
 *     - 524: timeout
 *     - 525/526/527: SSL/handshake errors
 *  2. Los campos canónicos que Cloudflare añade en sus responses 5xx
 *     cuando el body llega al cliente: `cloudflare_error`,
 *     `retry_after`, `error_code` (p.ej. `"521"`).
 *
 * Si vemos cualquiera de las dos señales (status 521-527 O body con
 * `cloudflare_error: true` / `error_code` 5xx), etiquetamos como
 * Cloudflare con código específico. Si no, etiquetamos como 5xx genérico.
 */
function extractUpstreamErrorInfo(
  upstreamStatus: number,
  payload: unknown,
  retryAfterHeader: string | null,
): UpstreamErrorInfo {
  const obj = (payload ?? {}) as Record<string, unknown>;
  const cfErrorCodeRaw = obj["error_code"];
  const cfErrorCodeStr = typeof cfErrorCodeRaw === "string"
    ? cfErrorCodeRaw
    : null;
  const cfErrorCodeNum = typeof cfErrorCodeRaw === "number"
    ? cfErrorCodeRaw
    : null;
  const cfStatus =
    cfErrorCodeStr !== null
      ? Number(cfErrorCodeStr)
      : cfErrorCodeNum;
  const cfHasFlag = obj["cloudflare_error"] === true;
  const isCloudflareOriginError =
    cfHasFlag ||
    (upstreamStatus >= 521 && upstreamStatus <= 527) ||
    (typeof cfStatus === "number" && cfStatus >= 521 && cfStatus <= 527);

  const cfRetryAfter = typeof obj["retry_after"] === "number"
    ? obj["retry_after"]
    : null;
  const cfTitle = typeof obj["title"] === "string" ? obj["title"] : null;
  const cfDetail = typeof obj["detail"] === "string" ? obj["detail"] : null;
  const cfRetryAfterMs = cfRetryAfter !== null
    ? cfRetryAfter * 1000
    : parseRetryAfterMs(retryAfterHeader);

  if (isCloudflareOriginError && upstreamStatus === 521) {
    return {
      message: `Upstream Cloudflare error 521: ${cfTitle ?? "Web server is down"} (retryable)`,
      code: "UPSTREAM_CLOUDFLARE_521",
      retryable: true,
      upstreamStatus: 521,
      retryAfterMs: cfRetryAfterMs,
    };
  }

  if (isCloudflareOriginError) {
    return {
      message: `Upstream Cloudflare error ${upstreamStatus}: ${cfTitle ?? cfDetail ?? "origin unavailable"} (retryable)`,
      code: "UPSTREAM_CLOUDFLARE_5XX",
      retryable: true,
      upstreamStatus,
      retryAfterMs: cfRetryAfterMs,
    };
  }

  // 5xx genérico (no es Cloudflare).
  return {
    message: `Upstream error ${upstreamStatus}: ${cfTitle ?? cfDetail ?? "PokeAPI temporarily unavailable"}`,
    code: "UPSTREAM_5XX",
    retryable: true,
    upstreamStatus,
    retryAfterMs: parseRetryAfterMs(retryAfterHeader),
  };
}

function buildNormalizedErrorResponse(
  info: UpstreamErrorInfo,
): NormalizedErrorResponse {
  const extensions: NormalizedErrorExtensions = {
    code: info.code,
    retryable: info.retryable,
    upstreamStatus: info.upstreamStatus,
    ...(info.retryAfterMs !== null
      ? { retryAfter: Math.round(info.retryAfterMs / 1000) }
      : {}),
  };
  return {
    data: null,
    errors: [
      {
        message: info.message,
        extensions,
      },
    ],
  };
}

function errorResponse(
  status: number,
  body: NormalizedErrorResponse,
): Response {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: ProxyBody;
  try {
    body = (await request.json()) as ProxyBody;
  } catch {
    return errorResponse(400, {
      data: null,
      errors: [
        {
          message: "Invalid JSON body",
          extensions: {
            code: "UPSTREAM_NON_JSON",
            retryable: false,
            upstreamStatus: 0,
          },
        },
      ],
    });
  }
  if (!body || typeof body.query !== "string" || body.query.length === 0) {
    return errorResponse(400, {
      data: null,
      errors: [
        {
          message: "Missing `query` field in body",
          extensions: {
            code: "UPSTREAM_NON_JSON",
            retryable: false,
            upstreamStatus: 0,
          },
        },
      ],
    });
  }

  const upstream = process.env.NEXT_PUBLIC_POKEAPI_GRAPHQL_URL;
  const target = upstream && upstream.length > 0 ? upstream : DEFAULT_POKEAPI_GRAPHQL_URL;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: body.query,
        variables: body.variables ?? {},
        operationName: body.operationName,
      }),
    });
  } catch {
    return errorResponse(504, {
      data: null,
      errors: [
        {
          message:
            "Network error contacting PokeAPI GraphQL endpoint via proxy",
          extensions: {
            code: "UPSTREAM_NETWORK",
            retryable: true,
            upstreamStatus: 0,
          },
        },
      ],
    });
  }

  // Leemos el body como JSON (PokeAPI siempre devuelve JSON válido).
  let payload: unknown;
  try {
    payload = await upstreamResponse.json();
  } catch {
    return errorResponse(502, {
      data: null,
      errors: [
        {
          message: `Upstream returned non-JSON: ${upstreamResponse.status} ${upstreamResponse.statusText}`,
          extensions: {
            code: "UPSTREAM_NON_JSON",
            retryable: true,
            upstreamStatus: upstreamResponse.status,
          },
        },
      ],
    });
  }

  // Si la upstream devolvió errores GraphQL con status 2xx, los
  // propagamos tal cual para que la capa de datos del cliente pueda
  // mapearlos con `GraphQLError`.
  const payloadObj = payload as { errors?: unknown; data?: unknown };
  if (
    payloadObj &&
    Array.isArray(payloadObj.errors) &&
    payloadObj.errors.length > 0
  ) {
    return NextResponse.json(payloadObj, { status: 200 });
  }

  if (!upstreamResponse.ok) {
    const info = extractUpstreamErrorInfo(
      upstreamResponse.status,
      payloadObj,
      upstreamResponse.headers.get("retry-after"),
    );
    return errorResponse(502, buildNormalizedErrorResponse(info));
  }

  return NextResponse.json(payloadObj, { status: 200 });
}

export function GET(): Response {
  return NextResponse.json(
    {
      data: null,
      errors: [
        {
          message: "Method Not Allowed: use POST",
          extensions: {
            code: "UPSTREAM_NON_JSON",
            retryable: false,
            upstreamStatus: 0,
          },
        },
      ],
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
