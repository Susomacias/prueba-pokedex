# Plan 08 — Detalle de Pokemon (Chips, Evoluciones, Stats, Habilidades)

## Objetivo

Implementar los slots de detalle: **chips de tipo1/tipo2/generación**, **pantalla LCD verde de evoluciones**, **pantalla LCD verde de stats/habilidades**, **toggle stats/habilidades** y el **botón 3D**.

## Nota sobre el hábitat

La selección de pokemon (que rellena estos slots) dispara **también** la aparición del hábitat como fondo ambientador detrás de la pokedex (Plan 10.2). Esa lógica **no** está en este plan — aquí solo se garantiza que el `habitat` del pokemon llegue vía el detalle (Plan 01.3) al estado global. La pokedex **no** baja al seleccionar un pokemon; solo baja al activar la vista 3D (Plan 09.5).

## Contexto / Dependencias

- **Requiere**: Plan 01 (detalle del pokemon), Plan 06 (carrusel que muestra el pokemon seleccionado).
- **Habilita**: Plan 09 (vista 3D, el botón vive aquí).

## Fases

---

### Fase 08.1 — Chips tipo1 / tipo2 / generación

**Objetivo:** chips informativos con colores hardcoded, adaptados a la disposición horizontal/vertical.

**Tareas:**
- Componente `PokemonChips` (slot `TIPO1_TIPO2_GENERACION`).
- Estado vacío (sin pokemon seleccionado): chips visibles pero vacíos con cuerpo (3 marcadores).
  - Tipo 1: granate (`#910D03` / `#FF6363`).
  - Tipo 2: amarillo anaranjado (`#FF9203` / `#FFE590`).
  - Generación: verde (`#008C15` / `#75D984`).
- Estado con pokemon: chip con nombre + colores del tipo/generación correspondiente (Plan 00.3). Borde oscuro + fondo claro del mismo tono. Color genérico si no contemplado.
- Layout:
  - **Horizontal**: tipos a la derecha del límite, generación a la izquierda.
  - **Vertical**: tipos arriba del límite, generación abajo.
- Tipos 1 y 2 siempre juntos.
- Transición CSS al cambiar de vacío a lleno.

**Skills recomendadas:**
- `frontend-design`.
- `tailwind-css-patterns`.
- `typescript-advanced-types` (lookup de colores por tipo).

**Tests a diseñar (antes):**
- Test: estado vacío renderiza 3 chips con los colores base.
- Test: con pokemon, tipo1/tipo2 tienen los colores correctos.
- Test: color genérico si el tipo no está contemplado.
- Test: layout horizontal pone tipos a la der y generación a la izq.

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Chips visualmente arcade y responsivos.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 08.2 — Pantalla LCD verde de evoluciones

**Objetivo:** árbol de evoluciones con estética LCD verde antigua.

**Tareas:**
- Componente `EvolutionsPanel` (slot `EVOLUCIONES`).
- Recibe el árbol de evoluciones del detalle (Plan 01.3).
- Diseño:
  - Fondo verde LCD (`#9 BBC8A`-style, monochrome green).
  - Cada item: imagen del pokemon en escala de grises + filtro CSS para fusionar con el fondo (parecer LCD).
  - Nombre del pokemon al lado de la imagen.
  - Nivel/requisito de evolución a la derecha en pequeño.
  - El pokemon actual destacado (borde/inverso).
- Orden: evoluciones previas y posteriores en secuencia.
- Click en una evolución → carga ese pokemon en la pokedex (navegación a `/pokemon/[name]` manteniendo filtros).
- Sin scroll o scroll fino discreto si la cadena es larga (Eevee).

**Skills recomendadas:**
- `frontend-design` (efecto LCD, filtros CSS).
- `tailwind-css-patterns` (`filter: grayscale + contrast + sepia` para simular LCD).
- `accessibility` (lista navegable por teclado).

**Tests a diseñar (antes):**
- Test: renderiza la cadena completa en orden.
- Test: el pokemon actual está destacado.
- Test: click en evolución navega a su ficha.
- Test: filtro CSS aplicado a las imágenes.

**Fixtures (obligatorio):** la cadena de evoluciones (`pokemonspecies.evolves_from_species`, `pokemonevolutions[*]`) debe provenir de **respuestas reales de PokeAPI** capturadas en `__tests__/fixtures/pokeapi/<name>.json` (generadas con `scripts/capture-pokeapi-fixture.ts` ejecutando `POKEMON_DETAIL_QUERY` contra `https://graphql.pokeapi.co/v1beta2`). La estructura del árbol de evoluciones en PokeAPI v1beta2 es anidada y profunda: `pokemonspecies(where:{name}) → evolves_from_species(name) → evolves_from_species ...` para los previos; para los posteriores hay que consultar `pokemonevolutions(where:{pokemonspecy.name})` y resolver transitivamente hasta hojas. Un fixture inventado (`evolves_from: "pichu"` plano) NO validaría la lógica real del componente. Mínimo cubrir:

- **Cadena lineal corta** (3 miembros, sin ramificar): `pikachu` (chain `pichu → pikachu → raichu`).
- **Cadena ramificada** (Eevee con 8 evoluciones finales): `eevee` — valida el orden, el scroll fino y que `evolves_to` se expande.
- **Pokemon sin evolución** (raíz y hoja a la vez): `magikarp` — valida que solo aparece 1 ítem.

Para el test "filtro CSS aplicado a las imágenes" verificar la clase CSS (no la existencia del filtro — `filter: grayscale sepia contrast(...)`), porque el filtro viene del componente, pero las URLs de imagen en el fixture son reales (incluyen `front_default` real, no inventado).

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Aspecto LCD verde creíble.
- Navegación funcional.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 08.3 — Pantalla LCD verde de stats

