"use client";

import { useEffect, useRef } from "react";
import { useOakChat } from "./OakChatContext";

export function OakChatAvatar() {
  const { isOpen, openChat, closeChat } = useOakChat();
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      el.classList.add("oak-avatar--instant");
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="oak-chat-avatar"
      role="button"
      tabIndex={0}
      aria-label={
        isOpen
          ? "Cerrar chat con el Profesor Oak"
          : "Abrir chat con el Profesor Oak"
      }
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      title="Profesor Oak — ¿Necesitas ayuda?"
    >
      <img
        src="/profesor_oak_chat.svg"
        alt="Profesor Oak"
        className="oak-chat-avatar__img"
      />
      {isOpen && <span className="oak-chat-avatar__status" />}
    </div>
  );
}
