import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEffect } from "react";
import { OakChatInput } from "@/src/components/chat/OakChatInput";
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

function CollapsedOpener() {
  const { openChat } = useOakChat();
  useEffect(() => {
    openChat();
  }, [openChat]);
  return null;
}

function renderInput(OpenerComp?: React.ComponentType) {
  return render(
    <OakChatProvider>
      {OpenerComp ? <OpenerComp /> : null}
      <OakChatInput />
    </OakChatProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("OakChatInput", () => {
  it("renderiza un textarea con placeholder animado", () => {
    renderInput(ExpandedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
    const placeholder = document.querySelector(".oak-chat-input__placeholder");
    expect(placeholder).toBeInTheDocument();
  });

  it("permite escribir texto", () => {
    renderInput(ExpandedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Hola Profesor" } });
    expect(textarea.value).toBe("Hola Profesor");
  });

  it("muestra el botón de enviar cuando hay texto", () => {
    renderInput(ExpandedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Hola" } });
    expect(
      screen.getByRole("button", { name: "Enviar mensaje" }),
    ).toBeInTheDocument();
  });

  it("no muestra el botón de enviar cuando no hay texto", () => {
    renderInput(ExpandedOpener);
    expect(
      screen.queryByRole("button", { name: "Enviar mensaje" }),
    ).not.toBeInTheDocument();
  });

  it("pulsar Enter envía el mensaje y limpia el textarea", () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        'event: done\ndata: {"turnId":"test"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );

    renderInput(ExpandedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Hola Profesor" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(textarea.value).toBe("");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("Shift+Enter inserta nueva línea sin enviar", () => {
    global.fetch = vi.fn();
    renderInput(ExpandedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Línea 1" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(textarea.value).toContain("Línea 1");
  });

  it("no envía si el texto está vacío", () => {
    global.fetch = vi.fn();
    renderInput(ExpandedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak") as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("el textarea se deshabilita durante streaming", () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    renderInput(ExpandedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Hola" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(textarea.disabled).toBe(true);
  });

  it("al hacer focus expande el chat si está colapsado", () => {
    renderInput(CollapsedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    fireEvent.focus(textarea);
    expect(textarea).toBeInTheDocument();
  });

  it("tiene aria-label de accesibilidad", () => {
    renderInput(ExpandedOpener);
    const textarea = screen.getByLabelText("Mensaje para el Profesor Oak");
    expect(textarea).toHaveAttribute(
      "aria-label",
      "Mensaje para el Profesor Oak",
    );
  });
});
