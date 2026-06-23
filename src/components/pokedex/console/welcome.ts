import type { HelpLine } from "./consoleExecutor";

/**
 * Mensaje de bienvenida de la consola (Plan 07.1).
 *
 * Lo emite el Profesor Oak en español, con un tono alegre y
 * entusiasta, al iniciar la terminal. El diseño imita una terminal
 * retro (ASCII art de una pokébola + líneas con tono). La última
 * línea siempre sugiere usar `help`.
 */

const POKEBALL_ASCII = String.raw`
    ⡏⠉⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣿
    ⣿⠀⠀⠀⠈⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠛⠉⠁⠀⣿
    ⣿⣧⡀⠀⠀⠀⠀⠙⠿⠿⠿⠻⠿⠿⠟⠿⠛⠉⠀⠀⠀⠀⠀⣸⣿
    ⣿⣿⣷⣄⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿
    ⣿⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⣴⣿⣿⣿⣿
    ⣿⣿⣿⡟⠀⠀⢰⣹⡆⠀⠀⠀⠀⠀⠀⣭⣷⠀⠀⠀⠸⣿⣿⣿⣿
    ⣿⣿⣿⠃⠀⠀⠈⠉⠀⠀⠤⠄⠀⠀⠀⠉⠁⠀⠀⠀⠀⢿⣿⣿⣿
    ⣿⣿⣿⢾⣿⣷⠀⠀⠀⠀⡠⠤⢄⠀⠀⠀⠠⣿⣿⣷⠀⢸⣿⣿⣿
    ⣿⣿⣿⡀⠉⠀⠀⠀⠀⠀⢄⠀⢀⠀⠀⠀⠀⠉⠉⠁⠀⠀⣿⣿⣿
    ⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿
    ⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿`;

export const WELCOME_LINES: readonly HelpLine[] = [
  { text: POKEBALL_ASCII, tone: "accent" },
  { text: "", tone: "normal" },
  { text: "¡Hola! ¡Bienvenido a la Pokédex!", tone: "accent" },
  { text: "", tone: "normal" },
  { text: "", tone: "normal" },
  {
    text: "¡Aquí podrás buscar y filtrar a TODOS los Pokémon conocidos!",
    tone: "normal",
  },
  { text: "", tone: "normal" },
  { text: "", tone: "normal" },
  {
    text: "Escribe el nombre de un Pokémon, un tipo, una generación...",
    tone: "normal",
  },
  {
    text: "",
    tone: "normal",
  },
  { text: "", tone: "normal" },
  {
    text: "💡 Para empezar, escribe  help y pulsa Enter.",
    tone: "accent",
  },
  { text: "", tone: "normal" },
];
