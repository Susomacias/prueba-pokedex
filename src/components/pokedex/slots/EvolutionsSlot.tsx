"use client";

import { type SlotStubProps, buildSlotAttrs } from "./types";
import { useCarousel } from "../carousel/CarouselController";
import { useAppShell } from "@/src/components/app/ViewContext";
import { useViewportLayout } from "@/src/hooks/useViewportLayout";
import { LcdNavBar } from "./LcdNavBar";
import type { EvolutionDetail, EvolutionNode } from "@/src/lib/types/pokemon";

function useCarouselSafe() {
  try { return useCarousel(); } catch { return null; }
}

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
function spriteUrl(id: number) { return `${SPRITE_BASE}/${id}.png`; }

function formatEvoDetail(d: EvolutionDetail): string {
  if (d.trigger === "level-up" && d.minLevel != null) return `Lv ${d.minLevel}`;
  if (d.trigger === "level-up") return "Amistad";
  if (d.trigger === "use-item" && d.item) return itemLabel(d.item);
  if (d.trigger === "trade") return "Interc.";
  if (d.trigger === "shed") return "Muda";
  return d.trigger ?? "?";
}

function itemLabel(item: string): string {
  const m: Record<string, string> = {
    "thunder-stone":"P. Trueno","water-stone":"P. Agua","fire-stone":"P. Fuego",
    "leaf-stone":"P. Hoja","moon-stone":"P. Lunar","sun-stone":"P. Solar",
    "shiny-stone":"P. Alba","dusk-stone":"P. Noche","dawn-stone":"P. Aurora",
    "ice-stone":"P. Hielo","oval-stone":"P. Oval","kings-rock":"Roca Rey",
    "metal-coat":"Rev. Met.","dragon-scale":"Esc. Dragón","up-grade":"Mejora",
    "dubious-disc":"D. Extraño","protector":"Protector","electirizer":"Electrizador",
    "magmarizer":"Magmatizador","razor-fang":"Colm. Agudo","razor-claw":"Garra Afil.",
    "deep-sea-tooth":"Diente Ab.","deep-sea-scale":"Esc. Abisal","reaper-cloth":"Tela Espect.",
    "sachet":"Sachet","whipped-dream":"Nata","prism-scale":"Esc. Bella",
  };
  return m[item] ?? item.replace(/-/g, " ");
}

function EvolutionItem({ node, isCurrent, onSelect }: {
  node: EvolutionNode; isCurrent: boolean; onSelect: (name: string) => void;
}) {
  return (
    <button
      type="button" data-evolution-id={node.id} data-current={String(isCurrent)}
      className="evolution-item"
      onClick={() => onSelect(node.name)}
      aria-label={`Evolución: ${node.name}${isCurrent ? " (actual)" : ""}`}
      style={{
        display:"flex",alignItems:"center",gap:"4px",padding:"2px 4px",
        border:isCurrent?"2px solid #33FF33":"1px solid #0d2a0d",borderRadius:"4px",
        backgroundColor:isCurrent?"rgba(51,255,51,0.12)":"transparent",cursor:"pointer",
        width:"100%",transition:"background-color 0.2s, border-color 0.2s",
        color:"#33FF33",fontFamily:"monospace",fontSize:"12px",textAlign:"left",
        boxSizing:"border-box",
      }}
    >
      <img src={spriteUrl(node.id)} alt={node.name} className="evolution-sprite"
        style={{
          width:"28px",height:"28px",imageRendering:"pixelated",flexShrink:0,
          filter:"grayscale(100%) sepia(100%) saturate(300%) hue-rotate(80deg) brightness(0.9) contrast(1.1)",
          opacity:isCurrent?1:0.6,
        }} loading="lazy" />
      <span style={{
        flex:1,fontWeight:isCurrent?700:400,textTransform:"capitalize",
        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
      }}>{node.name}</span>
      {node.evolutionDetail ? (
        <span style={{
          fontSize:"9px",opacity:0.7,whiteSpace:"nowrap",flexShrink:0,color:"#66FF66",
        }}>{formatEvoDetail(node.evolutionDetail)}</span>
      ) : null}
    </button>
  );
}

export function EvolutionsSlot({ pokemonName }: SlotStubProps) {
  const carousel = useCarouselSafe();
  const { goToPokemon } = useAppShell();
  const orientation = useViewportLayout();
  const detail = carousel?.detail ?? null;
  const chain = detail?.evolutionChain;

  // En vertical, STATS se solapa con EVOLUCIONES (x=155 dentro de x=73-253).
  // Reservamos margen derecho para que el contenido no pise el panel de stats.
  const isVertical = orientation === "vertical";

  return (
    <div {...buildSlotAttrs("evolutions",{pokemonName})} role="list"
      aria-label="Cadena de evoluciones del pokemon"
      className="lcd-panel"
      style={{
        width:"100%",height:"100%",overflowY:"auto",overflowX:"hidden",
        backgroundColor:"#0a120a",border:"2px solid #1a3a1a",borderRadius:"4px",
        display:"flex",flexDirection:"column",boxSizing:"border-box",
        scrollbarWidth:"thin",scrollbarColor:"#1a4a1a #0a120a",
      }}
    >
      <style>{`
        .lcd-panel::-webkit-scrollbar{width:4px}
        .lcd-panel::-webkit-scrollbar-track{background:#0a120a}
        .lcd-panel::-webkit-scrollbar-thumb{background:#1a5a1a;border-radius:2px}
        .lcd-panel::-webkit-scrollbar-thumb:hover{background:#33FF33}
      `}</style>
      <LcdNavBar title="EVOLUCIONES" />
      <div style={{
        flex:1,overflowY:"auto",overflowX:"hidden",display:"flex",
        flexDirection:"column",gap:"1px",
        padding: isVertical ? "0 48px 2px 2px" : "0 2px 2px",
      }}>
        {chain && chain.length > 0 ? (
          chain.map((n: EvolutionNode) => (
            <EvolutionItem key={n.id} node={n}
              isCurrent={n.name === pokemonName} onSelect={goToPokemon} />
          ))
        ) : (
          <div style={{
            flex:1,display:"flex",alignItems:"center",justifyContent:"center",
            color:"#0d2a0d",fontFamily:"monospace",fontSize:"10px",
          }}>{pokemonName ? "Cargando..." : "Sin pokémon"}</div>
        )}
      </div>
    </div>
  );
}
