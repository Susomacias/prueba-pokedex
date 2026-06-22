# Plan 06 — Lista y Carrusel de Pokemons

## Objetivo

Implementar el contenido del slot `CARRUSEL_IMAGENES_DESCRIPCION` y sus slot adyacentes: lista con scroll infinito acumulativo, card de lista, carrusel de imágenes+info al seleccionar, puntos LED, botones analógicos y botón de sonido (cry). Loading pikachu discreto.

## Comportamientos del borrador

### Lista (sin pokemon seleccionado)

- Muestra los **30 primeros** pokemons con filtros actuales.
- Card: miniatura a la derecha ocupando todo el alto, nombre grande a la izquierda, chips tipo1/tipo2 debajo del nombre, chips habitat+generación a la derecha.
- Scroll infinito: al bajar, carga los **30 siguientes**. **Carga acumulativa**: todas las páginas cargadas se mantienen en memoria (no hay destrucción al subir). El navegador maneja miles de nodos sin problema y la UX resultante es predecible y sin "saltos".
- Loading discreto si el usuario navega muy rápido.

### Carrusel (con pokemon seleccionado)

- La lista desaparece, aparece el carrusel.
- Auto-avance cada 5s salvo que el usuario pulse los botones.
- Diapositiva 1: imagen principal.
- Diapositiva 2: imagen pequeña izq + descripción con scroll vertical propio.
- Resto: hasta 7 imágenes disponibles.
- Nombre del pokemon siempre visible arriba-izq en grande.

## Contexto / Dependencias

- **Requiere**: Plan 01 (datos lista+detalle), Plan 05 (slot del carrusel).
- **Habilita**: Plan 08 (detalle, reutiliza el carrusel).

## Fases

---

### Fase 06.1 — Lista con scroll infinito acumulativo

**Objetivo:** scroll infinito eficiente que cargue páginas a medida
que el usuario se acerca al final, **sin destruir las páginas ya
cargadas** y sin virtualización.

**Tareas:**
- Componente `PokemonList` (client) que usa `useFilteredPokemonList()` (Plan 02.3).
- Estrategia: **carga acumulativa simple**. `items[]` crece con cada `loadMore()`. No hay ventana deslizante, no hay `@tanstack/react-virtual`, no hay `position: absolute` con transformaciones.
- Disparo de carga: evento `scroll` nativo del contenedor con throttle por `requestAnimationFrame`. Cuando `scrollHeight - scrollTop - clientHeight <= LOOKAHEAD_PX` (400 px ≈ 1.7 pantallas), se llama `loadMore()`. Esto es 100% fiable dentro de un `<foreignObject>` SVG (donde `IntersectionObserver` con `root: scrollEl` da resultados inconsistentes en Chromium).
- Re-evaluación adicional en un `useEffect` que depende de `items`: si el contenedor crece y el usuario ya estaba cerca del final, se dispara la siguiente carga sin esperar al próximo evento `scroll`.
- Loading discreto en el punto de carga (spinner pequeño estilo arcade, no el pikachu gif que es para cargas globales).
- Cada card es un botón (accesible) que al pulsar selecciona el pokemon (cambia URL a `/pokemon/[name]` manteniendo filtros).
- **NO** aplicar animación CSS de entrada a cada card (`pokemon-list-card-enter` u otras) — interfiere con la altura efectiva de la card y con el scroll.

**Skills recomendadas:**
- `vercel-react-best-practices` (Activity API, deferred reads, memoization).
- `next-best-practices` (suspense boundaries para la carga).
- `accessibility` (lista como `role="listbox"`, cards como botones con `aria-label`).

**Tests a diseñar (antes):**
- Test: renderiza 30 cards iniciales.
- Test: al hacer scroll al ~75% del scrollHeight, carga 30 más.
- Test: pulsar una card dispara `router.push` a `/pokemon/[name]?<filtros>`.
- Test: con 1 solo resultado, no muestra lista (la UI carga la ficha directamente — ver Plan 02.3).
- Test: la altura de cada card respeta `min-height: 64px` (no se comprime por la animación de entrada).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Carga suave sin saltos ni pop-in.
- El scroll nunca se interrumpe (la siguiente tanda llega antes del final).
- Las cards mantienen su altura completa.

