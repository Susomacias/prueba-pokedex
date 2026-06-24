"use client";

import { Suspense } from "react";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { PokedexPageProvider } from "@/src/components/pokedex/PokedexPageProvider";
import { PokedexShell } from "@/src/components/pokedex/PokedexShell";
import { PokedexHomeButton } from "@/src/components/pokedex/PokedexHomeButton";
import { DataLoadingAggregator } from "@/src/components/loading/DataLoadingAggregator";
import { Mode3DViewBinder } from "@/src/components/pokedex/3d/Mode3DViewBinder";
import { Mode3DHabitatOverlay } from "@/src/components/pokedex/3d/Mode3DHabitatOverlay";
import { Model3DPreloader } from "@/src/components/pokedex/3d/Model3DPreloader";
import { OakChatProvider } from "@/src/components/chat/OakChatContext";
import { OakChat } from "@/src/components/chat/OakChat";

export function PokedexOverlay() {
  return (
    <Suspense fallback={null}>
      <FiltersProvider>
        <PokedexPageProvider>
          <OakChatProvider>
            <Mode3DViewBinder />
            <Mode3DHabitatOverlay />
            <Model3DPreloader />
            <PokedexHomeButton />
            <PokedexShell />
            <DataLoadingAggregator />
            <OakChat />
          </OakChatProvider>
        </PokedexPageProvider>
      </FiltersProvider>
    </Suspense>
  );
}
