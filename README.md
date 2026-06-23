# Pokédex

Aplicación web construida con **Next.js 16**, **React 19**, **Tailwind CSS 4** y **TypeScript** para explorar el mundo de los Pokémon: tipos, generaciones, hábitats y más.

## Requisitos previos

- [Node.js](https://nodejs.org/) >= 18.18
- npm (incluido con Node.js)

## Primeros pasos

Instala las dependencias y arranca el servidor de desarrollo:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador para ver la aplicación.

## Variables de entorno

Copia `.env.example` a `.env.local` y ajusta los valores si lo necesitas.

| Variable | Descripción | Por defecto |
| -------- | ----------- | ----------- |
| `NEXT_PUBLIC_POKEAPI_GRAPHQL_URL` | Endpoint GraphQL de PokeAPI. Si está definida, servidor y navegador pegan directamente contra ella. Si está vacía, el servidor usa `https://graphql.pokeapi.co/v1beta2` y el navegador pasa por el proxy same-origin `/api/pokeapi` para evitar el bloqueo CORS. | (vacía) |
| `NEXT_PUBLIC_POKEAPI_USE_PROXY` | Solo relevante en navegador real. Si vale `"false"`, el navegador pega directo contra la URL anterior en vez de pasar por el proxy. Útil si el endpoint ya tiene CORS abierto. | `"true"` |

> `.env.local` está ignorado por git, así que cada desarrollador puede
> apuntar a su propio mirror o entorno de pruebas.

### Por qué hay un proxy `/api/pokeapi`

La PokeAPI GraphQL (`graphql.pokeapi.co`) **no devuelve
`Access-Control-Allow-Origin`** para orígenes arbitrarios, así que el
navegador bloquea con CORS cualquier `POST` desde `localhost:3000` o
desde el deploy en producción. Para resolver esto sin renunciar a la
caché de servidor de Next.js ni a la deduplicación de `React.cache`,
las llamadas del navegador pasan por `/api/pokeapi` (un Route Handler
en `src/app/api/pokeapi/route.ts`) que reenvía la query
server-to-server — donde no hay CORS. La caché de servidor (`next:
{ revalidate, tags }`) sigue aplicándose en el cliente a través del
propio proxy, así que no perdemos nada.

## Scripts disponibles

| Script                | Descripción                                                  |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Inicia el servidor de desarrollo                             |
| `npm run build`       | Genera la build de producción                                |
| `npm run start`       | Sirve la build de producción                                 |
| `npm run lint`        | Ejecuta ESLint                                               |
| `npx tsc --noEmit`    | Comprueba los tipos con TypeScript                           |

## Consola de filtros (Plan 07.1)

La consola de la Pokédex (slot `CONSOLA_FILTROS`) acepta comandos para
filtrar y buscar pokemons. Comparte estado con los dropdowns, el
buscador y la URL vía `useFilters()`, así que aplicar un filtro desde
la consola es indistinto de aplicarlo desde cualquier otra vista.

### Comandos disponibles

| Comando                          | Descripción                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| `help` · `ayuda` · `?`           | Muestra la lista de comandos y filtros.                           |
| `filtro` · `filtros` · `filters` | Lista los filtros disponibles y el nº de opciones de cada uno.   |
| `options <filtro>` · `opciones`  | Lista las opciones del filtro (carga asíncrona).                  |
| `<filtro> <valor>`               | Aplica un filtro (alias español o inglés según el filtro).        |
| `resumen` · `summary` · `estado` | Muestra los filtros aplicados actualmente.                        |
| `quitar <filtro>` · `remove`     | Elimina el filtro indicado.                                       |
| `clear` · `reset-filtros`        | Quita TODOS los filtros.                                          |
| `limpiar` · `cls`                | Limpia la pantalla (no afecta a los filtros).                     |
| `<texto>` · `buscar <texto>`     | Búsqueda libre (multi-palabra, insensible a mayúsculas/acentos). |

### Filtros

| Alias (ES)        | Alias (EN)  | Notas                                             |
| ----------------- | ----------- | ------------------------------------------------- |
| `tipo1`, `t1`     | `type1`     | Tipo principal (Fuego, Agua, …)                   |
| `tipo2`, `t2`     | `type2`     | Tipo secundario                                   |
| `generación`,`gen`| `generation`| `generation-i` … `generation-ix`                  |
| `color`           | `color`     | rojo, azul, …                                     |
| `hábitat`         | `habitat`   | acepta `bosque` o `forest`                        |
| `habilidad`       | `ability`   | nombre en inglés (`overgrow`, `blaze`, …)         |
| `altura`          | `height`    | buckets `xs`/`s`/… o rango libre `min-max`        |
| `peso`            | `weight`    | idem altura                                       |
| `búsqueda`        | `search`    | texto libre multi-palabra                         |

### Ejemplos

```text
> help
> tipo1 fuego
> habitat forest
> altura 0-1
> Charman Pika            (búsqueda multi-palabra)
> options generation
> quitar tipo1
> resumen
> clear
```

Si un comando o valor no encaja, la consola sugiere `help` o
`options <filtro>` automáticamente. El historial de comandos se
recorre con las flechas arriba/abajo.

## Testing

El proyecto usa **Vitest** para tests unitarios y **Playwright** para tests end-to-end.

```bash
# Tests unitarios (jsdom + Testing Library)
npm run test           # modo watch
npm run test:run       # una sola ejecución

# Tests end-to-end (Playwright levanta el servidor dev automáticamente)
npm run test:e2e
npm run test:e2e:ui    # inspector interactivo
```

- Tests unitarios en `__tests__/`.
- Tests e2e en `e2e/`.

## Estructura del proyecto

```text
.
├── src/
│   ├── app/              # App Router de Next.js
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── not-found.tsx
│   │   ├── pokedex/page.tsx
│   │   └── pokemon/[name]/page.tsx
│   ├── components/   # Componentes React reutilizables
│   ├── hooks/        # Hooks personalizados
│   ├── lib/          # Lógica, constantes y tipos
│   │   ├── constants/
│   │   └── types/
│   └── styles/       # Estilos adicionales
├── public/           # Assets estáticos (favicon, fuentes, hábitats, imágenes)
├── __tests__/        # Tests unitarios (Vitest)
├── e2e/              # Tests end-to-end (Playwright)
├── doc/              # Documentación de referencia (PokeAPI). No se commitea.
└── plan/             # Planes de desarrollo por fases
```

> `src/lib/constants/` es la **única fuente de verdad** para colores por tipo/generación y constantes compartidas.

## Rutas

| Ruta | Descripción |
| ---- | ----------- |
| `/` | Página de inicio. |
| `/pokedex` | Pokédex con lista y filtros (filtros vía `searchParams`). |
| `/pokemon/[name]` | Ficha de un pokemon (nombre amigable, no id). |
| `*` | Página 404 personalizada. |

## Pantalla de inicio — controles

La pantalla de inicio (`/`) navega a `/pokedex` desde varios puntos
de entrada, todos centralizados en
`src/components/home/HomeNavigationContext.tsx` para evitar dobles
navegaciones y mostrar el overlay de carga si la transición tarda.

| Acción | Resultado |
| ------ | --------- |
| **Enter** o **Space** | Navega a `/pokedex`. |
| Cualquier **letra A–Z** | Navega a `/pokedex` (estilo arcade del borrador). |
| **Click** en una zona neutra del fondo (logo, ash, slider, pokedex cerrada) | Navega a `/pokedex`. |
| **Click** en el botón **PRESS START** | Navega a `/pokedex` (es un `<Link>` de Next.js con prefetch). |
| **Click** en el botón de sonido | Solo activa/desactiva la música; **no** navega. |
| Teclas `Tab`, `Shift`, `Ctrl`, `F1`, números… | **No** navegan. |

Notas:

- El estado "música activa" lo expone `SoundMusicProvider`
  (`src/components/home/SoundMusicContext.tsx`) para que el Plan 04
  (transiciones a `/pokedex`) pueda hacer fade-out antes de cambiar
  de página.
- Mientras la navegación no haya completado y tarde más de lo
  habitual, se muestra el gif `public/loading-pikachu.gif` con el
  texto "CARGANDO…" en `Press Start 2P` (gestionado por
  `src/components/home/HomeLoadingOverlay.tsx`).
