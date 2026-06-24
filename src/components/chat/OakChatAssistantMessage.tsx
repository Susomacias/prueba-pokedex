"use client";

import { RefreshCw } from "lucide-react";
import { useOakChat, type OakMessage } from "./OakChatContext";
import { OakChatMarkdown } from "./OakChatMarkdown";

export function OakChatAssistantMessage({ message }: { message: OakMessage }) {
  const { retry } = useOakChat();

  return (
    <div className="oak-chat-assistant-message" role="article">
      <div className="oak-chat-assistant-message__avatar">
        <img src="/profesor_oak_chat.svg" alt="Profesor Oak" width={24} height={24} />
      </div>
      <div className="oak-chat-assistant-message__content">
        <div className="oak-chat-assistant-message__text">
          <OakChatMarkdown content={message.content} />
        </div>
        {message.error && (
          <div className="oak-chat-assistant-message__error-block">
            <p className="oak-chat-assistant-message__error">{message.error}</p>
            <button
              type="button"
              className="oak-chat-assistant-message__retry"
              onClick={retry}
              aria-label="Reintentar mensaje"
            >
              <RefreshCw size={14} />
              <span>Reintentar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
