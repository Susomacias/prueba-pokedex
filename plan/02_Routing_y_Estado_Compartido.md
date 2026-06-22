# Plan 02 — Routing y Estado Compartido

## Objetivo

Establecer el sistema de routing de la app, el patrón de estado de filtros **bidireccional** con la URL, y el punto único de verdad que consumirán tanto la consola de filtros como los dropdowns y el buscador. También la página 404.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Página de inicio (Plan 03). |
| `/pokedex` | Pokédex con lista y filtros. |
| `/pokemon/[name]` | Ficha de un pokemon (nombre amigable, no id). |
| `*` | 404 personalizada. |

Los filtros viven como **searchParams** en `/pokedex` y `/pokemon/[name]` para que sean shareable.

## Contexto / Dependencias

- **Requiere**: Plan 00 (estructura), Plan 01 (tipos de filtros de la API).
- **Habilita**: todos los planes de UI.

## Principios del borrador aplicables

- Filtros por parámetros de búsqueda en la URL.
- Bidireccional: aplicar filtro → cambia URL; cambiar URL → aplica filtro. Sin recarga de página.
- No duplicar sistemas: consola de filtros y dropdowns comparten el mismo estado.
- Nombre del pokemon en la ruta (amigable), no id.

## Fases

---

### Fase 02.1 — Estructura de rutas App Router

**Objetivo:** crear las rutas vacías y layout, listo para que los siguientes planes rellenen el contenido.

**Tareas:**
- Leer `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` y `04-linking-and-navigating.md`.
- Mover `app/` a `src/app/` (decidir según convención; verificar tsconfig paths).
- Crear estructura:
  - `src/app/layout.tsx` (raíz, fuente PressStart2P).
  - `src/app/page.tsx` (inicio — placeholder).
  - `src/app/pokedex/page.tsx` (placeholder).
  - `src/app/pokemon/[name]/page.tsx` (placeholder con `generateStaticParams` opcional).
  - `src/app/not-found.tsx` (404 custom — se diseña en 02.4).
- Configurar `metadataBase` y metadata por ruta (ver `14-metadata-and-og-images.md`).

**Skills recomendadas:**
- `next-best-practices` (file conventions, metadata, RSC boundaries).
- `seo` (metadata, URLs canónicas).

**Tests a diseñar (antes):**
- E2E: navegar a `/`, `/pokedex`, `/pokemon/pikachu` devuelve 200.
- E2E: ruta inexistente devuelve la 404 custom.

**Tests a ejecutar (después):**
- `npm run test:e2e`
- `npm run lint`

**Criterios de aceptación:**
- Las 4 rutas responden.
- Navegación cliente (sin recarga) entre ellas vía `<Link>`.

**Documentación:** `README.md` — documentar la tabla de rutas.

**Revisión humana:** No.

---

### Fase 02.2 — Estado de filtros sincronizado con URL (bidireccional)

**Objetivo:** crear un store/hook único que mantenga los filtros y los sincronice bidireccionalmente con los `searchParams` sin recargar la página.

**Tareas:**
- Definir tipo `Filters` (discriminated union por `FilterKey` del Plan 01) en `src/lib/filters/types.ts`.
- Serialización URL: funciones `filtersToSearchParams(filters): URLSearchParams` y viceversa, con tipos distintos por filtro (string, number, range).
- Hook `useFilters()` (client) que:
  - Lee los `searchParams` actuales vía `useSearchParams()` (Next App Router).
  - Expone `filters`, `setFilter(key, value)`, `removeFilter(key)`, `clearAll()`, `summary()`.
  - Al mutar, actualiza la URL con `router.replace()` (sin scroll, sin recarga).
  - Al cambiar la URL (back/forward, link compartido), el estado se actualiza.
- Validar: el hook es el **único** punto de mutación. Consola, dropdowns y buscador lo consumen.

**Skills recomendadas:**
- `vercel-composition-patterns` (context interface, evitar prop drilling).
- `next-best-practices` (RSC boundaries — el hook es cliente, los componentes server leen searchParams directo).
- `typescript-advanced-types` (discriminated unions por FilterKey).

**Tests a diseñar (antes):**
- Test unitario del serializador: `filtersToSearchParams` + parseo round-trip.
- Test del hook con `@testing-library/react` y `NavigationContext` mockeado: aplicar filtro cambia URL; cambiar URL cambia filtros.
- Test: clearAll elimina todos los params.
- Test: si el path cambia a `/pokemon/[name]`, los filtros se conservan en la URL.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Mutar el store actualiza la URL.
- Navegar con back/forward actualiza el store.
- No hay recarga de página (E2E lo confirma).

**Documentación:**
- `AGENTS.md`: "El estado de filtros SIEMPRE se maneja con `useFilters()`. No duplicar en useState locales."

**Revisión humana:** No.

---

### Fase 02.3 — Provider de filtros y helpers compartidos

**Objetivo:** exponer el store de filtros vía Context para que consola, dropdowns, buscador y lista lo consuman sin prop drilling.

**Tareas:**
- Crear `src/components/filters/FiltersProvider.tsx` (client) que envuelve la app y provee `useFilters()`.
- Crear hooks derivados:
  - `useActiveFiltersCount()`
  - `useFilterOptions(key)` (carga las opciones del Plan 01.4 bajo demanda, con caché en cliente).
  - `useFilteredPokemonList()` (combina filtros + fetch paginado + estado de carga).
- Helper `formatFilterSummary(filters)` para mostrar en la consola.

**Skills recomendadas:**
- `vercel-composition-patterns` (compound components, context interface).
- `vercel-react-best-practices` (split combined hooks, derived state).

**Tests a diseñar (antes):**
- Test: `useActiveFiltersCount` refleja el número correcto.
- Test: `useFilterOptions("type")` carga opciones y las cachea (mock del fetch).

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Un único provider en `src/app/pokedex/layout.tsx`.
- Todos los consumidores usan hooks derivados.

**Documentación:** No.

**Revisión humana:** No.

---

### Fase 02.4 — Página 404

**Objetivo:** diseñar una página 404 sencilla con estética de videojuego.

**Tareas:**
- Crear `src/app/not-found.tsx`.
- Diseño: fondo con degradado body (`#234476 → #0c1c3e`), tipografía `PressStart2P`, mensaje "404 - POKEMON NO ENCONTRADO", un pokeball SVG dibujado a mano, y un botón "VOLVER AL INICIO" que navega a `/`.
- Animación: el pokeball gira lentamente; botón con efecto hover/press.
- Sin scroll, centrado en pantalla.

**Skills recomendadas:**
- `frontend-design` (estética videojuego 2D).
- `tailwind-css-patterns` (animaciones, layout).

**Tests a diseñar (antes):**
- E2E: visitar `/no-existe` muestra el mensaje 404 y el botón navega a `/`.

**Tests a ejecutar (después):**
- `npm run test:e2e`
- `npm run lint`

**Criterios de aceptación:**
- La 404 renderiza sin scroll y en español.
- Botón funcional.

**Documentación:** No.

**Revisión humana:** Sí (validar estética de videojuego).

---

## Riesgos

- **`useSearchParams` en App Router requiere Suspense boundary** en algunos casos (Next 16). Verificar en docs.
- **Hidratación**: el estado inicial de filtros debe coincidir entre server y cliente para evitar mismatch.
