# Plan 11 — Chat con Profesor Oak (IA)

## Objetivo

Crear un chat de ayuda con IA en `/pokedex` que simula al Profesor Oak. La IA trabaja en modo agente con razonamiento, puede responder preguntas sobre pokemons, sobre el propio Oak, aplicar filtros en la Pokédex o mostrar un pokemon. El usuario ve en tiempo real el razonamiento, las llamadas a herramientas y la respuesta final, sin que el chat quede estático.

## Comportamientos del borrador

- A los 3 segundos de estar la Pokédex visible, el avatar del Profesor Oak aparece con una animación llamativa en la esquina inferior derecha.
- Tras la animación, sale un globo de chat sobre el avatar con una frase de presentación y un input de texto.
- Al hacer focus en el input, la ventana de chat se expande (más alta y ancha) para conversar cómodamente.
- El diseño debe ser amigable (dibujo animado) pero con toque moderno de científico — nada infantil.
- Tipografía sans-serif (system font stack), distinta de la fuente pixel de la Pokédex.
- Input de chat optimizado para IA: 1 línea inicial, crece hasta 5 líneas, con scroll. Botón de envío integrado con icono.
- El chat muestra globos de razonamiento, uso de herramientas y loadings antes de la respuesta final. No puede parecer colgado.
- Conversación de sesión guardada en JSON en memoria (se resetea al recargar la página).

## Requisitos IA

- La IA trabaja en modo agente con razonamiento (MiniMax M3), usando herramientas tantas veces como necesite.
- La comunicación con la Pokédex es mediante funciones que reciben JSON.
- Si la IA genera JSON inválido, se le devuelve un error específico con un ejemplo correcto para que reintente.
- El chat recoge la información generada por la IA en tiempo real (razonamiento + herramientas + respuesta).

## Herramientas — funcionalidades de IA

| Herramienta | Ejecución | Descripción |
|---|---|---|
| `search_pokemon` | Servidor | Busca pokemons en PokeAPI por nombre, tipo, generación o hábitat |
| `get_pokemon_info` | Servidor | Obtiene ficha completa de un pokemon (stats, evoluciones, tipos, descripción) |
| `get_oak_info` | Servidor | Consulta la página de Wikipedia del Profesor Oak |
| `apply_filters` | Servidor → Cliente | Aplica filtros en la Pokédex (tipo, generación, hábitat) |
| `show_pokemon` | Servidor → Cliente | Muestra un pokemon en la Pokédex |

## Stack técnico

| Componente | Tecnología |
|---|---|
| LLM | MiniMax M3 (API OpenAI-compatible en `https://api.minimax.chat/v1`) |
| Streaming | SSE (Server-Sent Events) desde ruta API de Next.js |
| Chat UI | React Client Components + CSS Modules |
| Conversación | `useRef` + `useState` en memoria (sin persistencia) |
| PokeAPI | Mismo cliente GraphQL existente en `src/lib/graphql/client.ts` |
| Wikipedia | Fetch + cheerio (server-side, sin librería adicional — parse mínimo) |

## Contexto / Dependencias

- **Requiere**: Plan 02 (routing y estado compartido), Plan 05 (carcasa), Plan 07 (filtros), Plan 08 (detalle pokemon).
- **Habilita**: nada — es una funcionalidad final independiente.
- **Resultado**: chat funcional con IA dentro de la Pokédex.

## Arquitectura general

```
┌─ Navegador ───────────────────────────────────────────┐
│  PokedexOverlay                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  PokedexShell (SVG)                              │ │
│  │  ...                                             │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌───────────────────────┐                            │
│  │  OakChat (flotante)   │  ◄── SSE ──►  /api/oak-chat
│  │  · Avatar animado     │       │
│  │  · Burbujas de chat   │       │
│  │  · Input expansible   │       │
│  └───────────────────────┘       │
└──────────────────────────────────┼───────────────────┘
                                   │
┌─ Servidor Next.js ───────────────┼───────────────────┐
│  /api/oak-chat (route.ts)        │                   │
│  ┌────────────────────────────┐  │                   │
│  │  Agent Loop                │  │                   │
│  │  1. Recibe mensajes        │  │                   │
│  │  2. Llama a MiniMax M3     │──┼──► MiniMax API    │
│  │     con streaming + tools  │  │                   │
│  │  3. Si tool call → ejecuta │  │                   │
│  │     y devuelve resultado   │  │                   │
│  │  4. Repite hasta respuesta │  │                   │
│  │  5. Emite eventos SSE      │  │                   │
│  └────────────────────────────┘  │                   │
│  ┌────────────────────────────┐  │                   │
│  │  Tools server-side:        │  │                   │
│  │  · PokeAPI GraphQL         │  │                   │
│  │  · Wikipedia               │  │                   │
│  └────────────────────────────┘  │                   │
└──────────────────────────────────┴───────────────────┘
```