**Documentación:**
- Actualizar `AGENTS.md` con la sección "Lista de pokemons — patrón de scroll infinito" si cambia el patrón.

**Revisión humana:** Sí.

---

### Fase 06.2 — Card de lista

**Objetivo:** maquetar la card individual con los datos del item.

**Tareas:**
- Componente `PokemonListCard` con:
  - Miniatura (`next/image` con `pokemon_v2_pokemonsprites.front_default`) a la derecha, todo el alto.
  - Nombre en grande (`PressStart2P`, color oscuro) a la izquierda.
  - Debajo del nombre: chips tipo1/tipo2 (colores del Plan 00.3).
  - A la derecha: chips habitat+generación (colores del Plan 00.3).
- Estados: hover (realce sutil), focus (outline accesible), pressed.
- Sin emojis.
- Transición CSS al cambiar el contenido (ej: al aplicar filtros, las cards hacen fade out/in).

**Skills recomendadas:**
- `frontend-design` (estética dibujo 2D).
- `tailwind-css-patterns` (chips, layout).
- `next-best-practices` (component `<Image>` con sizing correcto).

**Tests a diseñar (antes):**
- Test: renderiza nombre, miniatura y 4 chips.
- Test: los chips tienen los colores correctos por tipo.

**Fixtures (obligatorio):** los props del pokemon (nombre, `pokemonsprites[0].sprites.front_default`, `pokemontypes[*].type.name`, `pokemonspecy.pokemonhabitat.name`, `pokemonspecy.generation.name`) deben leerse de **ficheros JSON capturados de PokeAPI real** (`__tests__/fixtures/pokeapi/<name>.json`), generados una vez con `scripts/capture-pokeapi-fixture.ts` ejecutando la query `POKEMON_DETAIL_QUERY` contra `https://graphql.pokeapi.co/v1beta2` y guardando la respuesta cruda. Los tests NUNCA deben inventar valores (p.ej. `name: "poke-1"`) para verificar mapeos de color o slots: el color de cada chip depende del `type.name` real (canonical en PokeAPI: `grass`, `fire`, `water`, …) y un nombre inventado podría no tener entrada en `POKEMON_TYPE_COLORS`. Mínimo cubrir: Bulbasaur (doble tipo + habitat `grass`), Pikachu (tipo `electric` único), Magikarp (tipo `water` + habitat `waters-edge` para validar mapeo habitat→color).

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Card visualmente arcade.
- Responsiva dentro del slot.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 06.3 — Carrusel de imágenes + info

**Objetivo:** al seleccionar un pokemon, mostrar el carrusel con auto-avance y diapositivas.

**Tareas:**
- Componente `PokemonCarousel` (client) que recibe el detalle del pokemon (Plan 01.3).
- **Efecto lateral al seleccionar**: la selección del pokemon dispara también la aparición del hábitat como fondo ambientador (Plan 10.2). La pokedex **no** baja — el hábitat es una capa estética detrás. Esta lógica vive en el `HabitatBackground`, no en el carrusel; el carrusel solo asegura que la selección esté propagada al estado global (vía URL `/pokemon/[name]`).
- Diapositivas:
  1. Imagen principal (`front_default`) grande, centrada.
  2. Imagen principal pequeña a la izq + flavor text (es) a la der con scroll vertical propio (`overflow-y-auto` con scrollbar discreto).
  3–7. Otras imágenes disponibles (`back_default`, `front_shiny`, oficiales, etc.), máximo 7.
- Auto-avance cada 5s con `setInterval`. Al pulsar botones manuales, detener auto-avance (flag `userInteractedRef`).
- Nombre del pokemon siempre visible arriba-izq, grande.
- Animación de transición entre diapositivas (slide horizontal, 400ms).
- Detener el intervalo al desmontar.

**Skills recomendadas:**
- `vercel-react-best-practices` (useRef transient values, move effect to event).
- `tailwind-css-patterns` (overflow styling discreto).

