"use client";

import { useState } from "react";
import { Brain } from "lucide-react";

export function OakChatReasoningBubble({
  reasoning,
  isStreaming,
}: {
  reasoning: string;
  isStreaming?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="oak-chat-reasoning-bubble">
      <button
        type="button"
        className="oak-chat-reasoning-bubble__toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label="Mostrar razonamiento"
      >
        <Brain size={14} className="oak-chat-reasoning-bubble__icon" />
        <span className="oak-chat-reasoning-bubble__label">
          {isStreaming ? "Razonando..." : "Razonamiento"}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`oak-chat-reasoning-bubble__chevron ${expanded ? "oak-chat-reasoning-bubble__chevron--open" : ""}`}
        >
          <path
            d="M3 5l3 3 3-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {expanded && (
        <div className="oak-chat-reasoning-bubble__content">
          <p>{reasoning}</p>
        </div>
      )}
    </div>
  );
}