### Protocolo SSE

El endpoint `/api/oak-chat` emite los siguientes tipos de evento:

| Evento | `data` | Significado |
|---|---|---|
| `delta` | `string` | Token de texto de la respuesta final |
| `reasoning` | `string` | Fragmento de razonamiento del modelo |
| `tool_start` | `{ name, args }` | La IA va a llamar a una herramienta |
| `tool_end` | `{ name, result }` | Resultado de la herramienta |
| `tool_error` | `{ name, error, example }` | Error de validación (se reintenta) |
| `pokedex_command` | `{ action, payload }` | Comando para ejecutar en la Pokédex |
| `error` | `{ message }` | Error irrecuperable |
| `done` | `{ turnId }` | Fin del turno de conversación |

### Flujo agente

```
Usuario: "Muéstrame pokemons de tipo fuego"
  → Server: POST a MiniMax M3 con tools
  ← MiniMax: reasoning="El usuario quiere filtrar por tipo fuego..."
  ← MiniMax: tool_call { name: "apply_filters", args: { type1: "fire" } }
  → Server: valida args ✓ → emite SSE tool_start + pokedex_command
  → Server: tool_result { success: true }
  ← MiniMax: reasoning="Filtro aplicado. Ahora busco pokemons fuego..."
  ← MiniMax: tool_call { name: "search_pokemon", args: { type: "fire", limit: 5 } }
  → Server: ejecuta query PokeAPI → emite SSE tool_start + tool_end
  ← MiniMax: "He encontrado estos Pokémon de tipo Fuego: Charmander, ..."
  → Server: emite SSE delta × N + done
```

---

## Fases

---

### Fase 11.1 — Script de exploración MiniMax M3 API

**Objetivo:** validar la conexión con la API de MiniMax, entender los formatos de streaming y function calling, y documentar los hallazgos antes de escribir código de producción.

**Tareas:**
- Crear `scripts/test-minimax-api.ts`:
  - Cargar `MINIMAX_API_KEY` de `.env.local`.
  - Test 1 — **Chat completion básico**: enviar un mensaje simple, verificar respuesta.
  - Test 2 — **Streaming**: enviar mensaje con `stream: true`, leer tokens incrementalmente vía SSE.
  - Test 3 — **Function calling**: definir una herramienta de prueba (`get_weather`), verificar que el modelo la llama con los argumentos correctos.
  - Test 4 — **Multi-turn con tools**: simular un flujo agente: el modelo llama tool → script inyecta resultado → modelo responde.
  - Test 5 — **Razonamiento**: verificar si el modelo emite contenido de razonamiento (thinking) y cómo se recibe en el stream.
  - Test 6 — **System prompt como Profesor Oak**: enviar un system prompt con la personalidad del Profesor Oak y verificar que el tono y conocimiento son correctos.
- Cada test imprime resultados en consola con formato claro (éxito/fallo + payload relevante).
- Documentar hallazgos en `doc/minimax-api.md`:
  - Endpoint exacto y headers requeridos.
  - Formato del body para chat completion, streaming, y function calling.
  - Estructura de eventos SSE en streaming.
  - Formato de tool calls en el stream.
  - Formato esperado para devolver tool results al modelo.
  - Comportamiento del razonamiento (si se emite en campo separado o en el texto).
  - Límites prácticos (tokens, timeout, rate limiting).
- Ejecutar: `npx tsx scripts/test-minimax-api.ts` y verificar que los 6 tests pasan.

**Skills recomendadas:**
- `nodejs-backend-patterns` (streaming HTTP, manejo de errores de API externa).

**Tests a diseñar (antes):**
- No aplica — esta fase es exploratoria. El script ES el test.

**Tests a ejecutar (después):**
- Ejecución manual del script contra la API real.
- Verificar que `doc/minimax-api.md` contiene toda la información necesaria para la Fase 11.2.

**Criterios de aceptación:**
- [ ] Script ejecuta los 6 tests y todos pasan.
- [ ] Documento `doc/minimax-api.md` existe y describe endpoint, streaming, tools y razonamiento.
- [ ] No hay código de producción modificado (solo script + doc).

