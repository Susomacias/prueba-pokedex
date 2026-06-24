import {
  GENERATIONS,
  HABITATS,
  POKEMON_TYPES,
} from "@/src/lib/types/pokemon";

export const TOOL_NAMES = [
  "search_pokemon",
  "get_pokemon_info",
  "get_oak_info",
  "apply_filters",
  "show_pokemon",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolDefinition {
  type: "function";
  function: FunctionDefinition;
}

function typeEnum(): ReadonlyArray<string> {
  return POKEMON_TYPES as unknown as ReadonlyArray<string>;
}

function generationEnum(): ReadonlyArray<string> {
  return GENERATIONS as unknown as ReadonlyArray<string>;
}

function habitatEnum(): ReadonlyArray<string> {
  return HABITATS as unknown as ReadonlyArray<string>;
}

export const TOOL_DEFINITIONS: ReadonlyArray<ToolDefinition> = [
  {
    type: "function",
    function: {
      name: "search_pokemon",
      description:
        "Busca pokémons en la Pokédex por nombre, tipo, generación o hábitat. " +
        "Devuelve una lista con los nombres, tipos y datos básicos de los pokémons encontrados.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Nombre del pokémon (parcial o completo, ej. 'char' encuentra Charmander, Charmeleon, Charizard)",
          },
          type: {
            type: "string",
            description: "Tipo de pokémon (ej. 'fire', 'water', 'grass', 'electric')",
            enum: typeEnum(),
          },
          generation: {
            type: "string",
            description:
              "Generación del pokémon (ej. 'generation-i', 'generation-ii')",
            enum: generationEnum(),
          },
          habitat: {
            type: "string",
            description:
              "Hábitat del pokémon (ej. 'bosque', 'caverna', 'agua_dulce', 'ciudad')",
            enum: habitatEnum(),
          },
          limit: {
            type: "integer",
            description: "Número máximo de resultados (1-20). Por defecto 5.",
            minimum: 1,
            maximum: 20,
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pokemon_info",
      description:
        "Obtiene la ficha completa de un pokémon: tipos, estadísticas, habilidades, " +
        "descripción, evoluciones, altura, peso y más. Usa el nombre exacto en inglés.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Nombre exacto del pokémon en inglés (ej. 'pikachu', 'charizard', 'eevee')",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_oak_info",
      description:
        "Consulta información sobre el Profesor Oak, su laboratorio, historia " +
        "y datos relevantes del personaje. Útil cuando el usuario pregunta " +
        "sobre el propio Oak o su trasfondo.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Término de búsqueda opcional sobre el Profesor Oak " +
              "(ej. 'laboratorio', 'anime', 'investigación'). Déjalo vacío para info general.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_filters",
      description:
        "Aplica filtros en la Pokédex para que el usuario vea solo los pokémons " +
        "que coinciden. Los filtros se combinan (AND). Usa esta herramienta cuando " +
        "el usuario pida 'filtrar por tipo fuego', 'mostrar solo los de Kanto', etc.",
      parameters: {
        type: "object",
        properties: {
          type1: {
            type: "string",
            description: "Tipo principal del pokémon (ej. 'fire', 'water')",
            enum: typeEnum(),
          },
          type2: {
            type: "string",
            description: "Tipo secundario del pokémon (ej. 'flying', 'ground')",
            enum: typeEnum(),
          },
          generation: {
            type: "string",
            description:
              "Generación del pokémon (ej. 'generation-i' para Kanto)",
            enum: generationEnum(),
          },
          habitat: {
            type: "string",
            description:
              "Hábitat del pokémon (ej. 'bosque', 'caverna', 'ciudad')",
            enum: habitatEnum(),
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_pokemon",
      description:
        "Muestra la ficha detallada de un pokémon específico en la Pokédex. " +
        "Usa esta herramienta cuando el usuario pida ver un pokémon concreto.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Nombre exacto del pokémon en inglés (ej. 'pikachu', 'mewtwo')",
          },
        },
        required: ["name"],
      },
    },
  },
];

interface ValidationOk {
  valid: true;
}

interface ValidationError {
  valid: false;
  error: string;
  example: Record<string, unknown>;
}

type ValidationResult = ValidationOk | ValidationError;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validType(v: unknown): boolean {
  return typeof v === "string" && (typeEnum() as ReadonlyArray<string>).includes(v);
}

function validGeneration(v: unknown): boolean {
  return (
    typeof v === "string" &&
    (generationEnum() as ReadonlyArray<string>).includes(v)
  );
}

function validHabitat(v: unknown): boolean {
  return (
    typeof v === "string" && (habitatEnum() as ReadonlyArray<string>).includes(v)
  );
}

function validIntegerInRange(v: unknown, min: number, max: number): boolean {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= min &&
    v <= max
  );
}

