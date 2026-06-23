"use client";

import { Suspense } from "react";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { PokedexPageProvider } from "@/src/components/pokedex/PokedexPageProvider";
import { PokedexShell } from "@/src/components/pokedex/PokedexShell";
import { PokedexHomeButton } from "@/src/components/pokedex/PokedexHomeButton";
import { DataLoadingAggregator } from "@/src/components/loading/DataLoadingAggregator";
import { Mode3DViewBinder } from "@/src/components/pokedex/3d/Mode3DViewBinder";
import { Mode3DHabitatOverlay } from "@/src/components/pokedex/3d/Mode3DHabitatOverlay";

export function PokedexOverlay() {
  return (
    <Suspense fallback={null}>
      <FiltersProvider>
        <PokedexPageProvider>
          <Mode3DViewBinder />
          <Mode3DHabitatOverlay />
          <PokedexHomeButton />
          <PokedexShell />
          <DataLoadingAggregator />
        </PokedexPageProvider>
      </FiltersProvider>
    </Suspense>
  );
}
