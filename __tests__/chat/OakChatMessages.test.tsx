import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEffect } from "react";
import { OakChatBubble } from "@/src/components/chat/OakChatBubble";
import {
  OakChatProvider,
  useOakChat,
} from "@/src/components/chat/OakChatContext";

function ExpandedOpener() {
  const { openChat, expandChat } = useOakChat();
  useEffect(() => {
    openChat();
    expandChat();
  }, [openChat, expandChat]);
  return null;
}

function renderMessages() {
  return render(
    <OakChatProvider>
      <ExpandedOpener />
      <OakChatBubble />
    </OakChatProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("OakChatMessages", () => {
  it("renderiza burbuja de usuario correctamente", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: delta\ndata: Respuesta\n\nevent: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderMessages();

    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    fireEvent.change(textarea, { target: { value: "Hola" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const userMsg = await screen.findByText("Hola");
    expect(userMsg).toBeInTheDocument();

    const assistantMsg = await screen.findByText("Respuesta");
    expect(assistantMsg).toBeInTheDocument();
  });

  it("renderiza burbuja de Oak correctamente", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: delta\ndata: ¡Hola entrenador!\n\nevent: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderMessages();

    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    fireEvent.change(textarea, { target: { value: "Hola" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const msg = await screen.findByText("¡Hola entrenador!");
    expect(msg).toBeInTheDocument();
  });

  it("muestra burbuja de razonamiento cuando hay reasoning", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: reasoning\ndata: Pensando sobre pokemons\n\nevent: delta\ndata: Respuesta\n\nevent: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderMessages();

    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    fireEvent.change(textarea, { target: { value: "Hola" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const reasoningBtn = await screen.findByText("Razonamiento");
    expect(reasoningBtn).toBeInTheDocument();

    fireEvent.click(reasoningBtn);
    expect(
      await screen.findByText("Pensando sobre pokemons"),
    ).toBeInTheDocument();
  });

  it("el razonamiento se expande/colapsa al hacer click", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: reasoning\ndata: Pensando...\n\nevent: delta\ndata: Ok\n\nevent: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderMessages();

    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    fireEvent.change(textarea, { target: { value: "Hola" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const reasoningBtn = await screen.findByText("Razonamiento");
    fireEvent.click(reasoningBtn);
    expect(screen.getByText("Pensando...")).toBeInTheDocument();

    fireEvent.click(reasoningBtn);
    expect(screen.queryByText("Pensando...")).not.toBeInTheDocument();
  });

  it("muestra tool call en estado done", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: tool_start\ndata: {"name":"search_pokemon","args":{"type":"fire"}}\n\n' +
          'event: tool_end\ndata: {"name":"search_pokemon","result":{"items":[{"name":"charmander"}]}}\n\n' +
          'event: delta\ndata: Encontré estos pokemons\n\n' +
          'event: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderMessages();

    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    fireEvent.change(textarea, { target: { value: "Busca fuego" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const toolLabel = await screen.findByText("Buscando pokémons ✓");
    expect(toolLabel).toBeInTheDocument();
  });

  it("tool call muestra estado de error", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: tool_start\ndata: {"name":"search_pokemon","args":{"type":"unknown"}}\n\n' +
          'event: tool_error\ndata: {"name":"search_pokemon","error":"Tipo no válido"}\n\n' +
          'event: done\ndata: {"turnId":"x"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderMessages();

    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    fireEvent.change(textarea, { target: { value: "Busca" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const errorLabel = await screen.findByText("Buscando pokémons ✗");
    expect(errorLabel).toBeInTheDocument();
  });

  it("muestra loading dots cuando el stream empieza sin tokens", () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    renderMessages();

    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    fireEvent.change(textarea, { target: { value: "Hola" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    const loading = screen.getByRole("status", {
      name: "Profesor Oak está pensando",
    });
    expect(loading).toBeInTheDocument();
  });
});
