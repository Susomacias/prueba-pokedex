# Plan 06 — Lista y Carrusel de Pokemons

## Objetivo

Implementar el contenido del slot `CARRUSEL_IMAGENES_DESCRIPCION` y sus slot adyacentes: lista virtualizada de pokemons, card de lista, carrusel de imágenes+info al seleccionar, puntos LED, botones analógicos y botón de sonido (cry). Loading pikachu discreto.

## Comportamientos del borrador

### Lista (sin pokemon seleccionado)

- Muestra los **30 primeros** pokemons con filtros actuales.
- Card: miniatura a la derecha ocupando todo el alto, nombre grande a la izquierda, chips tipo1/tipo2 debajo del nombre, chips habitat+generación a la derecha.
- Scroll infinito: al bajar, carga los **30 siguientes**. Al visualizar el 60, destruir los primeros 30 (memoria). Inverso al subir.
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

### Fase 06.1 — Lista virtualizada con destrucción de items

**Objetivo:** scroll infinito eficiente que mantenga como máximo ~60 cards en memoria.

**Tareas:**
- Componente `PokemonList` (client) que usa `useFilteredPokemonList()` (Plan 02.3).
- Estrategia: ventana deslizante. Mantener cargados los items `[currentPage, currentPage+1]` (30+30=60). Al entrar en la página `currentPage+1`, destruir `currentPage-1`.
- Detección de scroll: `IntersectionObserver` sobre un sentinel inferior. Al intersectar, cargar siguientes 30.
- Loading discreto en el punto de carga (spinner pequeño estilo arcade, no el pikachu gif que es para cargas globales).
- Si el usuario sube rápido, recargar la página anterior.
- Cada card es un botón (accesible) que al pulsar selecciona el pokemon (cambia URL a `/pokemon/[name]` manteniendo filtros).

**Skills recomendadas:**
- `vercel-react-best-practices` (Activity API, deferred reads, memoization).
- `next-best-practices` (suspense boundaries para la carga).
- `accessibility` (lista como `role="listbox"`, cards como `role="option"` o botones con `aria-label`).

**Tests a diseñar (antes):**
- Test: renderiza 30 cards iniciales.
- Test: al hacer scroll al final, carga 30 más.
- Test: al visualizar el item 60, los items 1–30 se desmontan (contar nodos).
- Test: pulsar una card dispara `router.push` a `/pokemon/[name]?<filtros>`.
- Test: con 1 solo resultado, no muestra lista (la UI carga la ficha directamente — ver Plan 02.3).

**Tests a ejecutar (después):**
- `npm run test:run`
- `npm run lint`

**Criterios de aceptación:**
- Máximo 60 nodos en DOM durante scroll normal.
- Carga suave sin saltos.

**Documentación:** No.

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

- **Memoria en lista larga**: la destrucción de items debe ser agresiva pero sin perder la posición de scroll. Usar `IntersectionObserver` + ventana fija.
- **Carrusel con pocos sprites**: algunos pokemons tienen solo 1–2 sprites; el carrusel debe adaptarse (mínimo 2 diapositivas: imagen + descripción).
- **Sonido bloqueado sin interacción**: el botón está detrás de un click del usuario, así que no hay restricción de autoplay.
