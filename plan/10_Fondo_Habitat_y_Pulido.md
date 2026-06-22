# Plan 10 — Fondo Hábitat y Pulido Final

## Objetivo

Cerrar el ciclo visual: fondo animado en la pokedex (body gradient + tile), imagen del hábitat del pokemon seleccionado con animación de entrada, degradado inferior para fundir. Después, auditoría transversal de accesibilidad, rendimiento y consistencia.

## Comportamientos del borrador

- En la pokedex, el fondo animado de la página de inicio **se mantiene**, pero añadimos un color de body con degradado `#234476 → #0c1c3e`. Los tiles no tapan el degradado (ya tienen transparencia).
- Al mostrar la ficha de un pokemon, se muestra el fondo de su hábitat.
- La imagen del hábitat **no aparece de golpe**: animación rápida en la que sale en pequeño desde la derecha y se agranda hasta ocupar el ancho.
- El hábitat lleva un degradado de transición en la parte inferior para fundir con el fondo.

## Aclaración importante (comportamiento)

El hábitat tiene un **doble propósito visual** que hay que distinguir bien:

1. **Al seleccionar un pokemon (ficha 2D)**: el hábitat aparece como **fondo ambientador** detrás de la pokedex. La pokedex **permanece en su sitio** (NO baja). Es puramente estético, para dar ambientación al pokemon mientras se consulta su ficha.
2. **Al activar la vista 3D** (Plan 09.5): aquí sí la pokedex transiciona hacia abajo y el hábitat queda como fondo a pantalla completa tras el modelo 3D.

Es decir: la presencia del hábitat **no** implica bajar la pokedex. La pokedex solo baja cuando se pulsa el botón 3D.

## Recursos

- `public/habitats/*.webp` (10 hábitats + `generico.webp`).

## Contexto / Dependencias

- **Requiere**: Plan 03 (tile de fondo), Plan 06 (carrusel que dispara "pokemon seleccionado"), Plan 08 (detalle con habitat), Plan 09 (3D que también muestra el hábitat).
- **Habilita**: entrega final.

## Fases

---

### Fase 10.1 — Degradado body + tile en pokedex

**Objetivo:** aplicar el degradado `#234476 → #0c1c3e` al body y reutilizar el tile animado de la página de inicio en `/pokedex`.

**Tareas:**
- En `src/app/pokedex/layout.tsx` (o en un wrapper compartido), montar:
  - Un `<div>` fixed con `background: linear-gradient(180deg, #234476, #0c1c3e)` cubriendo toda la pantalla.
  - El componente `AnimatedBackground` (Plan 03.1) por encima del degradado.
- Reutilizar el mismo componente del Plan 03 (sin duplicar).
- El body debe permitir mostrar por encima el hábitat cuando proceda (z-index correcto).

**Skills recomendadas:**
- `tailwind-css-patterns` (z-index, fixed).
- `vercel-composition-patterns` (componente compartido sin prop drilling).

**Tests a diseñar (antes):**
- Test: el wrapper renderiza el degradado y el tile.
- Test: el orden z-index es correcto (degradado < tile < contenido).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Fondo visualmente coherente con la página de inicio pero con el degradado azul marino.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 10.2 — Imagen del hábitat con animación de entrada

**Objetivo:** mostrar el hábitat del pokemon seleccionado como fondo ambientador detrás de la pokedex (que **NO** baja), con la animación "pequeño desde la derecha → grande hasta ocupar el ancho".

**Tareas:**
- Componente `HabitatBackground` (client).
- **Disparador**: se activa al seleccionar un pokemon (cualquier navegación a `/pokemon/[name]`). La pokedex se queda visible por encima — el hábitat es una capa ambientadora, no sustituye a la pokedex.
- Recibe el `habitat` del pokemon (Plan 01.3) y mapea a la imagen webp correspondiente (Plan 00.3). Fallback a `generico.webp`.
- Animación de entrada (rápida, ~600ms):
  1. Estado inicial: `scale: 0.3`, `translateX: 50vw`, `opacity: 0`.
  2. Final: `scale: 1`, `translateX: 0`, `opacity: 1`, ocupa el ancho.
- Cubre toda la pantalla (object-fit: cover).
- Se renderiza por encima del degradado+tile pero **por debajo de la pokedex**. La pokedex permanece visible y operativa en todo momento.
- Al cambiar de pokemon, animar salida (fade out rápido) y entrada del nuevo.
- Al deseleccionar pokemon (volver a lista), animar salida.
- **Independencia respecto al 3D**: el ciclo de vida del hábitat no depende de la vista 3D. Al activar 3D la pokedex baja (Plan 09.5) y el hábitat ya está visible; al desactivar 3D la pokedex vuelve a subir y el hábitat sigue donde estaba. El hábitat solo se oculta al deseleccionar el pokemon.

**Skills recomendadas:**
- `frontend-design`.
- `tailwind-css-patterns` (keyframes).

