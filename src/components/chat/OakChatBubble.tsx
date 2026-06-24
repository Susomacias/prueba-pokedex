"use client";

import { useEffect, useRef } from "react";
import { useOakChat } from "./OakChatContext";
import { OakChatAssistantMessage } from "./OakChatAssistantMessage";
import { OakChatUserMessage } from "./OakChatUserMessage";
import { OakChatReasoningBubble } from "./OakChatReasoningBubble";
import { OakChatToolBubble } from "./OakChatToolBubble";
import { OakChatLoading } from "./OakChatLoading";
import { OakChatInput } from "./OakChatInput";

export function OakChatBubble() {
  const { messages, status, isOpen, isExpanded, closeChat } = useOakChat();
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  if (!isOpen) return null;

  return (
    <div
      className={`oak-chat-bubble ${isExpanded ? "oak-chat-bubble--expanded" : "oak-chat-bubble--collapsed"}`}
      role="dialog"
      aria-label="Chat con el Profesor Oak"
    >
      <div className="oak-chat-bubble__header">
        <span className="oak-chat-bubble__title">Profesor Oak</span>
        <button
          className="oak-chat-bubble__close"
          onClick={closeChat}
          aria-label="Cerrar chat"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      <div className="oak-chat-bubble__messages" role="log" aria-live="polite" ref={messagesRef}>
        {messages.length === 0 && (
          <div className="oak-chat-bubble__welcome">
            <div className="oak-chat-bubble__welcome-avatar">
              <img
                src="/profesor_oak_chat.svg"
                alt=""
                width={32}
                height={32}
              />
            </div>
            <p>
              ¡Hola, entrenador! Soy el Profesor Oak. ¿En qué puedo ayudarte
              con el mundo Pokémon?
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLastOak =
            msg.role === "oak" &&
            i === messages.length - 1 &&
            status === "streaming" &&
            !msg.content;

          return (
            <div key={msg.id}>
              {msg.role === "user" ? (
                <OakChatUserMessage message={msg} />
              ) : (
                <>
                  {msg.reasoning && (
                    <OakChatReasoningBubble
                      reasoning={msg.reasoning}
                      isStreaming={
                        status === "streaming" && i === messages.length - 1
                      }
                    />
                  )}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="oak-chat-bubble__tool-calls">
                      {msg.toolCalls.map((tc, j) => (
                        <OakChatToolBubble key={j} toolCall={tc} />
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <OakChatAssistantMessage message={msg} />
                  )}
                  {isLastOak && !msg.content && !msg.toolCalls?.length && (
                    <OakChatLoading />
                  )}
                </>
              )}
            </div>
          );
        })}

        {status === "streaming" &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "oak" &&
          messages[messages.length - 1].content && (
            <div className="oak-chat-bubble__streaming-indicator" />
          )}
      </div>

      <div className="oak-chat-bubble__input-area">
        <OakChatInput />
      </div>

      <div className="oak-chat-bubble__peak" aria-hidden="true" />
    </div>
  );
}
