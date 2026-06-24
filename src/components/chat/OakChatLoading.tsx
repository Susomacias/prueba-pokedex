"use client";

export function OakChatLoading() {
  return (
    <div className="oak-chat-assistant-message" role="status" aria-label="Profesor Oak está pensando">
      <div className="oak-chat-assistant-message__avatar">
        <img src="/profesor_oak_chat.svg" alt="Profesor Oak" width={24} height={24} />
      </div>
      <div className="oak-chat-loading">
        <span className="oak-chat-loading__dot" />
        <span className="oak-chat-loading__dot" />
        <span className="oak-chat-loading__dot" />
      </div>
    </div>
  );
}
