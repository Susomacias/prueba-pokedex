# Plan 07 — Sistema de Filtros

## Objetivo

Implementar el sistema de filtros completo: **consola de terminal**, **dropdowns**, **buscador** y los botones **reset/filtrar**. Todos comparten el estado del Plan 02 (`useFilters`) y son bidireccionales entre sí y con la URL.

## Principios del borrador (CRÍTICOS)

- Consola de terminal y dropdowns son **dos vistas del mismo estado**. Aplicar filtro en uno se refleja en el otro. **No duplicar sistemas.**
- Si una consulta devuelve un único pokemon, mostrar la ficha directamente en lugar de la lista.
- Buscador actúa como un filtro más.
- Comandos de consola: `filtro`, `help`, `options <filtro>`, `resumen`, `quitar <filtro>`, `limpiar` (pantalla), `clear` (filtros), `<busqueda>`.
- Opciones de cada filtro se cargan de forma asíncrona (no bloquear la consola).

## Lista de filtros (8)

| Filtro | Origen de opciones |
|--------|-------------------|
| Tipo 1 | `pokemon_v2_type` (excluyendo `unknown`, `shadow`). |
| Tipo 2 | igual que Tipo 1. |
| Generación | `pokemon_v2_generation` (I–IX). |
| Color | `pokemon_v2_pokemoncolor`. |
| Hábitat | `pokemon_v2_pokemonhabitat`. |
| Altura | buckets predefinidos o agregado. |
| Peso | buckets predefinidos o agregado. |
| Habilidad | `pokemon_v2_ability`. |

## Contexto / Dependencias

- **Requiere**: Plan 01 (datos de opciones), Plan 02 (estado compartido), Plan 06 (lista que consume los filtros).
- **Habilita**: experiencia completa de búsqueda/filtrado.

## Fases

---

### Fase 07.1 — Consola de terminal de filtros

**Objetivo:** consola estilo terminal (fondo negro, letras blancas) que acepta comandos.

**Tareas:**
- Componente `FilterConsole` (client, slot `CONSOLA_FILTROS`).
- UI:
  - Pantalla scrollable (estilo terminal) con historial de comandos y respuestas.
  - Input en la parte inferior con prompt `>` y cursor parpadeante.
  - Scrollbar discreto estilo terminal.
- Comandos soportados:
  - `help` → lista comandos y filtros disponibles (con icono pokeball por filtro).
  - `filtro` → lista todos los filtros con icono pokeball + indicador de carga asíncrona de elementos disponibles.
  - `options <filtro>` → lista las opciones del filtro (carga asíncrona).
  - `<filtro> <valor>` → aplica el filtro (autocompletado opcional).
  - `resumen` → muestra los filtros aplicados actualmente.
  - `quitar <filtro>` → elimina un filtro concreto.
  - `limpiar` → limpia la pantalla de la consola.
  - `clear` → quita TODOS los filtros.
  - `<texto>` → búsqueda (actúa como filtro de búsqueda).
  - `enter` → aplica los filtros y refresca la lista.
- Errores amables: comando no reconocido → mensaje de ayuda.
- Historial navegable con flechas arriba/abajo (como una shell real).
- Las opciones se cargan con `useFilterOptions(key)` (Plan 02.3) y se muestran cuando están disponibles (indicador de carga mientras tanto).

**Skills recomendadas:**
- `frontend-design` (estética terminal).
- `vercel-composition-patterns` (separar parser de UI).
- `accessibility` (`role="log"` para la pantalla, input con `aria-label`).

**Tests a diseñar (antes):**
- Test del parser: cada comando se parsea correctamente (tabla de casos).
- Test: `help` muestra la lista.
- Test: aplicar filtro actualiza el estado y se refleja en la lista.
- Test: `quitar` elimina el filtro.
- Test: `clear` vacía todos los filtros.
- Test: el buscador como comando aplica filtro de búsqueda.
- Test: historial con flechas.
- Test: opciones asíncronas muestran indicador mientras cargan.

**Fixtures (obligatorio):** los tests que verifiquen opciones de filtro (`options <filtro>`, el `help` con nombres reales, el `resumen` con valores reales, `quitar <filtro>` con un nombre que exista en PokeAPI) deben usar fixtures capturados de **respuestas reales de PokeAPI** en `__tests__/fixtures/pokeapi/filter-options/<key>.json` (generados con `scripts/capture-pokeapi-fixture.ts` ejecutando `TYPES_QUERY`, `GENERATIONS_QUERY`, `COLORS_QUERY`, `HABITATS_QUERY`, `ABILITIES_QUERY` contra `https://graphql.pokeapi.co/v1beta2`). La lista de nombres de cada filtro es **estática** en PokeAPI (los 18 tipos canónicos, 9 generaciones, etc.) — usar nombres inventados podría dar lugar a falsos positivos si el parser acepta cualquier string. Mínimo cubrir: `fire` y `water` (tipos), `generation-i` (generación), `forest` (hábitat), `overgrow` (habilidad). El test de "opciones asíncronas con indicador de carga" debe usar `fetchFilterOptions()` real contra el fixture JSON, NO un mock que devuelva `Promise.resolve([{name:'fire'}])` (eso no validaría la estructura real de la respuesta — p.ej. que `TYPES_QUERY` devuelve `{ pokemon_v2_type: [{ name, id, ... }] }` y hay que mapear).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Todos los comandos funcionan.
- El parser está separado de la UI ( testeable sin React).

