"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface ToolCallState {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: "pending" | "done" | "error";
}

export interface OakMessage {
  id: string;
  role: "user" | "oak";
  content: string;
  reasoning?: string;
  toolCalls?: ToolCallState[];
  timestamp: number;
  error?: string;
}

export type OakChatStatus = "idle" | "streaming" | "error";

export interface PokedexCommandEvent {
  action: "apply_filters" | "show_pokemon";
  payload: Record<string, unknown>;
}

interface SSECallbacks {
  onDelta(token: string): void;
  onReasoning(fragment: string): void;
  onToolStart(name: string, args: Record<string, unknown>): void;
  onToolEnd(name: string, result: unknown): void;
  onToolError(name: string, error: string): void;
  onPokedexCommand(cmd: PokedexCommandEvent): void;
  onError(message: string): void;
  onDone(): void;
}

export interface OakChatContextValue {
  messages: OakMessage[];
  status: OakChatStatus;
  isOpen: boolean;
  isExpanded: boolean;
  pendingCommand: PokedexCommandEvent | null;
  externalCommand: string | null;
  sendMessage(text: string): Promise<void>;
  retry(): void;
  openChat(): void;
  closeChat(): void;
  clearChat(): void;
  expandChat(): void;
  collapseChat(): void;
  dismissCommand(): void;
  setExternalCommand(cmd: string | null): void;
}

export const OakChatContext = createContext<OakChatContextValue | null>(null);

let nextId = 1;
function uid(): string {
  return `oak-msg-${nextId++}`;
}

