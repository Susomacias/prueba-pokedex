"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useOakChat } from "./OakChatContext";

const EXAMPLE_PROMPTS = [
  "¿Cuánto mide y pesa Pikachu?",
  "Muéstrame a Charizard",
  "Filtra por tipo agua",
  "¿Qué pokemons hay en Kanto?",
  "Cuéntame sobre Gengar",
];

function useTypewriterPlaceholder(
  prompts: readonly string[],
  typingMs = 70,
  deletingMs = 35,
  pauseAfterFullMs = 2200,
  pauseAfterEmptyMs = 500,
): string {
  const [displayed, setDisplayed] = useState("");
  const promptIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const phaseRef = useRef<"typing" | "pausing-full" | "deleting" | "pausing-empty">("typing");
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => {
      const prompt = prompts[promptIndexRef.current];
      const phase = phaseRef.current;

      if (phase === "typing") {
        if (charIndexRef.current < prompt.length) {
          charIndexRef.current++;
          setDisplayed(prompt.slice(0, charIndexRef.current));
          return typingMs;
        }
        phaseRef.current = "pausing-full";
        return pauseAfterFullMs;
      }

      if (phase === "pausing-full") {
        phaseRef.current = "deleting";
        return deletingMs;
      }

      if (phase === "deleting") {
        if (charIndexRef.current > 0) {
          charIndexRef.current--;
          setDisplayed(prompt.slice(0, charIndexRef.current));
          return deletingMs;
        }
        phaseRef.current = "pausing-empty";
        return pauseAfterEmptyMs;
      }

      if (phase === "pausing-empty") {
        promptIndexRef.current = (promptIndexRef.current + 1) % prompts.length;
        charIndexRef.current = 0;
        phaseRef.current = "typing";
        return typingMs;
      }

      return typingMs;
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      timeoutId = setTimeout(() => {
        const nextDelay = tick();
        schedule(nextDelay);
      }, delay);
    };

    schedule(typingMs);

    return () => {
      clearTimeout(timeoutId);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [prompts, typingMs, deletingMs, pauseAfterFullMs, pauseAfterEmptyMs]);

  return displayed;
}

export function OakChatInput() {
  const { sendMessage, status, isExpanded, expandChat } = useOakChat();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = status === "streaming";
  const typewriterText = useTypewriterPlaceholder(EXAMPLE_PROMPTS);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const maxH = 120;
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(scrollH, maxH)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setText("");
  }, [text, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (!isExpanded) {
      expandChat();
    }
  }, [isExpanded, expandChat]);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const showPlaceholder = !focused && text.length === 0;
  const canSend = text.trim().length > 0 && !isStreaming;

  return (
    <div className="oak-chat-input">
      {showPlaceholder && (
        <div className="oak-chat-input__placeholder" aria-hidden="true">
          <span className="oak-chat-input__placeholder-cursor" />
          {typewriterText}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="oak-chat-input__textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder=""
        rows={1}
        disabled={isStreaming}
        aria-label="Mensaje para el Profesor Oak"
      />
      {canSend && (
        <button
          type="button"
          className="oak-chat-input__send"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensaje"
        >
          <Send size={16} />
        </button>
      )}
    </div>
  );
}