**Documentación:**
- `README.md`: lista de comandos de la consola.

**Revisión humana:** Sí.

---

### Fase 07.2 — Dropdowns de filtros

**Objetivo:** grid de 8 botones (2 filas × 4) que despliegan opciones hacia arriba.

**Tareas:**
- Componente `FilterDropdowns` (client, slot `DROPDOWNS_FILTROS`).
- 8 botones cuadrados: cyan oscuro (`#126CA3`), pequeña elevación, texto blanco con el nombre del filtro.
- Al pulsar: dropdown hacia ARRIBA con todas las opciones + buscador interno que filtra las opciones.
- Selección múltiple o única según el filtro (tipo1/tipo2 únicos; el resto decidir).
- Estado activo: el botón cambia de color/borde cuando tiene filtro aplicado.
- Al seleccionar una opción: actualizar consola (resumen) + aplicar filtros.
- Si el resultado es un único pokemon → cargar ficha.
- Las opciones cargan asíncronamente (esqueleto/spinner mientras).

**Skills recomendadas:**
- `frontend-design` (diseño 2D arcade).
- `vercel-composition-patterns` (componente `Dropdown` reutilizable con variantes).
- `accessibility` (`role="listbox"`, navegación por teclado, `Escape` cierra).

**Tests a diseñar (antes):**
- Test: 8 botones renderizados en grid 2×4.
- Test: click abre el dropdown hacia arriba.
- Test: buscador interno filtra opciones.
- Test: seleccionar opción actualiza estado y cierra dropdown.
- Test: botón con filtro aplicado tiene estado visual activo.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Dropdowns funcionales y accesibles.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 07.3 — Buscador (pokeball lupa)

**Objetivo:** buscador con apariencia LCD, icono de lupa donde el cristal es una pokeball SVG.

**Tareas:**
- Componente `SearchInput` (client, parte del slot `BUSCAR_RESET_FILTRAR`).
- UI: pantalla LCD pequeña, icono lupa a la izquierda (el círculo de la lupa es una pokeball SVG dibujada a mano).
- Comportamiento:
  - Primero busca por nombre de pokemon → dropdown superior con resultados clickables.
  - Si hay 3+ letras y no hay resultados por nombre, buscar en descripciones, tipos, hábitats, generación.
  - Al seleccionar un resultado, navega a la ficha del pokemon.
  - Al escribir, aplica el término como filtro de búsqueda (reflejo en consola).
- Debounce de ~300ms antes de buscar.
- Accesible: `role="combobox"`, `aria-expanded`, lista de opciones con `role="option"`.

**Skills recomendadas:**
- `frontend-design` (pokeball SVG).
- `accessibility` (patrón combobox ARIA).

**Tests a diseñar (antes):**
- Test: escribir "pika" muestra resultados con Pikachu.
- Test: escribir 4 letras sin match en nombre expande a descripción.
- Test: seleccionar resultado navega a la ficha.
- Test: debounce evita llamadas excesivas.

**Fixtures (obligatorio):** el test de búsqueda ("pika" → Pikachu, fallback a descripción/tipos/hábitats) debe ejercitar el camino real contra PokeAPI. Las opciones son:

- **Opción A (preferida para unit tests)**: usar fixtures JSON capturados de `POKEMON_LIST_QUERY` / `POKEMON_LIST_FILTERED_QUERY` en `__tests__/fixtures/pokeapi/search/pika.json`, generados con `scripts/capture-pokeapi-fixture.ts` contra `https://graphql.pokeapi.co/v1beta2`. La query debe pasarse al cliente tal cual la construye `useFilterOptions`/`fetchPokemonList`, y el assertion debe verificar que el resultado contiene `{ name: "pikachu", id: 25, … }` (los campos reales de PokeAPI — NO asumir `name: "Pikachu"` capitalizado, PokeAPI devuelve `name` siempre en minúsculas).
- **Opción B (alternativa para E2E)**: el test E2E de Plan 10.6 cubre el flujo end-to-end con el dev server contra PokeAPI real (red habilitada en `playwright.config.ts` solo para specs marcados con `@live-api`).

