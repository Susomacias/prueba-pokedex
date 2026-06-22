# Plan 00 — Configuración y Fundaciones

## Objetivo

Dejar el proyecto listo para desarrollar: dependencias instaladas, lint/typecheck funcionales, frameworks de test configurados, fuentes y favicon cargados, ficheros base (`.gitignore`, `README.md`, `AGENTS.md`) actualizados y un sistema de diseño (tokens, colores por tipo/generación) centralizado.

## Contexto / Dependencias

- **Requiere**: ninguno (es el punto de partida).
- **Habilita**: todos los demás planes.

## Fases

---

### Fase 00.1 — Limpieza del boilerplate y configuración base

**Objetivo:** eliminar el contenido por defecto de `create-next-app`, dejar `app/page.tsx` mínimo, configurar fuente `PressStart2P` y favicon propio.

**Tareas:**
- Sustituir `app/favicon.ico` por `public/favicon.png` (usar Metadata API de Next 16; leer `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`).
- Vaciar `app/page.tsx` dejando un placeholder simple (`<main>Pokédex</main>`).
- Reemplazar fuentes Geist en `app/layout.tsx` por `PressStart2P` cargada con `next/font/local` desde `public/PressStart2P-Regular.ttf` (ver `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`).
- Cambiar `lang="en"` a `lang="es"` en `app/layout.tsx`.
- Ajustar `metadata` en `app/layout.tsx`: title `Pokédex`, descripción en español, icono.
- Limpiar `app/globals.css`: quitar estilos Geist, definir variables CSS base y reglas para transiciones suaves por defecto.
- Eliminar assets heredados no usados: `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`.

**Skills recomendadas:**
- `next-best-practices` (metadata, font, file conventions).
- `tailwind-css-patterns` (configuración base de Tailwind 4).

**Tests a diseñar (antes):** ninguno (fase de configuración).