export function validateToolArgs(
  name: string,
  args: Record<string, unknown>,
): ValidationResult {
  switch (name) {
    case "search_pokemon": {
      const problems: string[] = [];
      if (args.name !== undefined) {
        if (args.name === "" || !(typeof args.name === "string" && args.name.length > 0)) {
          problems.push("'name' debe ser un string no vacío");
        } else if (typeof args.name !== "string") {
          problems.push("'name' debe ser un string");
        }
      }
      if (args.type !== undefined) {
        if (!validType(args.type)) {
          problems.push(
            `'type' debe ser uno de: ${(typeEnum() as ReadonlyArray<string>).join(", ")}`,
          );
        }
      }
      if (args.generation !== undefined) {
        if (!validGeneration(args.generation)) {
          problems.push(
            `'generation' debe ser uno de: ${(generationEnum() as ReadonlyArray<string>).join(", ")}`,
          );
        }
      }
      if (args.habitat !== undefined) {
        if (!validHabitat(args.habitat)) {
          problems.push(
            `'habitat' debe ser uno de: ${(habitatEnum() as ReadonlyArray<string>).join(", ")}`,
          );
        }
      }
      if (args.limit !== undefined) {
        if (!validIntegerInRange(args.limit, 1, 20)) {
          problems.push("'limit' debe ser un entero entre 1 y 20");
        }
      }
      if (problems.length > 0) {
        return {
          valid: false,
          error: problems.join("; "),
          example: { name: "pikachu", limit: 5 },
        };
      }
      return { valid: true };
    }

    case "get_pokemon_info": {
      if (!isNonEmptyString(args.name)) {
        return {
          valid: false,
          error:
            "'name' es obligatorio y debe ser un string no vacío con el nombre del pokémon en inglés",
          example: { name: "pikachu" },
        };
      }
      return { valid: true };
    }

    case "get_oak_info": {
      if (args.query !== undefined) {
        if (!isNonEmptyString(args.query)) {
          return {
            valid: false,
            error:
              "'query' debe ser un string no vacío o no enviarse",
            example: { query: "laboratorio" },
          };
        }
      }
      return { valid: true };
    }

    case "apply_filters": {
      const problems: string[] = [];
      if (args.type1 !== undefined && !validType(args.type1)) {
        problems.push(
          `'type1' debe ser uno de: ${(typeEnum() as ReadonlyArray<string>).join(", ")}`,
        );
      }
      if (args.type2 !== undefined && !validType(args.type2)) {
        problems.push(
          `'type2' debe ser uno de: ${(typeEnum() as ReadonlyArray<string>).join(", ")}`,
        );
      }
      if (args.generation !== undefined && !validGeneration(args.generation)) {
        problems.push(
          `'generation' debe ser uno de: ${(generationEnum() as ReadonlyArray<string>).join(", ")}`,
        );
      }
      if (args.habitat !== undefined && !validHabitat(args.habitat)) {
        problems.push(
          `'habitat' debe ser uno de: ${(habitatEnum() as ReadonlyArray<string>).join(", ")}`,
        );
      }
      if (problems.length > 0) {
        return {
          valid: false,
          error: problems.join("; "),
          example: { type1: "fire", generation: "generation-i" },
        };
      }
      return { valid: true };
    }

    case "show_pokemon": {
      if (!isNonEmptyString(args.name)) {
        return {
          valid: false,
          error:
            "'name' es obligatorio y debe ser un string no vacío con el nombre del pokémon en inglés",
          example: { name: "pikachu" },
        };
      }
      return { valid: true };
    }

    default: {
      return {
        valid: false,
        error: `Herramienta desconocida: '${name}'. Las herramientas disponibles son: ${TOOL_NAMES.join(", ")}`,
        example: { name: "search_pokemon", args: {} },
      };
    }
  }
}
