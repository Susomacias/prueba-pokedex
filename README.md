<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/pagina_inicio/logo.svg">
    <img alt="Pokédex Logo" src="public/pagina_inicio/logo.svg" width="320">
  </picture>
</p>

<h1 align="center">Pokédex Virtual</h1>

<p align="center">
  Simulador interactivo de Pokédex con explorador 3D, filtros dinámicos,<br>
  terminal de comandos y agente de IA del Profesor Oak.
</p>

---

## ▶ Ver online — Render.com

<h3 align="center">
  <a href="https://prueba-pokedex.onrender.com">https://prueba-pokedex.onrender.com</a>
</h3>

> **Aviso:** Render.com en su plan gratuito **duerme el servicio tras 15 minutos de inactividad**. El primer arranque puede tardar **~50 segundos** en despertar. Una vez activo, la navegación es instantánea.

---

## Funcionalidades

| | |
|---|---|
| **Pantalla de inicio** | Animación arcade con botón PRESS START y control de música |
| **Pokédex virtual** | Simulador interactivo con diseño inspirado en la Pokédex clásica |
| **Ficha de Pokémon** | Datos completos: tipos, stats, habilidades, evoluciones, sonido |
| **Visor 3D** | Modelo tridimensional rotable con fondo del hábitat del Pokémon |
| **Lista infinita** | Scroll infinito con carga progresiva de cientos de Pokémon |
| **Filtros dinámicos** | Por tipo, generación, color, hábitat, habilidad, altura y peso |
| **Buscador** | Búsqueda libre multi-palabra, insensible a acentos |
| **Terminal de comandos** | Simulador de consola integrado — escribe `help` para ver comandos |
| **Profesor Oak (IA)** | Agente conversacional que maneja la Pokédex por voz/texto |
| **Diseño responsive** | Carcasa vertical en móvil, horizontal en escritorio |

---

## Arranque rápido

### Docker

```bash
docker build -t pokedex .
docker run -p 3000:3000 pokedex
```