**Documentación:**
- Crear `doc/minimax-api.md`.

**Revisión humana:**
- No — el script valida contra la API real.

---

### Fase 11.2 — API Route de chat con SSE + bucle agente

**Objetivo:** implementar el endpoint `POST /api/oak-chat` que recibe mensajes del cliente, ejecuta el bucle agente contra MiniMax M3 y emite la respuesta por SSE con todos los tipos de evento definidos.

**Tareas:**
- Crear `src/app/api/oak-chat/route.ts`:
  - Método `POST`.
  - Lee `MINIMAX_API_KEY` de `process.env` (NUNCA expuesta al cliente).
  - Recibe body: `{ messages: { role, content }[] }` (historial de conversación).
  - Construye el system prompt del Profesor Oak:
    ```
    Eres el Profesor Oak, el científico Pokémon más reconocido del mundo.
    Tu laboratorio está en Pueblo Paleta, región Kanto. Eres amable,
    entusiasta y sabio. Hablas en español con un tono cálido y cercano.
    Ayudas a los entrenadores a entender el mundo Pokémon usando tus
    conocimientos y las herramientas a tu disposición (consultar la
    Pokédex, buscar Pokémon, aplicar filtros, mostrar fichas).
    ```
  - Implementa bucle agente:
    1. Añade system prompt al array de mensajes.
    2. Llama a MiniMax con streaming + definición de herramientas.
    3. Itera sobre los chunks del stream:
       - Si es texto → emite SSE `delta`.
       - Si es razonamiento → emite SSE `reasoning`.
       - Si es tool call:
         a. Emite SSE `tool_start` con nombre y argumentos.
         b. Valida argumentos contra esquema de la herramienta.
         c. Si inválido → emite SSE `tool_error` con ejemplo correcto y vuelve al paso 2 con el error como mensaje de herramienta.
         d. Si válido:
            - Herramientas server-side (`search_pokemon`, `get_pokemon_info`, `get_oak_info`): ejecuta y emite SSE `tool_end`.
            - Herramientas mixtas (`apply_filters`, `show_pokemon`): emite SSE `pokedex_command`, luego emite SSE `tool_end` con éxito sintético.
         e. Añade tool result al historial y vuelve al paso 2.
    4. Cuando el modelo termina → emite SSE `done`.
  - Maneja errores: si MiniMax falla, emite SSE `error` y cierra stream.
  - Timeout de seguridad: 120s máximo por turno.
  - Rate limiting básico: máx 10 requests por minuto por IP (usando un `Map` en memoria).

- Crear `src/lib/chat/tools/definitions.ts`:
  - Definiciones de herramientas en formato OpenAI/MiniMax function calling:
    - `search_pokemon`: name, type, generation, habitat, limit.
    - `get_pokemon_info`: name.
    - `get_oak_info`: query (opcional).
    - `apply_filters`: type1, type2, generation, habitat (todos opcionales).
    - `show_pokemon`: name.
  - Schemas de validación para cada herramienta (tipos, valores permitidos).
  - Función `validateToolArgs(name, args)` que devuelve `{ valid: true }` o `{ valid: false, error, example }`.

- Crear `src/lib/chat/tools/executor.ts`:
  - `executeTool(name, args)` → función asíncrona que ejecuta la herramienta.
  - `getToolResultForModel(name, result)` → formatea el resultado para devolver al modelo.
  - Herramientas server-side:
    - `search_pokemon` → llama a `fetchListFiltered` del Plan 01, mapea a resumen.
    - `get_pokemon_info` → llama a `fetchDetail` del Plan 01, extrae datos clave.
    - `get_oak_info` → fetch a `https://es.wikipedia.org/wiki/Profesor_Oak`, extrae primeros párrafos con regex simple (sin cheerio, sin dependencias nuevas).
  - Herramientas mixtas:
    - `apply_filters` → validación de filtros contra `FILTERS` de `src/lib/filters/types.ts`, emite SSE `pokedex_command`.
    - `show_pokemon` → valida que el nombre sea un string, emite SSE `pokedex_command`.

**Skills recomendadas:**
- `nodejs-backend-patterns` (SSE, streaming, manejo de errores de API externa).
- `typescript-advanced-types` (schemas de validación tipados).

