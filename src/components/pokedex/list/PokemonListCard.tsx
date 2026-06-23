"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type {
  Generation,
  Habitat,
  PokemonListItem,
} from "@/src/lib/types/pokemon";
import {
  POKEMON_TYPE_COLORS,
  POKEMON_TYPE_LABELS,
} from "@/src/lib/constants/pokemonTypes";
import { POKEMON_GENERATION_COLORS } from "@/src/lib/constants/pokemonGenerations";
import { BASE_COLORS } from "@/src/lib/constants/colors";

/**
 * Plan 06.2 — `PokemonListCard`: card individual de la lista
 * virtualizada (`PokemonList`).
 *
 * Layout (mobile-first; el slot ya impone las proporciones finales):
 *
 *  ┌──────────────────────────────────────────────┐
 *  │ CHARIZARD                                   │
 *  │ [fire] [flying]                  [montaña]  │
 *  │                                  [gen-i]    │
 *  │                                   ┌────────┐│
 *  │                                   │ sprite ││
 *  │                                   └────────┘│
 *  └──────────────────────────────────────────────┘
 *
 * - Nombre grande a la izquierda (PressStart2P, color oscuro).
 * - Chips de tipo1/tipo2 debajo del nombre, con los colores del
 *   `POKEMON_TYPE_COLORS` (única fuente de verdad, ver AGENTS.md).
 * - A la derecha: chips de hábitat y generación con sus colores.
 * - Miniatura (`next/image`, `pokemon_v2_pokemonsprites.front_default`)
 *   a la derecha, ocupando todo el alto.
 * - Card = `<button>` accesible (Plan 06.1 + skill accessibility).
 *
 * Sin emojis: el proyecto los prohíbe en todo el código (AGENTS.md).
 */

const HABITAT_LABELS: Record<Habitat, string> = {
  caverna: "caverna",
  bosque: "bosque",
  pradera: "pradera",
  campo: "campo",
  montana: "montaña",
  agua_dulce: "agua dulce",
  agua_salada: "agua salada",
  ciudad: "ciudad",
  raro: "raro",
  generico: "genérico",
};

const GENERATION_LABELS: Record<Generation, string> = {
  "generation-i": "gen I",
  "generation-ii": "gen II",
  "generation-iii": "gen III",
  "generation-iv": "gen IV",
  "generation-v": "gen V",
  "generation-vi": "gen VI",
  "generation-vii": "gen VII",
  "generation-viii": "gen VIII",
  "generation-ix": "gen IX",
};

export interface PokemonListCardProps {
  item: PokemonListItem;
  /** Índice 1-based para construir un `aria-label` estable. */
  index: number;
  /** Handler al pulsar la card. Si no se pasa, la card no es interactiva. */
  onSelect?(name: string): void;
  /** Nombre del pokemon actualmente seleccionado (para destacar). */
  selectedName?: string | null;
}

export function PokemonListCard({
  item,
  index,
  onSelect,
  selectedName,
}: PokemonListCardProps) {
  const isSelected = selectedName === item.name;
  const type1 = item.types.find((t) => t.slot === 1);
  const type2 = item.types.find((t) => t.slot === 2);

  return (
    <button
      type="button"
      data-testid="pokemon-list-card"
      data-pokemon={item.name}
      data-selected={isSelected ? "true" : "false"}
      aria-label={`${item.name}, posición ${index}`}
      onClick={onSelect ? () => onSelect(item.name) : undefined}
      className="pokemon-list-card group"
    >
      <span className="pokemon-list-card__name">{item.name}</span>

      <span className="pokemon-list-card__chips pokemon-list-card__chips--types">
        {type1 ? <TypeChip type={type1.name} /> : null}
        {type2 ? <TypeChip type={type2.name} /> : null}
      </span>

      <span className="pokemon-list-card__chips pokemon-list-card__chips--meta">
        {item.habitat ? <HabitatChip habitat={item.habitat} /> : null}
        {item.generation ? <GenerationChip generation={item.generation} /> : null}
      </span>

      {item.spriteFront ? (
        <span className="pokemon-list-card__sprite">
          <Image
            src={item.spriteFront}
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            unoptimized
            className="h-full w-full object-contain"
          />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="pokemon-list-card__sprite pokemon-list-card__sprite--fallback"
        />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------------- *
 * Chips
 * ------------------------------------------------------------------------- */

interface TypeChipProps {
  type: PokemonListItem["types"][number]["name"];
}

function TypeChip({ type }: TypeChipProps) {
  const palette = POKEMON_TYPE_COLORS[type] ?? POKEMON_TYPE_COLORS.default;
  return (
    <Chip
      testIdSuffix={`type-${type}`}
      label={POKEMON_TYPE_LABELS[type] ?? type}
      bg={palette.bg}
      border={palette.border}
      text={palette.text}
    />
  );
}

interface HabitatChipProps {
  habitat: Habitat;
}

function HabitatChip({ habitat }: HabitatChipProps) {
  return (
    <Chip
      testIdSuffix="habitat"
      label={HABITAT_LABELS[habitat]}
      bg={BASE_COLORS.cyanButton.dark}
      border={BASE_COLORS.cyanButton.light}
      text="#FFFFFF"
    />
  );
}

interface GenerationChipProps {
  generation: Generation;
}

function GenerationChip({ generation }: GenerationChipProps) {
  const palette =
    POKEMON_GENERATION_COLORS[generation] ?? POKEMON_GENERATION_COLORS.default;
  return (
    <Chip
      testIdSuffix="generation"
      label={GENERATION_LABELS[generation]}
      bg={palette.bg}
      border={palette.border}
      text={palette.text}
    />
  );
}

interface ChipProps {
  testIdSuffix: string;
  label: string;
  bg: string;
  border: string;
  text: string;
}

function Chip({ testIdSuffix, label, bg, border, text }: ChipProps) {
  const style: CSSProperties = {
    backgroundColor: bg,
    borderColor: border,
    color: text,
  };
  return (
    <span
      data-testid="pokemon-list-card-chip"
      data-chip={testIdSuffix}
      style={style}
      className="pokemon-list-card__chip"
    >
      {label}
    </span>
  );
}