**Tests a diseñar (antes):**
- Test: renderiza N diapositivas (máx 7) según sprites disponibles.
- Test: el auto-avance pasa a la siguiente diapositiva a los 5s.
- Test: pulsar un botón manual detiene el auto-avance.
- Test: el flavor text está en español.
- Test: el nombre siempre visible.

**Fixtures (obligatorio):** los fixtures del detalle (`pokemonsprites[*].sprites`, `pokemonspecies[*].flavor_text`, `name`) deben proceder de **respuestas reales de PokeAPI** guardadas en `__tests__/fixtures/pokeapi/<name>.json` (capturadas con `scripts/capture-pokeapi-fixture.ts` ejecutando `POKEMON_DETAIL_QUERY` contra `https://graphql.pokeapi.co/v1beta2`). El test de flavor text en español depende del campo `language.name === "es"` real (PokeAPI tiene varios `flavor_text` por especie en distintos idiomas; un fixture inventado podría no contener la entrada `es` o tener el formato con caracteres de control que PokeAPI inserta — p.ej. saltos de línea `\n` y `\f` dentro del texto). Mínimo cubrir: Pikachu (muchos sprites + flavor es con caracteres de control), Magikarp (pocos sprites, valida mínimo 2 diapositivas), Bulbasaur (cadena con flavor es largo). El test de "N diapositivas según sprites" debe contar las claves reales presentes en `sprites` del fixture (no asumir un número fijo hardcoded).

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Carrusel funcional y animado.
- Sin saltos visuales.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 06.4 — Puntos LED del carrusel

**Objetivo:** LEDs pequeños que indican la diapositiva activa.

**Tareas:**
- Componente `CarouselDots` (slot `PUNTOS_CARRUSEL`).
- Un LED por diapositiva. Apagados en gris oscuro, encendido en verde brillante.
- Efecto de brillo sutil (box-shadow pequeño, no potente — el borrador pide discreción).
- Pequeños (ej: 6–8px), perfilados sobre el fondo gris claro de la carcasa.
- Click en un LED va a esa diapositiva (bonus de accesibilidad/usabilidad).

**Skills recomendadas:**
- `frontend-design`.
- `accessibility` (cada LED como botón con `aria-label` "Diapositiva N").

**Tests a diseñar (antes):**
- Test: un LED por diapositiva.
- Test: el LED activo tiene la clase de encendido.
- Test: cambiar de diapositiva actualiza el LED activo.
- Test: click en LED navega a esa diapositiva.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Los LEDs son discretos y profileados.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 06.5 — Botones analógicos del carrusel

**Objetivo:** dos botones arcade con triángulo izq/der para navegar manualmente.

**Tareas:**
- Componente `CarouselButtons` (slot `BOTONES_CARRUSEL`).
- Estilo botón analógico de máquina recreativa: cuadrado redondeado, bisel, sombra, efecto press (`active:translate-y-px`).
- Icono triángulo (lucide-react `ChevronLeft` / `ChevronRight`, o SVG propio más arcade).
- Al pulsar: detiene auto-avance, avanza/retrocede una diapositiva (wrap o clamp según preferencia — por defecto clamp en los extremos).
- Animación de la diapositiva coherente con el sentido (der→izq al avanzar).
- Disabled visual (no clickable) en los extremos si clamp.

**Skills recomendadas:**
- `frontend-design`.
- `tailwind-css-patterns`.

**Tests a diseñar (antes):**
- Test: click der avanza.
- Test: click izq retrocede.
- Test: tras pulsar, el auto-avance se detiene.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Botones arcade y funcionales.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 06.6 — Botón de sonido (cry del pokemon)

**Objetivo:** botón que reproduce el sonido (cry) del pokemon seleccionado.

**Tareas:**
- Componente `PokemonSoundButton` (slot `SONIDO_POKEMON`).
- Estilo similar a los botones del carrusel (arcade) con icono de altavoz (`lucide-react Volume2`).
- Al pulsar: reproduce `cry.latest` del detalle (Plan 01.3). Si está sonando, ignorar o detener y reproducir de nuevo (decidir).
- Visual feedback: animación de ondas mientras suena (timeout basado en duración del audio).
- Sin sonido si no hay cry disponible (botón hidden o disabled).