**Tests a diseñar (antes):**
1. **`__tests__/chat/tools/definitions.test.ts`**:
   - `validateToolArgs` acepta argumentos correctos para cada herramienta.
   - `validateToolArgs` rechaza argumentos inválidos y devuelve error + ejemplo.
   - Casos borde: `type1` solo acepta tipos válidos, `name` rechaza strings vacíos, `limit` entre 1 y 20.
2. **`__tests__/chat/tools/executor.test.ts`**:
   - `search_pokemon` llama a PokeAPI con query GraphQL correcta (mock).
   - `get_pokemon_info` llama a PokeAPI con query de detalle (mock).
   - `getToolResultForModel` formatea resultados correctamente.
3. **`__tests__/chat/api/oak-chat.test.ts`**:
   - POST a `/api/oak-chat` con mensajes válidos devuelve stream SSE.
   - El SSE contiene eventos `delta` para texto.
   - El SSE contiene eventos `done` al finalizar.
   - Errores de MiniMax se traducen a eventos `error`.
   - Rate limiting bloquea después de 10 requests.

**Tests a ejecutar (después):**
```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:run
```

**Criterios de aceptación:**
- [ ] `POST /api/oak-chat` devuelve `text/event-stream`.
- [ ] Bucle agente funciona: tool calls → ejecución → continuación.
- [ ] Stream incluye eventos `delta`, `reasoning`, `tool_start`, `tool_end`, `tool_error`, `pokedex_command`, `done`.
- [ ] Errores de validación de herramientas se devuelven al modelo con ejemplo correcto.
- [ ] Rate limiting funciona.
- [ ] API key NUNCA se expone al cliente (solo `process.env` en servidor).
- [ ] Tests unitarios pasan.
- [ ] Sin dependencias nuevas en `package.json`.

**Documentación:**
- No — esta fase no modifica README.md ni AGENTS.md.

**Revisión humana:**
- No — validado por tests unitarios.

**Variables de entorno nuevas:**
- `MINIMAX_API_KEY` en `.env.local` (ya existe el valor; solo formalizar en `.env.example`).
- Añadir a `.env.example`:
  ```
  # MiniMax M3 API key para el chat del Profesor Oak
  MINIMAX_API_KEY=sk-api-...
  ```

---

### Fase 11.3 — Componente de chat (UI)

**Objetivo:** construir los componentes visuales del chat: avatar animado, burbuja de conversación, mensajes, input expansible, loadings, y el provider de estado de sesión.

**Tareas:**

#### 11.3a — Provider de sesión (`OakChatProvider`)

- Crear `src/components/chat/OakChatContext.tsx`:
  - Estado: `messages[]`, `status` (`"idle" | "streaming" | "error"`), `isOpen`, `isExpanded`.
  - Cada mensaje: `{ id, role: "user" | "oak", content?: string, reasoning?: string, toolCalls?: { name, args, result?, error? }[], timestamp }`.
  - Función `sendMessage(text)`:
    1. Añade mensaje de usuario al array.
    2. Establece `status = "streaming"`.
    3. Crea `EventSource` o usa `fetch` con `ReadableStream` al endpoint `/api/oak-chat`.
    4. Procesa eventos SSE incrementalmente:
       - `delta` → añade tokens al mensaje Oak actual.
       - `reasoning` → añade al campo `reasoning` del mensaje Oak.
       - `tool_start` → añade tool call con estado "pending".
       - `tool_end` / `tool_error` → actualiza tool call con resultado.
       - `pokedex_command` → ejecuta comando (delega a `usePokedexCommand`).
       - `done` → `status = "idle"`.
       - `error` → `status = "error"`, marca último mensaje.
    5. Maneja cierre de stream y reconexión (no implementar retry — el usuario reenvía si falla).
  - El historial se guarda en `useRef` para evitar re-renders masivos en cada token.
  - Expone: `messages`, `status`, `isOpen`, `isExpanded`, `sendMessage`, `openChat`, `closeChat`, `clearChat`.

#### 11.3b — Avatar animado (`OakChatAvatar`)

- Crear `src/components/chat/OakChatAvatar.tsx`:
  - Renderiza `public/profesor_oak_chat.svg` en un círculo de 72×72px.
  - Animación de entrada (después de 3s de montado el componente):
    - Fase 1 (0–400ms): `scale(0) → scale(1.15)` con `cubic-bezier(0.34, 1.56, 0.64, 1)` (rebote).
    - Fase 2 (400–600ms): `scale(1.15) → scale(1)`.
    - Fase 3 (600–800ms): glow animation (box-shadow pulsante).
  - Usa `animation-delay: 3s` en CSS, no `setTimeout` en JS (mejor rendimiento, sin layout thrashing).
  - Al hacer click abre/cierra el chat (delega a `useOakChat()`).
  - Atributos de accesibilidad: `role="button"`, `aria-label="Abrir chat con el Profesor Oak"`, `tabIndex={0}`.

