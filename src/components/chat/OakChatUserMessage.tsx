"use client";

import type { OakMessage } from "./OakChatContext";

export function OakChatUserMessage({ message }: { message: OakMessage }) {
  return (
    <div className="oak-chat-user-message" role="article">
      <p className="oak-chat-user-message__text">{message.content}</p>
    </div>
  );
}