**Tests a diseñar (antes):**
- Test: renderiza la imagen correcta según el habitat.
- Test: habitat desconocido → `generico.webp`.
- Test: la animación aplica las clases correctas al montar.
- Test: al activar/desactivar la vista 3D, el hábitat no se desmonta ni re-anima (solo cambia la pokedex).
- Test: al volver a la lista (sin pokemon seleccionado), el hábitat se desmonta con animación de salida.

**Fixtures (obligatorio):** el `habitat.name` que recibe `HabitatBackground` debe venir del detalle **real de PokeAPI** capturado en `__tests__/fixtures/pokeapi/<name>.json` (con `scripts/capture-pokeapi-fixture.ts` ejecutando `POKEMON_DETAIL_QUERY` contra `https://graphql.pokeapi.co/v1beta2`). La lista canónica de hábitats en PokeAPI es fija (`cave`, `forest`, `grassland`, `mountain`, `rare`, `rough-terrain`, `sea`, `urban`, `waters-edge`, `unknown` — total 9 + `unknown`), y el mapeo a `public/habitats/<name>.webp` debe validarse con `habitat.name` real, NO con strings inventados. Mínimo cubrir:

- **Habitat conocido con `.webp` propio**: `pikachu` (`forest`) → valida el mapeo directo.
- **Habitat distinto conocido**: `magikarp` (`waters-edge`) → valida que no todos van a `forest.webp`.
- **Habitat `unknown`**: capturar el fixture de un pokemon cuyo `pokemonspecy.pokemonhabitat.name === "unknown"` (p.ej. algunos legendarios o de generaciones nuevas) → debe ir a `generico.webp`. NO usar `habitat: null` o `habitat: "no-existe"` inventado — el componente debe poder distinguir `null` (sin `pokemonhabitat`) de `"unknown"` (valor explícito de PokeAPI).
- Para el test "al activar/desactivar la vista 3D, el hábitat no se desmonta" usar un pokemon con `.glb` (p.ej. `pikachu`) capturado de PokeAPI real.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- La entrada del hábitat es fluida y rápida.
- La pokedex permanece visible y operativa durante todo el ciclo del hábitat.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 10.3 — Degradado inferior para fundir con el fondo

**Objetivo:** aplicar un overlay en la parte inferior del hábitat que funda con el degradado `#0c1c3e` del body.

**Tareas:**
- En `HabitatBackground`, superponer un `<div>` absoluto en la parte inferior con:
  - `background: linear-gradient(180deg, transparent, #0c1c3e)`.
  - Altura ~30–40% del viewport (ajustar visualmente).
- Cubre también los laterales si hace falta para que el hábitat no se vea "pegado".
- La transición debe ser sutil y natural.

**Skills recomendadas:**
- `frontend-design`.
- `tailwind-css-patterns`.

**Tests a diseñar (antes):**
- Test: el overlay existe y tiene el gradiente correcto.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Fundido natural hábitat ↔ body.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 10.4 — Auditoría de accesibilidad (WCAG 2.2)

**Objetivo:** revisar y corregir problemas de accesibilidad en toda la app.

**Tareas:**
- Ejecutar audit con la skill `accessibility` (axe-core o equivalente).
- Checklist:
  - Todos los botones tienen `aria-label` o texto accesible.
  - Navegación por teclado completa (Tab orden lógico, focus visible).
  - Contraste de texto suficiente (especialmente chips, consola terminal, LCD verde).
  - `prefers-reduced-motion` respetado en todas las animaciones.
  - Imágenes con `alt` descriptivo.
  - Roles ARIA correctos en lista, carrusel, combobox del buscador.
  - Skip link al contenido principal.
  - `lang="es"` en `<html>`.
  - Sin `tabindex` positivos.
- Documentar y corregir todos los hallazgos críticos.

**Skills recomendadas:**
- `accessibility` (guía principal).
- `seo` (algunos solapamientos: lang, meta).

**Tests a diseñar (antes):**
- E2E con `@axe-core/playwright`: cargar cada ruta y verificar que no hay violaciones críticas.
- Test de navegación por teclado: recorrer la pokedex solo con Tab/Enter/Espacio.

**Tests a ejecutar (después):**
- `npm run test:e2e`
- `npm run lint`

**Criterios de aceptación:**
- 0 violaciones críticas de axe.
- Navegación por teclado completa.

**Documentación:**
- `README.md`: sección "Accesibilidad" con declaraciones WCAG.

**Revisión humana:** Sí (validación con lector de pantalla si es posible).

---

### Fase 10.5 — Optimización de rendimiento

**Objetivo:** revisar bundle, imágenes, animaciones y consultas para maximizar performance.

