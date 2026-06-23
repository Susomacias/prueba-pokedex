"use client";

import { buildSlotAttrs, type SlotStubProps } from "./types";
import { useCarousel } from "../carousel/CarouselController";
import { LcdNavBar } from "./LcdNavBar";
import type { PokemonStat, PokemonAbility } from "@/src/lib/types/pokemon";

export interface StatsSlotProps extends SlotStubProps { mode?: "stats" | "abilities"; }

function useCarouselSafe() { try { return useCarousel(); } catch { return null; } }

const STAT_MAX = 255;
const STAT_LABELS: Record<string, string> = {
  hp:"HP",attack:"ATQ",defense:"DEF",
  "special-attack":"AT.ESP","special-defense":"DF.ESP",speed:"VEL",
};
function statLabel(n: string) { return STAT_LABELS[n] ?? n; }

function StatsView({ stats }: { stats: ReadonlyArray<PokemonStat> }) {
  return <>{stats.map(s => {
    const pct = Math.round((s.baseStat/STAT_MAX)*100);
    return (
      <div key={s.name} data-stat={s.name} className="stat-row" style={{
        display:"flex",alignItems:"center",gap:"4px",
      }}>
        <span className="stat-label" style={{
          width:"48px",textAlign:"right",color:"#33FF33",flexShrink:0,
          fontSize:"11px",fontFamily:"monospace",
        }}>{statLabel(s.name)}</span>
        <span className="stat-value" style={{
          width:"26px",textAlign:"right",color:"#33FF33",flexShrink:0,
          fontSize:"11px",fontFamily:"monospace",
        }}>{s.baseStat}</span>
        <div className="stat-bar" style={{
          flex:1,height:"8px",backgroundColor:"#0a1a0a",
          border:"1px solid #1a4a1a",borderRadius:"4px",overflow:"hidden",
        }}>
          <div data-stat-bar-fill className="stat-bar-fill" style={{
            width:`${pct}%`,height:"100%",backgroundColor:"#33FF33",
            borderRadius:"3px",transition:"width 0.4s ease",
          }}/>
        </div>
      </div>
    );
  })}</>;
}

function AbilitiesView({ abilities }: { abilities: ReadonlyArray<PokemonAbility> }) {
  return <>{abilities.map(a => (
    <div key={a.name} data-ability={a.name} data-hidden={String(a.isHidden)}
      className="ability-row" style={{
        display:"flex",alignItems:"center",gap:"4px",
      }}>
      <span className="ability-name" style={{
        color:"#33FF33",textTransform:"capitalize",flex:1,
        fontSize:"11px",fontFamily:"monospace",
        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
      }}>{a.name.replace(/-/g," ")}</span>
      {a.isHidden && (
        <span className="ability-hidden-badge" style={{
          fontSize:"8px",color:"#1a6a1a",border:"1px solid #1a4a1a",
          borderRadius:"3px",padding:"0 3px",flexShrink:0,fontFamily:"monospace",
        }}>OCULTA</span>
      )}
    </div>
  ))}</>;
}

function EmptyStatsView() {
  const names = ["hp","attack","defense","special-attack","special-defense","speed"];
  return <>{names.map(name => (
    <div key={name} className="stat-row" style={{
      display:"flex",alignItems:"center",gap:"4px",
    }}>
      <span style={{width:"48px",textAlign:"right",color:"#0d3d0d",flexShrink:0,fontSize:"11px",fontFamily:"monospace"}}>{statLabel(name)}</span>
      <span style={{width:"26px",textAlign:"right",color:"#0d3d0d",flexShrink:0,fontSize:"11px",fontFamily:"monospace"}}>--</span>
      <div style={{flex:1,height:"8px",backgroundColor:"#0a1a0a",border:"1px solid #0d3d0d",borderRadius:"4px",overflow:"hidden"}}>
        <div style={{width:"0%",height:"100%",backgroundColor:"#0d3d0d",borderRadius:"3px"}}/>
      </div>
    </div>
  ))}</>;
}

export function StatsSlot({ pokemonName, mode = "stats" }: StatsSlotProps) {
  const carousel = useCarouselSafe();
  const detail = carousel?.detail ?? null;
  const hasData = Boolean(pokemonName && detail);
  const stubName = mode === "abilities" ? "abilities" : "stats";
  const title = mode === "abilities" ? "HABILIDADES" : "STATS";
  const st = hasData ? ((detail!.stats??[]) as ReadonlyArray<PokemonStat>) : [];
  const ab = hasData ? ((detail!.abilities??[]) as ReadonlyArray<PokemonAbility>) : [];

  return (
    <div {...buildSlotAttrs(stubName,{pokemonName,mode})} role="list"
      aria-label={mode==="abilities"?"Habilidades del pokemon":"Stats del pokemon"}
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
      <LcdNavBar title={title} />
      <div style={{
        flex:1,overflowY:"auto",overflowX:"hidden",display:"flex",
        flexDirection:"column",gap:"3px",padding:"0 3px 3px",
      }}>
        {hasData ? (
          mode==="abilities"?<AbilitiesView abilities={ab}/>:<StatsView stats={st}/>
        ) : (
          mode==="abilities"?(
            <div style={{
              flex:1,display:"flex",alignItems:"center",justifyContent:"center",
              color:"#0d2a0d",fontFamily:"monospace",fontSize:"10px",
            }}>Sin pokémon</div>
          ):<EmptyStatsView/>
        )}
      </div>
    </div>
  );
}
