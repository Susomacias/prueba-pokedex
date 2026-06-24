"use client";

import { useState } from "react";
import { Wrench, Check, X, Loader2 } from "lucide-react";
import type { ToolCallState } from "./OakChatContext";

function formatToolName(name: string): string {
  const labels: Record<string, string> = {
    search_pokemon: "Buscando pokémons",
    get_pokemon_info: "Consultando Pokédex",
    get_oak_info: "Consultando información",
    apply_filters: "Aplicando filtros",
    show_pokemon: "Mostrando pokémon",
  };
  return labels[name] ?? name;
}

function formatToolArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (key === "name") parts.push(`"${value}"`);
    else parts.push(`${key}: ${value}`);
  }
  return parts.join(", ");
}

export function OakChatToolBubble({ toolCall }: { toolCall: ToolCallState }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`oak-chat-tool-bubble oak-chat-tool-bubble--${toolCall.status}`}
    >
      <button
        type="button"
        className="oak-chat-tool-bubble__toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={`Detalles de ${toolCall.name}`}
      >
        <span className="oak-chat-tool-bubble__status-icon">
          {toolCall.status === "pending" && (
            <Loader2 size={12} className="oak-chat-tool-bubble__spinner" />
          )}
          {toolCall.status === "done" && (
            <Check size={12} className="oak-chat-tool-bubble__check" />
          )}
          {toolCall.status === "error" && (
            <X size={12} className="oak-chat-tool-bubble__error-icon" />
          )}
        </span>
        <Wrench size={14} className="oak-chat-tool-bubble__icon" />
        <span className="oak-chat-tool-bubble__label">
          {toolCall.status === "pending" && `${formatToolName(toolCall.name)}...`}
          {toolCall.status === "done" && `${formatToolName(toolCall.name)} ✓`}
          {toolCall.status === "error" &&
            `${formatToolName(toolCall.name)} ✗`}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`oak-chat-tool-bubble__chevron ${expanded ? "oak-chat-tool-bubble__chevron--open" : ""}`}
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
        <div className="oak-chat-tool-bubble__content">
          <div className="oak-chat-tool-bubble__args">
            {formatToolArgs(toolCall.args)}
          </div>
          {toolCall.error && (
            <div className="oak-chat-tool-bubble__error">
              Error: {toolCall.error}
            </div>
          )}
          {toolCall.result !== undefined && (
            <div className="oak-chat-tool-bubble__result">
              {typeof toolCall.result === "string"
                ? toolCall.result
                : JSON.stringify(toolCall.result, null, 2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
