import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  OakChatProvider,
  useOakChat,
} from "@/src/components/chat/OakChatContext";

function TestConsumer() {
  const {
    messages,
    status,
    isOpen,
    isExpanded,
    sendMessage,
    openChat,
    closeChat,
    clearChat,
    expandChat,
    collapseChat,
  } = useOakChat();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="isOpen">{String(isOpen)}</span>
      <span data-testid="isExpanded">{String(isExpanded)}</span>
      <span data-testid="messageCount">{messages.length}</span>
      <ul data-testid="messages">
        {messages.map((m) => (
          <li key={m.id} data-role={m.role} data-testid={`msg-${m.id}`}>
            {m.content}
          </li>
        ))}
      </ul>
      <button data-testid="open" onClick={openChat}>
        Open
      </button>
      <button data-testid="close" onClick={closeChat}>
        Close
      </button>
      <button data-testid="clear" onClick={clearChat}>
        Clear
      </button>
      <button data-testid="expand" onClick={expandChat}>
        Expand
      </button>
      <button data-testid="collapse" onClick={collapseChat}>
        Collapse
      </button>
      <button
        data-testid="send"
        onClick={() => sendMessage("Hola Profesor")}
      >
        Send
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <OakChatProvider>
      <TestConsumer />
    </OakChatProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("OakChatProvider", () => {
  it("estado inicial: idle, cerrado, sin mensajes", () => {
    renderProvider();
    expect(screen.getByTestId("status").textContent).toBe("idle");
    expect(screen.getByTestId("isOpen").textContent).toBe("false");
    expect(screen.getByTestId("isExpanded").textContent).toBe("false");
    expect(screen.getByTestId("messageCount").textContent).toBe("0");
  });

  it("openChat abre el chat", () => {
    renderProvider();
    fireEvent.click(screen.getByTestId("open"));
    expect(screen.getByTestId("isOpen").textContent).toBe("true");
  });

  it("closeChat cierra el chat y colapsa", () => {
    renderProvider();
    fireEvent.click(screen.getByTestId("open"));
    fireEvent.click(screen.getByTestId("expand"));
    fireEvent.click(screen.getByTestId("close"));
    expect(screen.getByTestId("isOpen").textContent).toBe("false");
    expect(screen.getByTestId("isExpanded").textContent).toBe("false");
  });

  it("clearChat vacía los mensajes", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: delta\ndata: Respuesta\n\nevent: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderProvider();
    fireEvent.click(screen.getByTestId("send"));

    await waitFor(() => {
      expect(screen.getByTestId("messageCount").textContent).toBe("2");
    });

    fireEvent.click(screen.getByTestId("clear"));
    expect(screen.getByTestId("messageCount").textContent).toBe("0");
  });

  it("expandChat y collapseChat cambian isExpanded", () => {
    renderProvider();
    fireEvent.click(screen.getByTestId("expand"));
    expect(screen.getByTestId("isExpanded").textContent).toBe("true");
    fireEvent.click(screen.getByTestId("collapse"));
    expect(screen.getByTestId("isExpanded").textContent).toBe("false");
  });

  it("sendMessage añade mensaje de usuario y streaming", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: delta\ndata: ¡Hola!\n\nevent: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderProvider();
    fireEvent.click(screen.getByTestId("send"));

    // Immediately there should be user message
    await waitFor(() => {
      expect(screen.getByTestId("messageCount").textContent).toBe("2");
    });

    // Find the user message
    const messages = screen.getByTestId("messages");
    const items = messages.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe("Hola Profesor"); // user
  });

  it("procesa eventos SSE delta incrementalmente", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: delta\ndata: Hola\n\nevent: delta\ndata:  entrenador\n\nevent: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderProvider();
    fireEvent.click(screen.getByTestId("send"));

    await waitFor(() => {
      const messages = screen.getByTestId("messages");
      const items = messages.querySelectorAll("li");
      expect(items.length).toBe(2);
      expect(items[1].textContent).toBe("Hola entrenador");
    });
  });

  it("procesa tool_start y tool_end", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: tool_start\ndata: {"name":"get_pokemon_info","args":{"name":"pikachu"}}\n\n' +
          'event: tool_end\ndata: {"name":"get_pokemon_info","result":{"types":["electric"]}}\n\n' +
          'event: delta\ndata: Pikachu es eléctrico\n\n' +
          'event: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderProvider();
    fireEvent.click(screen.getByTestId("send"));

    await waitFor(() => {
      const messages = screen.getByTestId("messages");
      const items = messages.querySelectorAll("li");
      expect(items.length).toBe(2);
    });
  });

  it("maneja error HTTP del fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Servicio no disponible" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    renderProvider();
    fireEvent.click(screen.getByTestId("send"));

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("error");
    });
  });

  it("maneja error de red del fetch", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    renderProvider();
    fireEvent.click(screen.getByTestId("send"));

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("error");
    });
  });

  it("no envía si ya está en streaming", async () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<void>(() => {
          /* nunca resuelve */
        }),
    );

    renderProvider();
    fireEvent.click(screen.getByTestId("send"));
    fireEvent.click(screen.getByTestId("send"));

    // fetch should have been called only once
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("lanza error si useOakChat se usa fuera del provider", () => {
    // Silence console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useOakChat debe usarse dentro de <OakChatProvider>");

    spy.mockRestore();
  });
});