**Tareas:**
- Analizar bundle con `@next/bundle-analyzer` (instalar si hace falta).
- Verificar:
  - `three.js` y `GLTFLoader` se cargan dinámicamente solo cuando hace falta.
  - `framer-motion` (o la librería elegida) no inflada.
  - Imágenes `next/image` con `sizes` correctos y formato moderno.
  - Fonts con `display: swap` y preload.
  - Lazy load de componentes pesados (`dynamic(() => ...)`).
  - Memoización de componentes pesados de la pokedex.
  - Suspense boundaries para evitar waterfall de cargas.
- Lighthouse: target LCP < 2.5s, CLS < 0.1, TBT < 200ms.
- Verificar que no hay re-renders innecesarios (React DevTools Profiler).

**Skills recomendadas:**
- `vercel-react-best-practices` (memo, transitions, deferred value, lazy state).
- `next-best-practices` (image, font, bundling, scripts).
- `next-cache-components` (cache strategy final).

**Tests a diseñar (antes):**
- E2E de performance (Lighthouse CI o playwright-trace) en CI/local.

**Tests a ejecutar (después):**
- `npm run build`
- `npm run test:e2e`
- Lighthouse audit manual.

**Criterios de aceptación:**
- Bundle principal < 200KB gzipped (excluyendo three.js lazy).
- LCP < 2.5s en la página de inicio.

**Documentación:**
- `README.md`: notas de rendimiento y cómo medir.

**Revisión humana:** Sí.

---

### Fase 10.6 — Test E2E end-to-end completo + revisión final de documentación

**Objetivo:** cubrir con Playwright los flujos críticos completos y dejar `README.md` y `AGENTS.md` definitivos.

**Tareas:**
- Specs E2E en `e2e/`:
  1. **Smoke**: cargar `/`, ver logo, pulsar Enter → termina en `/pokedex`.
  2. **Filtros**: aplicar filtro por dropdown, verlo en consola y URL, volver atrás, verificar estado.
  3. **Buscador**: buscar "pikachu" → clic en resultado → ficha.
  4. **Carrusel**: seleccionar pokemon, verificar auto-avance y botones manuales.
  5. **Evoluciones**: clic en evolución → cambia la ficha.
  6. **3D**: pokemon con modelo → pulsar 3D → canvas visible → arrastrar rota.
  7. **404**: ruta inválida → página 404 → volver al inicio.
  8. **Sonido**: activar música en inicio → navegar → fade out.
  9. **Responsive**: smoke en mobile (375px) y desktop (1280px).
- `README.md` final: descripción, features, setup, scripts, env vars, testing, deploy.
- `AGENTS.md` final: comandos a ejecutar tras cada cambio, estructura de carpetas, convenciones (estado de filtros único, slots de la pokedex, etc.).

**Skills recomendadas:**
- `seo` (metadata final, sitemap opcional).
- `next-best-practices` (deploying).

**Tests a diseñar (antes):** los specs E2E son el deliverable.

**Fixtures (obligatorio):** los specs E2E de esta fase (en particular #2 filtros, #3 buscador, #4 carrusel, #5 evoluciones, #6 3D) deben trabajar con datos **reales de PokeAPI** servidos por el dev server, NO con respuestas interceptadas por `page.route()`. Todos estos specs se marcan con `@live-api` en `playwright.config.ts` (mismo patrón definido en Plan 07.5) y se **skippean** si `graphql.pokeapi.co` no es alcanzable desde CI (`test.skip(!process.env.POKEAPI_REACHABLE)`). Pokemons canónicos de los specs (todos con datos estables en PokeAPI): `pikachu` (#25, tiene `.glb`, cadena de evoluciones lineal, habitat `forest`, flavor text es), `eevee` (#133, habitat `urban`, evoluciones ramificadas — valida el spec de evoluciones), `magikarp` (#129, habitat `waters-edge`, stats bajos, muchos sprites faltantes — valida spec de carrusel con fallback), `bulbasaur` (#1, doble tipo `grass`+`poison`, habitat `grassland`). Las capturas para los unit tests de esta fase (`__tests__/fixtures/pokeapi/<name>.json`) se generan con `scripts/capture-pokeapi-fixture.ts` ejecutando `POKEMON_DETAIL_QUERY` / `POKEMON_LIST_QUERY` contra `https://graphql.pokeapi.co/v1beta2`.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run test:e2e`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

**Criterios de aceptación:**
- Todos los E2E pasan.
- Documentación completa.

**Documentación:**
- `README.md` definitivo.
- `AGENTS.md` definitivo.

**Revisión humana:** Sí (entrega final).

---

## Riesgos

- **Animación del hábitat compitiendo con otras animaciones**: coordinar z-index y timing.
- **LCP en inicio**: los SVG (logo, ash, pokedex cerrada, 10 pokemons) pueden penalizar. Priorizar el logo con `priority` en `next/image` o inline SVG crítico.
- **Compatibilidad de WebGL en CI**: los E2E del visor 3D pueden necesitar `--use-gl=swiftshader` en Playwright.