#### 11.3c — Burbuja de chat (`OakChatBubble`)

- Crear `src/components/chat/OakChatBubble.tsx`:
  - Contenedor flotante posicionado encima del avatar.
  - Dos estados visuales:
    - **Colapsado** (`isExpanded = false`): muestra el mensaje de bienvenida (1–2 líneas) + input de 1 línea.
    - **Expandido** (`isExpanded = true`): ventana completa de chat (ancho: 380px, alto: 480px).
  - Transición suave entre colapsado y expandido (300ms, ease-out).
  - Estructura interna:
    ```
    ┌─────────────────────────────┐
    │  Cabecera (nombre + cerrar) │
    ├─────────────────────────────┤
    │                             │
    │  Área de mensajes           │
    │  (scroll-y auto)            │
    │                             │
    │  · Burbuja Oak              │
    │  · Razonamiento             │
    │  · Tool call                │
    │  · Burbuja usuario          │
    │                             │
    ├─────────────────────────────┤
    │  Input expansible + botón   │
    └─────────────────────────────┘
      ▾ (pico de bocadillo)
    ```
  - El pico del bocadillo apunta hacia el avatar (CSS pseudo-elemento o triángulo SVG).
  - Animación de entrada del bocadillo: `opacity 0→1 + translateY(8px→0)` (350ms), se lanza después de que termine la animación del avatar.

#### 11.3d — Mensajes del chat

- **Burbuja de usuario** (`OakChatUserMessage`):
  - Fondo: `#2B7BFF` (azul moderno, distinto del azul oscuro de la Pokédex).
  - Texto blanco, alineado a la derecha.
  - Bordes redondeados (16px, esquina inferior derecha 4px).
  - Tipografía sans-serif, 14px.

- **Burbuja de Oak** (`OakChatAssistantMessage`):
  - Fondo: `#F0F4FF` (azul muy claro).
  - Texto oscuro (`#1A1A2E`), alineado a la izquierda.
  - Bordes redondeados (16px, esquina inferior izquierda 4px).
  - Muestra el avatar pequeño (24px) a la izquierda de cada burbuja.

- **Burbuja de razonamiento** (`OakChatReasoningBubble`):
  - Fondo: `#F5F5F0` (crema/gris cálido).
  - Texto en gris medio, itálica, 13px.
  - Icono de cerebro (lucide-react: `Brain`) a la izquierda.
  - Etiqueta "Razonando..." mientras está activo.
  - Colapsable: por defecto colapsado (solo se ve "Razonamiento"), click expande.
  - Transición suave al expandir/colapsar.

- **Burbuja de herramienta** (`OakChatToolBubble`):
  - Fondo: `#FFF8E1` (ámbar claro).
  - Texto pequeño (12px), muestra nombre de herramienta y argumentos.
  - Icono de herramienta (lucide-react: `Wrench`).
  - Estados visuales:
    - **En progreso**: spinner + "Ejecutando {nombre}..."
    - **Completada**: check verde + resumen del resultado.
    - **Error**: X roja + mensaje de error.
  - Colapsable igual que razonamiento.

- **Indicador de carga** (`OakChatLoading`):
  - Tres puntos animados (bounce) dentro de burbuja de Oak.
  - Se muestra cuando `status === "streaming"` y no hay tokens todavía.

#### 11.3e — Input expansible (`OakChatInput`)

- `<textarea>` con altura dinámica.
- Comportamiento:
  - Altura inicial: 40px (1 línea).
  - Crece automáticamente hasta `max-height: 120px` (≈5 líneas).
  - Scroll interno cuando alcanza el máximo.
  - `Enter` envía (sin `Shift`). `Shift+Enter` para nueva línea.
- Botón de envío integrado DENTRO del textarea (posicionado `absolute` en la esquina inferior derecha):
  - Icono: `Send` de lucide-react.
  - Aparece con fade cuando hay texto.
  - Se deshabilita durante streaming.
- Estilo:
  - Borde: 1px solid `#E0E0E0`.
  - Border-radius: 12px.
  - Fondo: blanco.
  - Padding derecho: 40px (espacio para el botón).
  - Tipografía sans-serif, 14px.