Abre [http://localhost:3000](http://localhost:3000).

### Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Producción local

```bash
npm install
npm run build
npm start
```

---

## Variables de entorno

Copia `.env.example` a `.env.local`:

| Variable | Descripción | Default |
|---|---|---|
| `NEXT_PUBLIC_POKEAPI_GRAPHQL_URL` | Endpoint GraphQL de PokeAPI | `https://beta.pokeapi.co/graphql/v1beta` |
| `NEXT_PUBLIC_POKEAPI_USE_PROXY` | Usar proxy same-origin para CORS | `true` |
| `MINIMAX_API_KEY` | API key de MiniMax M3 para el chat del Profesor Oak | *(no incluida)* |

> **El chat de IA requiere `MINIMAX_API_KEY`.** Por seguridad no está incluida en el repo. Solicítamela si necesitas lanzar el proyecto completo en local.

---

## Decisiones de diseño

- **Estilo videojuego / cartoon** sobre ergonomía empresarial. Se sacrificó parte de la usabilidad convencional en favor de una experiencia visual a medio camino entre un juego portátil y la serie animada.
- **Pokédex reconocible pero no idéntica.** Se adaptó el diseño original de la serie por motivos de usabilidad, manteniendo el espíritu del dispositivo.
- **Features extra más allá del enunciado.** El requisito era «Lúcete porque la prueba es demasiado básica». Se añadieron:
  - Filtros dinámicos con sincronización URL
  - Terminal de comandos integrada en la consola
  - Visor 3D con rotación y fondo contextual
  - Agente de IA capaz de mostrar resultados en la Pokédex
- Diseño 100% responsive con carcasa adaptativa (vertical/horizontal).

---

## Decisiones técnicas

- **GraphQL de PokeAPI** (`beta.pokeapi.co/graphql/v1beta`) para filtrado eficiente server-side en lugar de la API REST tradicional.
- **Stack por defecto de Next.js** con los añadidos clave:

| Dependencia | Uso |
|---|---|
| `next` 16 + `react` 19 | App Router, RSC, streaming, Server Actions |
| `tailwindcss` 4 | Utility-first CSS |
| `three` 0.184 | Visor 3D de Pokémon |
| `lucide-react` | Iconografía |
| `react-markdown` + `remark-gfm` | Renderizado de respuestas del chat IA |
| `vitest` + `@testing-library/react` + `jsdom` | Tests unitarios |
| `@playwright/test` | Tests end-to-end |

- **IA:** MiniMax M3 por su capacidad agéntica (function calling) y buena relación capacidad/precio para orquestar acciones sobre la Pokédex.
- **Testing:** Unit tests con Vitest + Testing Library sobre fixtures reales de PokeAPI. Tests E2E con Playwright para navegación, filtros bidireccionales y viewport responsive.

---

## Uso de IA y stack de desarrollo

### Planificación

1. **Borrador inicial** lanzado a la IA con la instrucción de generar planes y fases.
2. **Revisión y pulido manual** de los planes resultantes.
3. Cada fase se ejecutó con el **loop de ingeniería**:

```
Fase del plan → Diseño de tests → Revisión humana → Implementación → Ejecutar tests
                                                                          ↓
                                                              ¿Pasan? ──→ Revisión humana + test en navegador → Cierre
                                                                  │
                                                              ¿No pasan? → Corrección de código → Loop
```

### Modelos utilizados

| Modelo | Rol |
|---|---|
| **DeepSeek V4 Pro** | Planificación de arquitectura, detección de bugs persistentes, resolución de issues específicas de Next.js |
| **MiniMax M3** | Ejecución de planes, generación de código, function calling del agente IA |

### Herramientas

- **[OpenCode Desktop](https://opencode.ai)** — Spec-driven development con agents autónomos
- **Agent Skills** — Buenas prácticas para Next.js, React y TypeScript inyectadas como reglas de comportamiento
- **Visual Studio Code** — Supervisión y revisión humana del código generado

---

## Comandos disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm start            # Servir build de producción
npm run lint         # ESLint
npm run test:run     # Tests unitarios (Vitest)
npm run test:e2e     # Tests end-to-end (Playwright)
npx tsc --noEmit     # Comprobación de tipos
```

---

## Terminal de comandos

La consola integrada en la Pokédex acepta comandos para filtrar y buscar. Escribe `help` para ver todos los comandos disponibles.

| Comando | Descripción |
|---|---|
| `help` / `ayuda` / `?` | Lista de comandos |
| `tipo1 fuego` / `t1 fuego` | Filtrar por tipo principal |
| `tipo2 veneno` | Filtrar por tipo secundario |
| `generación i` / `gen i` | Filtrar por generación |
| `color azul` | Filtrar por color |
| `hábitat bosque` | Filtrar por hábitat |
| `habilidad overgrow` | Filtrar por habilidad |
| `altura 0-1` | Filtrar por rango de altura |
| `peso 0-10` | Filtrar por rango de peso |
| `Pika Char` | Búsqueda libre multi-palabra |
| `resumen` / `estado` | Ver filtros aplicados |
| `quitar tipo1` | Eliminar filtro |
| `clear` / `reset-filtros` | Quitar todos los filtros |
| `limpiar` / `cls` | Limpiar pantalla |

El historial de comandos se recorre con flechas **arriba/abajo**.

---

## Estructura del proyecto

```text
src/
├── app/                  # App Router (Next.js)
│   ├── api/pokeapi/      # Proxy GraphQL
│   ├── pokedex/          # Ruta /pokedex
│   └── pokemon/[name]/   # Ruta /pokemon/<name>
├── components/
│   ├── filters/          # Consola, dropdowns, buscador
│   ├── home/             # Pantalla de inicio, música
│   ├── pokedex/          # Carcasa, slots, overlay, lista
│   └── ui/               # Componentes compartidos
├── hooks/                # useFilters, useAppShell, useViewportLayout
├── lib/
│   ├── constants/        # Colores, tipos, generaciones
│   ├── filters/          # Serialización URL, comandos de consola
│   ├── graphql/          # Cliente GraphQL, queries
│   └── pokemon/          # API cacheada, estrategia de caché
public/                   # SVGs, hábitats, fuentes, assets
__tests__/                # Tests unitarios (Vitest)
e2e/                      # Tests end-to-end (Playwright)
plan/                     # Planes de desarrollo por fases
```
