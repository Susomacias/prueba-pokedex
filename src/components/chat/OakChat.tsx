"use client";

import { useEffect, useRef } from "react";
import { usePokedexCommand } from "./usePokedexCommand";
import { OakChatAvatar } from "./OakChatAvatar";
import { OakChatBubble } from "./OakChatBubble";
import { useOakChat } from "./OakChatContext";
import { useView } from "@/src/components/app/ViewContext";
import "./oak-chat.css";

/**
 * Plan 11.4 — Componente raíz del chat con el Profesor Oak.
 *
 * Monta el avatar y el bubble del chat, y activa el hook
 * `usePokedexCommand` para procesar comandos de IA que modifican
 * el estado de la Pokédex (filtros, selección de pokémon).
 *
 * Solo se muestra cuando `view === "pokedex"`.
 *
 * Tras la animación de entrada del avatar (~2.3s), despliega
 * automáticamente la burbuja colapsada para indicar que es un chat.
 */
export function OakChat() {
  const { view } = useView();
  const { openChat } = useOakChat();
  const hasOpenedRef = useRef(false);
  usePokedexCommand();

  useEffect(() => {
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;

    const id = setTimeout(() => {
      openChat();
    }, 2800);

    return () => clearTimeout(id);
  }, [openChat]);

  if (view !== "pokedex") return null;

  return (
    <>
      <OakChatAvatar />
      <OakChatBubble />
    </>
  );
}