#### 11.3f — Estilos CSS

- Crear `src/components/chat/oak-chat.css`:
  - NO usar Tailwind para este componente (necesita estilos muy específicos de burbujas de chat).
  - Usar variables CSS locales para colores reutilizables.
  - Animaciones definidas como `@keyframes`:
    - `oak-avatar-enter`: scale bounce.
    - `oak-avatar-glow`: box-shadow pulso.
    - `oak-bubble-enter`: opacity + translateY.
    - `oak-dot-bounce`: loading dots.
  - Responsive: en viewports < 480px la burbuja ocupa 90vw y se centra en la parte inferior.
  - `prefers-reduced-motion`: todas las animaciones duran 0ms.
  - Scrollbar estilizada (thin, colores suaves).

**Skills recomendadas:**
- `frontend-design` (diseño del chat, burbujas, animaciones).
- `tailwind-css-patterns` (aunque usemos CSS vanilla para el chat, la integración con Tailwind es relevante para el posicionamiento).
- `accessibility` (roles, aria-labels, focus traps, reducción de movimiento).

**Tests a diseñar (antes):**
1. **`__tests__/chat/OakChatAvatar.test.tsx`**:
   - Renderiza el SVG del avatar.
   - Tiene `role="button"` y `aria-label`.
   - Al hacer click dispara `openChat`.
   - Respeta `prefers-reduced-motion` (animación instantánea).
2. **`__tests__/chat/OakChatBubble.test.tsx`**:
   - Estado colapsado: muestra bienvenida + input pequeño.
   - Estado expandido: muestra área de mensajes + input completo.
   - Transición CSS aplica clases correctas.
   - Pico de bocadillo renderiza.
3. **`__tests__/chat/OakChatInput.test.tsx`**:
   - Escribe texto y pulsa Enter → llama a `sendMessage`.
   - Shift+Enter inserta nueva línea.
   - Altura crece con el contenido (máx 120px).
   - Botón de envío visible cuando hay texto.
   - Botón deshabilitado durante streaming.
4. **`__tests__/chat/OakChatMessages.test.tsx`**:
   - Renderiza burbujas de usuario, Oak, razonamiento, herramienta.
   - Razonamiento se expande/colapsa al hacer click.
   - Herramienta muestra estado "en progreso", "completada", "error".
   - Loading dots visibles durante streaming.
5. **`__tests__/chat/OakChatProvider.test.tsx`**:
   - `sendMessage` añade mensaje de usuario y streaming.
   - Eventos SSE actualizan el mensaje de Oak incrementalmente.
   - `tool_start` / `tool_end` gestionan estado de herramientas.
   - `pokedex_command` dispara efecto en Pokédex.
   - Mensajes se acumulan en historial.
   - `clearChat` vacía el historial.

**Tests a ejecutar (después):**
```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:run
```

**Criterios de aceptación:**
- [ ] Avatar aparece con animación a los 3s de montar la Pokédex.
- [ ] Burbuja de chat muestra presentación de Oak al terminar animación.
- [ ] Input crece de 1 a 5 líneas automáticamente.
- [ ] Enviar mensaje muestra burbuja de usuario y respuesta de Oak.
- [ ] Razonamiento visible pero colapsable.
- [ ] Herramientas visibles con estados de progreso.
- [ ] Loading dots durante generación.
- [ ] Chat se expande al hacer focus en input.
- [ ] Botón de cierre colapsa el chat.
- [ ] Diseño sans-serif, moderno, acorde a científico.
- [ ] Accesibilidad: teclado navegable, aria-labels, reduced-motion.
- [ ] Tests unitarios pasan.

**Documentación:**
- No — el chat es una feature visual autocontenida.

**Revisión humana:**
- **SÍ** — el diseño visual del chat (colores, animaciones, tipografía) requiere validación humana. La revisión debe confirmar que el estilo es "dibujo animado moderno de científico" y no infantil.

---

### Fase 11.4 — Integración con la Pokédex (comandos cliente)

**Objetivo:** conectar las herramientas de IA que modifican la Pokédex (`apply_filters`, `show_pokemon`) con el estado real de la aplicación, incluyendo efectos visuales como escritura letra a letra en la consola de filtros.

**Tareas:**

#### 11.4a — Hook `usePokedexCommand`