Está **prohibido** mockear la respuesta con un array literal de objetos `{ name: 'Pikachu', id: 25 }` — eso no validaría la query GraphQL ni el shape real de PokeAPI. Para el test de "sin match en nombre expande a descripción" usar un término que de verdad no exista como nombre (p.ej. `"fuego"` → debe matchear contra el `type.name === "fire"` real en PokeAPI).

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Buscador funcional con fallback.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 07.4 — Botones Reset y Filtrar

**Objetivo:** botones de reset (start negro) y filtrar (arcade con triángulo der).

**Tareas:**
- `ResetButton`: diseño alargado negro tipo botón start de consola clásica. Quita todos los filtros, limpia la consola y muestra la lista inicial.
- `FilterButton`: diseño arcade con triángulo hacia la derecha. Si hay pokemon seleccionado, vuelve a mostrar la lista filtrada (cierra la ficha del pokemon pero mantiene los filtros).
- Ambos con transiciones CSS en hover/press.

**Skills recomendadas:**
- `frontend-design`.
- `tailwind-css-patterns`.

**Tests a diseñar (antes):**
- Test: reset vacía filtros y dispara `clearAll`.
- Test: reset limpia la consola (llama al método del componente consola vía ref o contexto).
- Test: filtrar con pokemon seleccionado vuelve a la lista manteniendo filtros.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Ambos botones cumplen su función.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 07.5 — Integración bidireccional completa

**Objetivo:** verificar y completar la sincronización bidireccional entre consola, dropdowns, buscador y URL.

**Tareas:**
- Auditoría de integración:
  - Aplicar filtro en dropdown → reflejo en consola (resumen) + URL.
  - Aplicar filtro en consola → reflejo en dropdown (estado activo) + URL.
  - Buscar en buscador → reflejo en consola y URL.
  - Cambiar URL manualmente → reflejo en consola + dropdown + buscador.
  - Back/forward del navegador → todo se sincroniza.
- Caso único: si el resultado de filtros es un solo pokemon, redirigir a `/pokemon/[name]?<filtros>` automáticamente.
- Test E2E completo que cubra los 4 flujos.

**Skills recomendadas:**
- `vercel-react-best-practices` (derived state sin effects).
- `next-best-practices` (RSC boundaries).

**Tests a diseñar (antes):**
- E2E: aplicar filtro por dropdown → aparece en consola + URL.
- E2E: aplicar filtro por consola → aparece en dropdown + URL.
- E2E: pegar URL con filtros → dropdown y consola los reflejan.
- E2E: back del navegador restaura filtros previos.
- E2E: filtro que devuelve 1 pokemon → redirige a ficha.

**Fixtures (obligatorio):** los E2E que aplican filtros o navegan fichas deben trabajar con datos **reales de PokeAPI** (`https://graphql.pokeapi.co/v1beta2`) servidos a través del dev server. NO usar `page.route('**/graphql.pokeapi.co/**', ...)` para mockear respuestas — el objetivo del test es validar la integración real con PokeAPI (URL correcta, query correcta, parsing de la respuesta real). Estrategia:

- Specs marcados con `@live-api` en `playwright.config.ts` (config aparte o `testMatch` específico) habilitan la red hacia `graphql.pokeapi.co`.
- Los specs usan siempre **pokemons reales y estables** como datos de prueba: `pikachu` (#25, tiene modelo 3D, varias evoluciones en una cadena lineal — `pichu→pikachu→raichu`), `eevee` (#133, para filtros que devuelven 1 pokemon + para cadenas de evolución ramificadas), `magikarp` (#129, habitat `waters-edge`), `bulbasaur` (#1, doble tipo `grass`+`poison`, habitat `grassland`).
- Si en CI la red a PokeAPI no está disponible, el spec se **skippea** (no se mockea): `@live-api` → `test.skip(!process.env.CI || !process.env.POKEAPI_REACHABLE)`.

Está prohibido `page.route()` con respuesta inventada para `graphql.pokeapi.co` en estos E2E.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run test:e2e`
- `npm run lint`

**Criterios de aceptación:**
- Todos los flujos bidireccionales pasan.
- Sin recarga de página en ningún caso.

**Documentación:**
- `AGENTS.md`: "El sistema de filtros es único y vive en `useFilters`. Cualquier nuevo componente de filtro DEBE consumir ese hook."

**Revisión humana:** Sí.

---

## Riesgos

- **Complejidad del parser de consola**: mantenerlo simple y tabular los casos.
- **Rendimiento del buscador con debounce**: acotar las consultas GraphQL con `limit`.
- **Scroll del teclado en mobile**: el input de la consola y el buscador no deben quedar tapados por el teclado nativo. Usar `viewport-fit=cover` y `dvh`.