**Skills recomendadas:**
- `frontend-design`.
- `accessibility` (`aria-label` dinámico con el nombre del pokemon).

**Tests a diseñar (antes):**
- Test: click reproduce el audio (mock `HTMLAudioElement`).
- Test: sin cry → botón no se renderiza o está disabled.

**Fixtures (obligatorio):** el `cry.latest` / `cry.legacy` usado en los tests debe provenir de **respuestas reales de PokeAPI** en `__tests__/fixtures/pokeapi/<name>.json` (capturado desde `POKEMON_DETAIL_QUERY` contra `https://graphql.pokeapi.co/v1beta2`). El campo `cry` en PokeAPI v1beta2 es un JSON-string con la forma `{ latest: "https://…", legacy: "https://…" }` — NO usar URLs hardcoded inventadas, porque el parser real debe soportar exactamente el formato que devuelve PokeAPI (claves `latest` y `legacy`, URLs de `https://raw.githubusercontent.com/PokeAPI/cries/main/…`). Para el caso "sin cry" usar el fixture de un pokemon real sin `cry` (p.ej. alguno de las últimas generaciones puede no tener `cry.legacy`) — NO inventar `cry: null` en un objeto literal mockeado.

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- Botón reproduce el cry.
- Estado visual durante reproducción.

**Documentación:** No.

**Revisión humana:** Sí.

---

### Fase 06.7 — Loading pikachu animado discreto

**Objetivo:** animación del pikachu gif moviéndose del logo a la derecha, repetida mientras haya carga.

**Tareas:**
- Componente `LoadingPikachu` (client).
- Comportamiento: cuando hay una carga de datos activa, el pikachu se mueve rápidamente desde el logo (parte sup izq de la pokedex) hasta desaparecer por la derecha.
- Si los datos no han cargado al terminar la animación, se repite.
- La animación SIEMPRE termina con el elemento desapareciendo a la derecha (nunca se corta a mitad).
- Si se disparan varias cargas muy seguidas y la animación sigue en curso, no reiniciarla (flag `isAnimating`).
- Tamaño pequeño del gif.
- Estado de "cargando" expuesto por los hooks del Plan 02.3.

**Skills recomendadas:**
- `vercel-react-best-practices` (useRef transient values para evitar re-renders).
- `frontend-design`.

**Tests a diseñar (antes):**
- Test: al haber carga, el componente se monta y arranca la animación.
- Test: durante la animación, no se reinicia aunque se dispare otra carga.
- Test: la animación termina con el elemento fuera de pantalla.
- Test: al acabar la carga, el componente se desmonta (tras terminar animación).

**Tests a ejecutar (después):**
- `npm run test:run`

**Criterios de aceptación:**
- La animación es continua y no se pisa.

**Documentación:** No.

**Revisión humana:** Sí.

---

## Riesgos

- **Memoria en lista larga**: la carga acumulativa mantiene todos los items en memoria. Con 1300+ pokemons y ~64 px por card el navegador maneja el DOM sin problema; si en el futuro se llega a un volumen mucho mayor (filtros que devuelvan miles de resultados), considerar `content-visibility: auto` o `contain-intrinsic-size` en `.pokemon-list-card` para que el navegador recorte los nodos fuera de viewport sin destruir el estado.
- **Scroll en `<foreignObject>`**: `IntersectionObserver` con `root` apuntando al contenedor de scroll da resultados inconsistentes en Chromium. Usar SIEMPRE el evento `scroll` nativo del contenedor para detectar "casi al final". Documentado en `AGENTS.md`.
- **Carrusel con pocos sprites**: algunos pokemons tienen solo 1–2 sprites; el carrusel debe adaptarse (mínimo 2 diapositivas: imagen + descripción).
- **Sonido bloqueado sin interacción**: el botón está detrás de un click del usuario, así que no hay restricción de autoplay.
