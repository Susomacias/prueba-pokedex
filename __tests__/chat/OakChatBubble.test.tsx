import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEffect } from "react";
import { OakChatBubble } from "@/src/components/chat/OakChatBubble";
import {
  OakChatProvider,
  useOakChat,
} from "@/src/components/chat/OakChatContext";

function Opener() {
  const { openChat } = useOakChat();
  useEffect(() => {
    openChat();
  }, [openChat]);
  return null;
}

function ExpandedOpener() {
  const { openChat, expandChat } = useOakChat();
  useEffect(() => {
    openChat();
    expandChat();
  }, [openChat, expandChat]);
  return null;
}

function renderBubble(OpenerComp?: React.ComponentType) {
  return render(
    <OakChatProvider>
      {OpenerComp ? <OpenerComp /> : null}
      <OakChatBubble />
    </OakChatProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("OakChatBubble", () => {
  it("no se renderiza cuando el chat está cerrado", () => {
    render(
      <OakChatProvider>
        <OakChatBubble />
      </OakChatProvider>,
    );
    expect(
      screen.queryByRole("dialog", { name: "Chat con el Profesor Oak" }),
    ).not.toBeInTheDocument();
  });

  it("se renderiza cuando el chat está abierto", () => {
    renderBubble(Opener);
    expect(
      screen.getByRole("dialog", { name: "Chat con el Profesor Oak" }),
    ).toBeInTheDocument();
  });

  it("en estado colapsado muestra mensaje de bienvenida", () => {
    renderBubble(Opener);
    expect(
      screen.getByRole("dialog", { name: "Chat con el Profesor Oak" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/¡Hola, entrenador!/)).toBeInTheDocument();
  });

  it("muestra el header con título Profesor Oak", () => {
    renderBubble(Opener);
    expect(screen.getByText("Profesor Oak")).toBeInTheDocument();
  });

  it("el botón de cierre colapsa el chat", () => {
    renderBubble(Opener);
    const closeBtn = screen.getByRole("button", { name: "Cerrar chat" });
    fireEvent.click(closeBtn);
    expect(
      screen.queryByRole("dialog", { name: "Chat con el Profesor Oak" }),
    ).not.toBeInTheDocument();
  });

  it("muestra el input de texto en el área de entrada", () => {
    renderBubble(ExpandedOpener);
    expect(
      screen.getByLabelText("Mensaje para el Profesor Oak"),
    ).toBeInTheDocument();
  });

  it("tiene clase collapsed por defecto", () => {
    renderBubble(Opener);
    const dialog = screen.getByRole("dialog", {
      name: "Chat con el Profesor Oak",
    });
    expect(dialog.className).toContain("oak-chat-bubble--collapsed");
  });

  it("tiene clase expanded cuando isExpanded es true", () => {
    renderBubble(ExpandedOpener);
    const dialog = screen.getByRole("dialog", {
      name: "Chat con el Profesor Oak",
    });
    expect(dialog.className).toContain("oak-chat-bubble--expanded");
  });
});
