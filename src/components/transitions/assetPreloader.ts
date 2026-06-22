/**
 * Plan 04.1 — Preload de assets para las transiciones animadas.
 *
 * Este módulo centraliza la precarga de los SVGs/imágenes que se
 * necesitan ANTES de iniciar la animación de transición. La razón
 * es sencilla: el borrador pide que los elementos del inicio estén
 * "cargados antes de empezar la animación" cuando volvemos de la
 * Pokédex, y la carcasa de la Pokédex esté lista cuando salimos del
 * inicio. Sin un preload coordinado, los SVGs aparecerían en blanco
 * o con flicker durante los primeros 600ms de animación.
 *
 * Estrategia:
 *   - Cada "asset" es una URL (string). Lo registramos en un Set
 *     in-memory una vez que el navegador dispara su `onload`.
 *   - `preloadSources(urls)` devuelve una promesa que resuelve
 *     cuando TODAS las URLs estén registradas (o rechaza si alguna
 *     falla).
 *   - `getHomePreloadSources()` y `getPokedexPreloadSources()`
 *     devuelven la lista canónica de URLs por destino. El orden no
 *     importa (se precargan en paralelo), pero mantenerlo estable
 *     ayuda en logs y debugging.
 *   - `resetPreloadCache()` está pensado para tests (cambia el
 *     entorno entre escenarios). En producción nunca se llama.
 *
 * Notas de implementación:
 *   - El registro lo disparan los propios componentes cuando un
 *     `<img src="...">` termina de cargar (`onLoad`), o lo dispara
 *     este módulo de forma proactiva si necesita forzar la carga
 *     (caso típico: asset que aún no se ha renderizado en pantalla).
 *   - Para forzar la carga sin renderizar, usamos `new Image()`
 *     con el `src` adecuado. Esto es equivalente a un `<img>` oculto
 *     y respeta la caché del navegador.
 *   - El módulo NO toca el DOM: es 100% lógica pura y timers de
 *     precarga. Esto permite mockearlo limpio desde los tests.
 */

const HOME_SOURCES: readonly string[] = [
  "/pagina_inicio/logo.svg",
  "/pagina_inicio/ash.svg",
  "/pagina_inicio/pokedex_cerrada.svg",
  "/pagina_inicio/tileFondo.png",
  "/pagina_inicio/charmander.svg",
  "/pagina_inicio/ponita.svg",
  "/pagina_inicio/caterpi.svg",
  "/pagina_inicio/squirtle.svg",
  "/pagina_inicio/pikachu.svg",
  "/pagina_inicio/rinomer.svg",
  "/pagina_inicio/bulbasur.svg",
  "/pagina_inicio/onix.svg",
  "/pagina_inicio/abra.svg",
  "/pagina_inicio/magicarp.svg",
];

const POKEDEX_SOURCES: readonly string[] = [
  "/pokedex_horizontal.svg",
  "/pokedex_vertical.svg",
];

/** Set de assets que ya han disparado su `onload`. */
const loaded = new Set<string>();
/** Set de assets cuya precarga ya está en curso (para no duplicar). */
const inFlight = new Set<string>();
/** Callbacks de assets cuya carga aún no ha terminado. */
const pending = new Map<string, { resolve: () => void; reject: (err: unknown) => void }[]>();

function notifyLoaded(src: string): void {
  loaded.add(src);
  const waiters = pending.get(src);
  if (waiters) {
    pending.delete(src);
    for (const w of waiters) w.resolve();
  }
}

function notifyFailed(src: string, err: unknown): void {
  const waiters = pending.get(src);
  if (waiters) {
    pending.delete(src);
    for (const w of waiters) w.reject(err);
  }
}

/**
 * Crea una promesa que resuelve cuando el `src` termine de cargar.
 * Internamente usa un `Image()` invisible: si el navegador ya tenía
 * el asset cacheado, `onload` se dispara casi inmediatamente.
 */
function preloadSingle(src: string): Promise<void> {
  if (loaded.has(src)) return Promise.resolve();
  if (inFlight.has(src)) {
    return new Promise<void>((resolve, reject) => {
      const list = pending.get(src) ?? [];
      list.push({ resolve, reject });
      pending.set(src, list);
    });
  }
  inFlight.add(src);

  // Si no hay `Image` (entornos raros o SSR puro) resolvemos igual
  // para no bloquear la transición indefinidamente. Es un fallback
  // conservador: la animación arrancará y si el asset aún no estaba
  // cacheado, el navegador lo descargará al renderizar.
  if (typeof Image === "undefined") {
    loaded.add(src);
    inFlight.delete(src);
    notifyLoaded(src);
    return Promise.resolve();
  }

  // jsdom y algunos entornos de test no implementan carga real de
  // imágenes: `new Image().src = ...` no dispara `onload` ni
  // `onerror` nunca. Para evitar que las transiciones queden
  // bloqueadas indefinidamente en tests, en jsdom resolvemos el
  // preload de forma inmediata (es un no-op). Los tests que
  // necesitan verificar el "espera al registro" mockean
  // `preloadSources` directamente con `vi.spyOn`.
  const isBrowser =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !/jsdom/i.test(navigator.userAgent);
  if (!isBrowser) {
    loaded.add(src);
    inFlight.delete(src);
    notifyLoaded(src);
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const cleanup = () => {
      inFlight.delete(src);
      if (settled) return;
      settled = true;
    };
    img.onload = () => {
      cleanup();
      notifyLoaded(src);
      resolve();
    };
    img.onerror = (err) => {
      cleanup();
      notifyFailed(src, err);
      reject(err);
    };
    img.src = src;
  });
}

/**
 * Marca el `src` como cargado. Útil cuando un `<Image>` ya renderizado
 * dispara su `onLoad` y queremos que el orquestador lo considere
 * listo (sin necesidad de re-precargar con `new Image()`).
 */
export function registerAsset(src: string): void {
  if (loaded.has(src)) return;
  notifyLoaded(src);
}

/**
 * Limpia el cache de assets. Pensado exclusivamente para tests:
 * en producción los assets se quedan en `loaded` para siempre (es
 * un Set en memoria, barato).
 */
export function resetPreloadCache(): void {
  loaded.clear();
  inFlight.clear();
  pending.clear();
}

/**
 * Precarga una lista de URLs. Devuelve una promesa que resuelve
 * cuando TODAS hayan terminado de cargar (o rechaza con el primer
 * error). Es seguro llamarlo múltiples veces con el mismo `src`:
 * la promesa se deduplica.
 */
export async function preloadSources(urls: readonly string[]): Promise<void> {
  if (urls.length === 0) return;
  await Promise.all(urls.map((src) => preloadSingle(src)));
}

export function getHomePreloadSources(): readonly string[] {
  return HOME_SOURCES;
}

export function getPokedexPreloadSources(): readonly string[] {
  return POKEDEX_SOURCES;
}

/** Sólo para tests. */
export function _getLoadedSourcesForTests(): readonly string[] {
  return [...loaded];
}