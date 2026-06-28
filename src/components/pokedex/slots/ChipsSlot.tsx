"use client";

import { useMemo } from "react";
import { buildSlotAttrs, type SlotStubProps } from "./types";
import { useCarousel } from "../carousel/CarouselController";
import { useViewportLayout } from "@/src/hooks/useViewportLayout";
import { BASE_COLORS } from "@/src/lib/constants/colors";
import { POKEMON_TYPE_COLORS, POKEMON_TYPE_LABELS } from "@/src/lib/constants/pokemonTypes";
import { POKEMON_GENERATION_COLORS, GEN_ROMAN } from "@/src/lib/constants/pokemonGenerations";
import type { Generation, PokemonType, ColorSet, PokemonTypeRef } from "@/src/lib/types/pokemon";

function genLabel(g: Generation|null) { return g ? `Gen-${GEN_ROMAN[g]??"?"}` : "Gen-?"; }
function genColors(g: Generation|null) {
  if (!g || !(g in POKEMON_GENERATION_COLORS)) return POKEMON_GENERATION_COLORS.default;
  return POKEMON_GENERATION_COLORS[g as keyof typeof POKEMON_GENERATION_COLORS] as ColorSet;
}
function typeColors(t: PokemonType): ColorSet {
  return (t in POKEMON_TYPE_COLORS) ? POKEMON_TYPE_COLORS[t] : POKEMON_TYPE_COLORS.default;
}
function typeLabel(t: PokemonType) { return POKEMON_TYPE_LABELS[t] ?? t; }

function Chip({ data, colors, label, small }: { data: string; colors: ColorSet; label: string; small?: boolean }) {
  return (
    <span data-chip={data} className="pokemon-chip" style={{
      display:"inline-flex",alignItems:"center",justifyContent:"center",
      backgroundColor:colors.bg,border:`2px solid ${colors.border}`,color:colors.text,
      borderRadius:"4px",padding:label? (small?"1px 4px":"2px 6px") : "2px 3px",
      fontSize:label? (small?"10px":"13px") : "10px",fontWeight:700,textTransform:"uppercase",
      whiteSpace:"nowrap",lineHeight:1.2,
      minWidth:label?undefined:"24px",minHeight:label?undefined:"16px",
      boxSizing:"border-box",flexShrink:0,
    }}>
      {label||"\u00A0"}
    </span>
  );
}

function useCarouselSafe() { try { return useCarousel(); } catch { return null; } }

const EMPTY_CHIP_COLORS: Record<string, ColorSet> = {
  type1:{bg:BASE_COLORS.garnet.dark,border:BASE_COLORS.garnet.light,text:"#FFFFFF"},
  type2:{bg:BASE_COLORS.yellowOrange.dark,border:BASE_COLORS.yellowOrange.light,text:"#FFFFFF"},
  generation:{bg:BASE_COLORS.green.dark,border:BASE_COLORS.green.light,text:"#FFFFFF"},
};

export function ChipsSlot({ pokemonName }: SlotStubProps) {
  const orientation = useViewportLayout();
  const carousel = useCarouselSafe();
  const detail = carousel?.detail ?? null;

  const chips = useMemo(() => {
    if (detail && pokemonName) {
      const types = [...(detail.types as ReadonlyArray<PokemonTypeRef>)].sort((a,b)=>a.slot-b.slot);
      const t1=types[0], t2=types.length>1?types[1]:null;
      const r:{key:string;label:string;colors:ColorSet}[]=[];
      if(t1) r.push({key:"type1",label:typeLabel(t1.name),colors:typeColors(t1.name)});
      if(t2) r.push({key:"type2",label:typeLabel(t2.name),colors:typeColors(t2.name)});
      r.push({key:"generation",label:genLabel(detail.generation),colors:genColors(detail.generation)});
      return r;
    }
    return [
      {key:"type1",label:"",colors:EMPTY_CHIP_COLORS.type1},
      {key:"type2",label:"",colors:EMPTY_CHIP_COLORS.type2},
      {key:"generation",label:"",colors:EMPTY_CHIP_COLORS.generation},
    ];
  }, [detail, pokemonName]);

  const typesChips = chips.filter(c=>c.key==="type1"||c.key==="type2");
  const genChip = chips.find(c=>c.key==="generation");

  return (
    <div {...buildSlotAttrs("chips",{pokemonName,mode:detail?"filled":"empty"})}
      role="group" aria-label="Tipos y generación del pokemon" data-orientation={orientation}
      style={{
        display:"flex",
        flexDirection: orientation === "vertical" ? "column" : "row",
        alignItems: orientation === "vertical" ? "flex-start" : "center",
        justifyContent:"space-between",gap: orientation === "vertical" ? "6px" : "6px",
        width:"100%",height:"100%",padding:"2px 4px",
        overflow:"hidden",boxSizing:"border-box",
      }}
    >
      <div style={{
        display:"flex",
        flexDirection: orientation === "vertical" ? "column" : "row",
        alignItems: orientation === "vertical" ? "flex-start" : "center",
        gap:"4px",flexShrink:1,overflow:"hidden",minWidth:0,
      }}>
        {typesChips.map(c=><Chip key={c.key} data={c.key} colors={c.colors} label={c.label} small={orientation==="vertical"}/>)}
      </div>
      {genChip&&<Chip key={genChip.key} data={genChip.key} colors={genChip.colors} label={genChip.label} small={orientation==="vertical"}/>}
    </div>
  );
}