- Crear `src/components/chat/usePokedexCommand.ts`:
  - Recibe eventos `pokedex_command` del stream SSE.
  - `apply_filters`:
    1. Usa `useFilters().setFilter()` para cada filtro recibido.
    2. Opcionalmente, marca la consola para que reproduzca la escritura del comando (ver 11.4b).
  - `show_pokemon`:
    1. Llama a `useAppShell().goToPokemon(name)`.
  - Maneja errores: si el nombre del pokemon no existe, muestra toast o mensaje en chat.

#### 11.4b — Efecto typewriter en la consola

- Extender `FilterConsoleSlot.tsx` o el `FilterConsole.tsx`:
  - Nuevo prop opcional: `externalCommand?: string`.
  - Cuando se recibe, la consola:
    1. Limpia la línea actual.
    2. Escribe el comando carácter a carácter (80ms por carácter, timing natural).
    3. Al terminar, ejecuta el comando (simula Enter).
  - Esto da feedback visual de que "Oak está usando la Pokédex".

#### 11.4c — Montaje del chat en la Pokédex

- Añadir `OakChatProvider` dentro de `PokedexOverlay.tsx`:
  ```tsx
  <FiltersProvider>
    <PokedexPageProvider>
      ...
      <OakChatProvider>
        <OakChat />
      </OakChatProvider>
    </PokedexPageProvider>
  </FiltersProvider>
  ```
  El chat necesita acceso a `useFilters` (de `FiltersProvider`) y `useAppShell` (de `AppShellProvider`), ambos disponibles en este nivel del árbol.

- `OakChat` (componente raíz):
  - Renderiza `<OakChatAvatar />` y `<OakChatBubble />`.
  - Posicionado `absolute bottom-4 right-4` dentro de `.pokedex-view`.
  - `z-index: 50` para flotar sobre la carcasa SVG.
  - Solo visible cuando `view === "pokedex"`.

**Skills recomendadas:**
- `vercel-composition-patterns` (integración con providers existentes, hooks compartidos).

**Tests a diseñar (antes):**
1. **`__tests__/chat/usePokedexCommand.test.ts`**:
   - `apply_filters` con `{ type1: "fire" }` llama a `setFilter("type1", "fire")`.
   - `apply_filters` con valor inválido muestra error.
   - `show_pokemon("pikachu")` llama a `goToPokemon("pikachu")`.
2. **`__tests__/chat/OakChat.integration.test.tsx`**:
   - Chat montado dentro de `PokedexOverlay` renderiza avatar.
   - Comando `show_pokemon` cambia `selectedName` en `PokedexPageContext`.
   - Comando `apply_filters` actualiza filtros y se refleja en URL.

**Tests a ejecutar (después):**
```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:run
```

**Criterios de aceptación:**
- [ ] La IA puede aplicar filtros (tipo, generación, hábitat) y se ven reflejados en la Pokédex.
- [ ] La IA puede mostrar un pokemon y se abre el carrusel.
- [ ] Typewriter en consola al aplicar filtros desde IA (opcional, nice-to-have).
- [ ] Chat se oculta/muestra correctamente con el estado `isOpen`.
- [ ] El scroll de la lista NO se ve afectado por el chat.
- [ ] Tests de integración pasan.

**Documentación:**
- No — esta fase no modifica documentación.

**Revisión humana:**
- No — validado por tests.

---

### Fase 11.5 — Testing end-to-end y pulido

**Objetivo:** verificar el flujo completo con tests e2e contra la API real de MiniMax (no mockeada), pulir interacciones y preparar para revisión humana.

**Tareas:**

#### 11.5a — Test e2e con API real

- Crear `e2e/oak-chat.spec.ts` marcado `@live-api`:
  - **Test 1**: El avatar aparece tras cargar `/pokedex`.
  - **Test 2**: Abrir chat, escribir "Hola" y verificar que Oak responde.
  - **Test 3**: Pedir "Muéstrame a Pikachu" y verificar que se abre el carrusel de Pikachu.
  - **Test 4**: Pedir "Filtra por tipo agua" y verificar que aparecen chips de filtro.
  - **Test 5**: Preguntar "¿Quién eres?" y verificar que responde como Profesor Oak.
  - **Test 6**: Mensajes de razonamiento y herramientas aparecen antes de la respuesta.

- **IMPORTANTE**: Este spec usa la API real de MiniMax. Debe tener `test.skip(!process.env.POKEAPI_REACHABLE)` y añadirse a `playwright.config.ts` con `@live-api`. NO mockear respuestas de MiniMax.

#### 11.5b — Pulido UX