**Tests a ejecutar (después):**
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build` debe compilar sin errores.

**Criterios de aceptación:**
- `npm run dev` levanta una página con título "Pokédex", lang `es` y favicon custom.
- No quedan referencias a Geist en el código.
- No quedan SVGs heredados no usados en `public/`.

**Documentación:**
- `README.md`: reescribir con descripción real del proyecto, prerequisitos (Node, npm), y comando `npm run dev`.
- `AGENTS.md`: añadir tras el bloque existente los comandos de lint/typecheck/build/test que el agente debe ejecutar al final de cada fase.

**Revisión humana:** No.

---

### Fase 00.2 — Configuración del sistema de tests

**Objetivo:** dejar `vitest` y `playwright` configurados y listos, con un test mínimo de humo que valide que funcionan.

**Tareas:**
- Instalar dependencias necesarias: `@vitest/coverage-v8`, `jsdom` (ya en deps), `@playwright/test` (ya instalado). Ejecutar `npx playwright install chromium` para descargar el navegador.
- Crear `vitest.config.ts` en la raíz con environment `jsdom`, `setupFiles` apuntando a `vitest.setup.ts`, alias `@/*` → `./src/*` o `./` según `tsconfig.json`.
- Crear `vitest.setup.ts` que importe `@testing-library/jest-dom/vitest`.
- Crear `playwright.config.ts` con `webServer` apuntando a `npm run dev` (puerto 3000), `testDir: ./e2e`, navegador chromium, screenshot en fallo.
- Añadir scripts en `package.json`: `"test": "vitest"`, `"test:run": "vitest run"`, `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`.
- Crear carpeta `__tests__/` con un test unitario de ejemplo (ej. util `capitalize` o similar) y carpeta `e2e/` con un spec que visite `/` y compruebe el title.

**Skills recomendadas:**
- `next-best-practices` (convenciones de testing).
- `vercel-react-best-practices` (patrones de render para tests).

**Tests a diseñar (antes):** esta fase ES la infraestructura de tests; los tests de humo son el deliverable.

**Tests a ejecutar (después):**
- `npm run test:run` pasa.
- `npm run test:e2e` pasa (requiere `npm run dev` levantado vía webServer).

**Criterios de aceptación:**
- Los comandos de test existen y pasan en verde.
- Las carpetas `__tests__/` y `e2e/` existen.

**Documentación:**
- `README.md`: añadir sección "Testing" con los comandos.
- `AGENTS.md`: añadir nota: "Antes de empezar una fase con código, escribir sus tests; al terminar, ejecutar `npm run test:run` y `npm run test:e2e`."

**Revisión humana:** No.

---

### Fase 00.3 — Sistema de diseño: tokens, colores y constantes

**Objetivo:** centralizar todos los datos hardcoded que el borrador pide (colores por tipo de pokemon, colores por generación, hábitats disponibles) en archivos TS consumibles desde toda la app.

**Tareas:**
- Crear `src/lib/constants/` con:
  - `pokemonTypes.ts`: mapa `type -> { bg, border, text }` para los 18 tipos de Pokemon. Consultar `doc/pokeapi/pokemon_v2/models.py` (modelo `Type`) para lista completa de tipos. Color genérico por defecto para tipos no contemplados.
  - `pokemonGenerations.ts`: mapa `generation -> { bg, border, text }` para generaciones I–IX. Color genérico por defecto.
  - `habitats.ts`: mapa `habitat -> imagen webp en /habitats` (caverna, bosque, pradera, campo, montana, agua_dulce, agua_salada, ciudad, raro, generico).
  - `colors.ts`: paleta base (granate `#910D03/#FF6363`, amarillo-anaranjado `#FF9203/#FFE590`, verde `#008C15/#75D984`, cyan oscuro botones `#126CA3/#46A2DA`, degradado body `#234476 → #0c1c3e`).
- Crear `src/lib/types/pokemon.ts` con tipos TypeScript base (`PokemonType`, `Generation`, `Habitat`, etc.) alineados con la PokeAPI.
- Documentar en `AGENTS.md` la ubicación de constantes para que futuras fases sepan dónde añadir colores nuevos.

**Skills recomendadas:**
- `typescript-advanced-types` (tipos discriminados, maps tipados, `as const`).
- `tailwind-css-patterns` (exposición de tokens vía `@theme`).

**Tests a diseñar (antes):**
- Test: cada tipo de PokeAPI conocido tiene entrada en `pokemonTypes.ts`.
- Test: cada generación I–IX tiene entrada en `pokemonGenerations.ts`.
- Test: cada hábitat referenciado mapea a un archivo existente en `public/habitats/`.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`
- `npx tsc --noEmit`

**Criterios de aceptación:**
- Existen los 18 tipos y las 9 generaciones con colores.
- Los tokens están tipados y exportados.
- Los tests validan cobertura de constantes.

**Documentación:**
- `AGENTS.md`: registrar ruta `src/lib/constants/` como única fuente de verdad para colores y constantes.

**Revisión humana:** Sí (revisión de paleta de colores por tipo y generación — criterio estético).

---

### Fase 00.4 — Configuración de `.gitignore` y estructura de carpetas

**Objetivo:** ignorar `doc/`, `coverage/`, `.next/`, artifacts de test y crear la estructura base de `src/`.

**Tareas:**
- Añadir a `.gitignore`: `/doc`, `/coverage`, `/playwright-report`, `/test-results`, `/e2e/.cache`.
- Confirmar que `/.next/`, `/node_modules/` ya están ignorados.
- Crear estructura de carpetas vacía con `.gitkeep` si procede:
  - `src/app/` (mover luego contenido de `app/` en el plan 02)
  - `src/components/`
  - `src/lib/`
  - `src/hooks/`
  - `src/styles/`

**Skills recomendadas:** ninguna.

**Tests:** ninguno (configuración).

**Criterios de aceptación:**
- `git status` no muestra archivos bajo `doc/`.
- La estructura de carpetas existe.

**Documentación:**
- `README.md`: documentar la estructura de carpetas del proyecto.

**Revisión humana:** No.

---

## Riesgos

- **Next.js 16 con breaking changes**: la Metadata API y `next/font/local` pueden tener diferencias. Siempre leer la doc local antes.
- **Tailwind 4** cambia la configuración (sin `tailwind.config.js` por defecto, configuración vía CSS). Verificar en `postcss.config.mjs` y `globals.css`.