**Objetivo:** mostrar stats base del pokemon en pantalla LCD verde.

**Tareas:**
- Componente `StatsPanel` (slot `STATS`).
- Diseño LCD verde igual que 08.2 (mismo contexto visual).
- Stats base: HP, Ataque, Defensa, Ataque especial, Defensa especial, Velocidad.
- Cada stat: nombre + barra/bloques LCD (llenado proporcional al valor, máx 255).
- Modo habilidades (ver 08.4): lista de habilidades con nombre + nivel/cómo se obtiene.

**Skills recomendadas:**
- `frontend-design`.
- `tailwind-css-patterns`.

**Tests a diseñar (antes):**
- Test: renderiza los 6 stats.
- Test: la barra se llena proporcionalmente.

**Fixtures (obligatorio):** los `pokemonstats[*].base_stat`, `pokemonstats[*].stat.name` (HP, Attack, Defense, Special-Attack, Special-Defense, Speed) deben venir de **respuestas reales de PokeAPI** capturadas en `__tests__/fixtures/pokeapi/<name>.json` (con `scripts/capture-pokeapi-fixture.ts` ejecutando `POKEMON_DETAIL_QUERY` contra `https://graphql.pokeapi.co/v1beta2`). El test de "barra se llena proporcionalmente" debe calcular `width = base_stat / 255` (cap real usado por la UI) con los `base_stat` REALES del fixture. NO usar valores inventados (`{ hp: 100, attack: 100, ... }`) porque el test debe validar también el `stat.name` canónico de PokeAPI (`hp`, `attack`, `defense`, `special-attack`, `special-defense`, `speed` — con guiones, NO camelCase) y el orden natural de la API. Mínimo cubrir:

- **Stats bajos**: `magikarp` (valores muy bajos → barras casi vacías, valida el extremo bajo).
- **Stats altos**: `mewtwo` (valores muy altos → barras casi llenas, valida el extremo alto; id `#150`).
- **Stats normales**: `pikachu` (valores medios, valida el caso típico).

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Stats claros y legibles en LCD.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 08.4 — Toggle stats ↔ habilidades (botón start negro)

**Objetivo:** botón alargado negro que transiciona entre stats y habilidades.

**Tareas:**
- Componente `ToggleStatsAbilities` (slot `VER_HABILIDDES_VER_STATS`).
- Diseño: botón alargado negro tipo START de consola clásica.
- El texto cambia: muestra "VER HABILIDADES" cuando se ven stats, "VER STATS" cuando se ven habilidades.
- Click transiciona el contenido del slot STATS (fade out/in).
- Estado inicial: stats.

**Skills recomendadas:**
- `frontend-design`.
- `vercel-composition-patterns` (estado controlado vs no controlado).

**Tests a diseñar (antes):**
- Test: click alterna el modo.
- Test: el texto del botón refleja el modo actual.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Transición suave entre modos.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 08.5 — Botón "Ver en 3D"

**Objetivo:** botón que aparece solo cuando el modelo 3D está cargado y disponible.

**Tareas:**
- Componente `Button3D` (slot `BOTON_3D`).
- Comportamiento:
  - Cuando el modelo 3D del pokemon actual esté cargado (Plan 09), el botón se renderiza con `opacity: 0` y transiciona a `opacity: 1` con animación de 3s para llamar la atención.
  - Si el modelo no existe o da error, el botón **no se renderiza**.
- Diseño: botón sin fondo, icono de cubo (`lucide-react Box`) + texto "3D" en azul oscuro.
- Al pulsar: dispara la transición a la vista 3D (Plan 09.5).
- Estado visual: "activo" cuando la vista 3D está mostrándose (cambiar color o invertir).

**Skills recomendadas:**
- `frontend-design`.
- `accessibility` (`aria-pressed` para el estado activo).

**Tests a diseñar (antes):**
- Test: sin modelo cargado → no se renderiza.
- Test: con modelo cargado → aparece con animación.
- Test: click dispara el handler de toggle 3D.

**Fixtures (obligatorio):** el `id` del pokemon usado para construir la URL del modelo 3D (`https://raw.githubusercontent.com/Pokemon-3D-api/assets/.../{id}.glb`) debe provenir del detalle **real de PokeAPI** capturado en `__tests__/fixtures/pokeapi/<name>.json` (`scripts/capture-pokeapi-fixture.ts` contra `https://graphql.pokeapi.co/v1beta2`). El test "click dispara el handler de toggle 3D" debe verificar que la URL del `.glb` construida es exactamente `https://raw.githubusercontent.com/Pokemon-3D-api/assets/refs/heads/main/models/opt/regular/{id}.glb` con el `id` REAL del fixture (p.ej. `25` para pikachu, NO `1` inventado). Para el caso "sin modelo cargado" usar el fixture de un pokemon real sin `.glb` en el repo de `Pokemon-3D-api/assets` (p.ej. algunos de las últimas generaciones pueden no tener — verificar antes de capturar) — NO inventar el caso con un `id: 9999` cualquiera.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Aparición condicional correcta.
- Animación de 3s al aparecer.

**Documentación:** No.

**Revisión humana:** Sí.

---

## Riesgos

- **Cadenas de evolución ramificadas** (Eevee, Feebas): el layout debe adaptarse o usar scroll.
- **Filtro LCD**: aplicar el mismo filtro a todas las imágenes para mantener consistencia visual.
- **Modelos 3D no disponibles para todos los pokemons**: el botón 3D debe ocultarse limpiamente sin dejar hueco visual raro.