- La burbuja de chat no debe tapar elementos críticos de la Pokédex en viewports pequeños.
- Scroll del área de mensajes hace auto-scroll al final al recibir nuevo contenido.
- Tooltip en el avatar: "Profesor Oak — ¿Necesitas ayuda?".
- Sonido sutil al recibir mensaje (opcional, usar el contexto de música existente).
- Animación de "escribiendo..." en input cuando el modelo está generando.
- El chat recuerda si estaba abierto al cambiar de pokemon (no se cierra).

#### 11.5c — Manejo de errores de red

- Si MiniMax API está caída → mostrar mensaje: "El Profesor Oak está descansando en su laboratorio. Vuelve a intentarlo en unos minutos."
- Timeout de stream → mensaje: "La conexión con el laboratorio es inestable..."
- Botón de reintentar en mensajes fallidos.

**Skills recomendadas:**
- `vercel-react-best-practices` (optimización de re-renders, memo).

**Tests a diseñar (antes):**
- No — fase de pulido.

**Tests a ejecutar (después):**
```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:run
# Solo si POKEAPI_REACHABLE está definido:
npm run test:e2e
```

**Criterios de aceptación:**
- [ ] Tests e2e pasan contra API real (cuando esté disponible).
- [ ] Scroll de mensajes sigue al final.
- [ ] Chat no tapa elementos críticos.
- [ ] Errores de red muestran mensajes amigables.
- [ ] Chat mantiene estado al navegar entre pokemons.
- [ ] Animaciones suaves, sin jank.
- [ ] Accesibilidad: teclado, lector de pantalla, reduced-motion.

**Documentación:**
- Añadir a `README.md` sección sobre el chat del Profesor Oak.
- Actualizar stack técnico en `plan/README.md` para incluir MiniMax M3.

**Revisión humana:**
- **SÍ** — revisión completa de la experiencia: tono de Oak, fluidez del chat, integración con la Pokédex, diseño visual.

---

## Resumen de fases

| Fase | Descripción | Revisión humana |
|---|---|---|
| 11.1 | Script de exploración MiniMax M3 | No |
| 11.2 | API Route de chat (SSE + agente) | No |
| 11.3 | Componentes UI del chat | **Sí** (diseño) |
| 11.4 | Integración con la Pokédex | No |
| 11.5 | Testing e2e y pulido | **Sí** (experiencia completa) |

## Estructura de archivos nuevos

```
scripts/
  test-minimax-api.ts                  # Fase 11.1

doc/
  minimax-api.md                       # Fase 11.1

src/app/api/oak-chat/
  route.ts                             # Fase 11.2

src/lib/chat/
  tools/
    definitions.ts                     # Fase 11.2
    executor.ts                        # Fase 11.2

src/components/chat/
  OakChat.tsx                          # Fase 11.4 (raíz)
  OakChatContext.tsx                   # Fase 11.3a
  OakChatAvatar.tsx                    # Fase 11.3b
  OakChatBubble.tsx                    # Fase 11.3c
  OakChatUserMessage.tsx              # Fase 11.3d
  OakChatAssistantMessage.tsx         # Fase 11.3d
  OakChatReasoningBubble.tsx          # Fase 11.3d
  OakChatToolBubble.tsx               # Fase 11.3d
  OakChatLoading.tsx                   # Fase 11.3d
  OakChatInput.tsx                     # Fase 11.3e
  usePokedexCommand.ts                # Fase 11.4a
  oak-chat.css                         # Fase 11.3f

__tests__/chat/
  tools/
    definitions.test.ts                # Fase 11.2
    executor.test.ts                   # Fase 11.2
  api/
    oak-chat.test.ts                   # Fase 11.2
  OakChatAvatar.test.tsx              # Fase 11.3
  OakChatBubble.test.tsx              # Fase 11.3
  OakChatInput.test.tsx               # Fase 11.3
  OakChatMessages.test.tsx            # Fase 11.3
  OakChatProvider.test.tsx            # Fase 11.3
  usePokedexCommand.test.ts           # Fase 11.4
  OakChat.integration.test.tsx         # Fase 11.4

e2e/
  oak-chat.spec.ts                     # Fase 11.5
```

## Variables de entorno nuevas

Añadir a `.env.example`:

```env
# MiniMax M3 API key para el chat del Profesor Oak (Plan 11)
# Formato: sk-api-...
MINIMAX_API_KEY=
```

En `.env.local` ya existe el valor (proporcionado en el borrador). **NUNCA** commitear `.env.local`.
