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
| `NEXT_PUBLIC_POKEAPI_GRAPHQL_URL` | Endpoint GraphQL de PokeAPI. El cliente (`src/lib/graphql/client.ts`) lo lee para ejecutar las queries de la capa de datos. | `https://beta.pokeapi.co/graphql/v1beta` |

> `.env.local` está ignorado por git, así que cada desarrollador puede
> apuntar a su propio mirror o entorno de pruebas.

## Scripts disponibles

| Script                | Descripción                                                  |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Inicia el servidor de desarrollo                             |
| `npm run build`       | Genera la build de producción                                |
| `npm run start`       | Sirve la build de producción                                 |
| `npm run lint`        | Ejecuta ESLint                                               |
| `npx tsc --noEmit`    | Comprueba los tipos con TypeScript                           |

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