async function parseSSEStream(
  response: Response,
  callbacks: SSECallbacks,
): Promise<void> {
  if (!response.body) {
    callbacks.onError("No se pudo leer la respuesta del laboratorio.");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEvent = "";
      for (const line of lines) {
        const trimmed = line.trimEnd();

        if (trimmed.startsWith("event: ")) {
          currentEvent = trimmed.slice(7).trim();
        } else if (trimmed.startsWith("data: ")) {
          const rawData = trimmed.slice(6);
          handleSSEEvent(currentEvent, rawData, callbacks);
          currentEvent = "";
        }
      }
    }

    if (buffer.trim()) {
      const leftover = buffer.trimEnd().split("\n");
      let currentEvent = "";
      for (const line of leftover) {
        const trimmed = line.trimEnd();
        if (trimmed.startsWith("event: ")) {
          currentEvent = trimmed.slice(7).trim();
        } else if (trimmed.startsWith("data: ")) {
          handleSSEEvent(currentEvent, trimmed.slice(6), callbacks);
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    callbacks.onError(
      err instanceof Error ? err.message : "Error de conexión",
    );
  }
}

function handleSSEEvent(
  event: string,
  rawData: string,
  cbs: SSECallbacks,
): void {
  switch (event) {
    case "delta":
      cbs.onDelta(rawData);
      break;
    case "reasoning":
      cbs.onReasoning(rawData);
      break;
    case "tool_start": {
      try {
        const parsed = JSON.parse(rawData) as {
          name: string;
          args: Record<string, unknown>;
        };
        cbs.onToolStart(parsed.name, parsed.args);
      } catch {
        // ignore
      }
      break;
    }
    case "tool_end": {
      try {
        const parsed = JSON.parse(rawData) as {
          name: string;
          result: unknown;
        };
        cbs.onToolEnd(parsed.name, parsed.result);
      } catch {
        // ignore
      }
      break;
    }
    case "tool_error": {
      try {
        const parsed = JSON.parse(rawData) as {
          name: string;
          error: string;
        };
        cbs.onToolError(parsed.name, parsed.error);
      } catch {
        // ignore
      }
      break;
    }
    case "pokedex_command": {
      try {
        const parsed = JSON.parse(rawData) as PokedexCommandEvent;
        cbs.onPokedexCommand(parsed);
      } catch {
        // ignore
      }
      break;
    }
    case "error": {
      try {
        const parsed = JSON.parse(rawData) as { message: string };
        cbs.onError(parsed.message);
      } catch {
        cbs.onError(rawData);
      }
      break;
    }
    case "done":
      cbs.onDone();
      break;
  }
}

export function OakChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<OakMessage[]>([]);
  const [status, setStatus] = useState<OakChatStatus>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingCommand, setPendingCommand] =
    useState<PokedexCommandEvent | null>(null);
  const [externalCommand, setExternalCommand] = useState<string | null>(null);

  const streamingRef = useRef(false);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsExpanded(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setPendingCommand(null);
  }, []);

  const expandChat = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapseChat = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const dismissCommand = useCallback(() => {
    setPendingCommand(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (streamingRef.current) return;

      const userMsg: OakMessage = {
        id: uid(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const oakMsg: OakMessage = {
        id: uid(),
        role: "oak",
        content: "",
        toolCalls: [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, oakMsg]);
      setStatus("streaming");
      streamingRef.current = true;

      try {
        const response = await fetch("/api/oak-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.role === "user" ? m.content : m.content || null,
            })),
          }),
        });

        if (!response.ok) {
          let errorMsg = `Error ${response.status}`;
          try {
            const err = (await response.json()) as { error?: string };
            if (err.error) errorMsg = err.error;
          } catch {
            // ignore
          }

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "oak") {
              updated[updated.length - 1] = {
                ...last,
                content: errorMsg,
                error: "HTTP_ERROR",
              };
            }
            return updated;
          });
          setStatus("error");
          streamingRef.current = false;
          return;
        }

        await parseSSEStream(response, {
          onDelta(token) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "oak") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + token,
                };
              }
              return updated;
            });
          },
          onReasoning(fragment) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "oak") {
                updated[updated.length - 1] = {
                  ...last,
                  reasoning: (last.reasoning ?? "") + fragment,
                };
              }
              return updated;
            });
          },
          onToolStart(name, args) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "oak") {
                const toolCalls: ToolCallState[] = [
                  ...(last.toolCalls ?? []),
                  { name, args, status: "pending" as const },
                ];
                updated[updated.length - 1] = { ...last, toolCalls };
              }
              return updated;
            });
          },
          onToolEnd(name, result) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "oak" && last.toolCalls) {
                const toolCalls = last.toolCalls.map((tc) =>
                  tc.name === name && tc.status === "pending"
                    ? { ...tc, result, status: "done" as const }
                    : tc,
                );
                updated[updated.length - 1] = { ...last, toolCalls };
              }
              return updated;
            });
          },
          onToolError(name, error) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "oak" && last.toolCalls) {
                const toolCalls = last.toolCalls.map((tc) =>
                  tc.name === name && tc.status === "pending"
                    ? { ...tc, error, status: "error" as const }
                    : tc,
                );
                updated[updated.length - 1] = { ...last, toolCalls };
              }
              return updated;
            });
          },
          onPokedexCommand(cmd) {
            setPendingCommand(cmd);
          },
          onError(message) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "oak") {
                updated[updated.length - 1] = {
                  ...last,
                  error: message,
                };
              }
              return updated;
            });
            setStatus("error");
          },
          onDone() {
            setStatus("idle");
            streamingRef.current = false;
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error de conexión";
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "oak") {
            updated[updated.length - 1] = {
              ...last,
              content:
                last.content ||
                "El Profesor Oak está descansando en su laboratorio.",
              error: message,
            };
          }
          return updated;
        });
        setStatus("error");
        streamingRef.current = false;
      }
    },
    [messages],
  );

  const retry = useCallback(() => {
    if (streamingRef.current) return;

    setMessages((prev) => {
      const lastAssistant = prev.length > 0 ? prev[prev.length - 1] : null;
      if (!lastAssistant || lastAssistant.role !== "oak" || !lastAssistant.error) {
        return prev;
      }

      const lastUser = prev.length >= 2 ? prev[prev.length - 2] : null;
      if (!lastUser || lastUser.role !== "user") return prev;

      const retryText = lastUser.content;
      const withoutLast = prev.slice(0, -1);
      setStatus("idle");

      setTimeout(() => {
        sendMessage(retryText);
      }, 0);

      return withoutLast;
    });
  }, [sendMessage]);

  const value = useMemo<OakChatContextValue>(
    () => ({
      messages,
      status,
      isOpen,
      isExpanded,
      pendingCommand,
      externalCommand,
      sendMessage,
      retry,
      openChat,
      closeChat,
      clearChat,
      expandChat,
      collapseChat,
      dismissCommand,
      setExternalCommand,
    }),
    [
      messages,
      status,
      isOpen,
      isExpanded,
      pendingCommand,
      externalCommand,
      sendMessage,
      retry,
      openChat,
      closeChat,
      clearChat,
      expandChat,
      collapseChat,
      dismissCommand,
      setExternalCommand,
    ],
  );

  return (
    <OakChatContext.Provider value={value}>{children}</OakChatContext.Provider>
  );
}

export function useOakChat(): OakChatContextValue {
  const ctx = useContext(OakChatContext);
  if (!ctx)
    throw new Error("useOakChat debe usarse dentro de <OakChatProvider>");
  return ctx;
}
