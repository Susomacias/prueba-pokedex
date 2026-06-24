import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OakChatAvatar } from "@/src/components/chat/OakChatAvatar";
import { OakChatProvider } from "@/src/components/chat/OakChatContext";

function renderAvatar() {
  return render(
    <OakChatProvider>
      <OakChatAvatar />
    </OakChatProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OakChatAvatar", () => {
  it("renderiza el avatar con el SVG del Profesor Oak", () => {
    renderAvatar();
    const img = screen.getByAltText("Profesor Oak");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/profesor_oak_chat.svg");
  });

  it("tiene role='button' y aria-label para abrir", () => {
    renderAvatar();
    const btn = screen.getByRole("button", {
      name: "Abrir chat con el Profesor Oak",
    });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("tabIndex", "0");
  });

  it("al hacer click abre el chat y cambia el aria-label a cerrar", () => {
    renderAvatar();
    const btn = screen.getByRole("button", {
      name: "Abrir chat con el Profesor Oak",
    });
    fireEvent.click(btn);
    expect(
      screen.getByRole("button", {
        name: "Cerrar chat con el Profesor Oak",
      }),
    ).toBeInTheDocument();
  });

  it("al hacer click con el chat abierto lo cierra", () => {
    renderAvatar();
    const btn = screen.getByRole("button", {
      name: "Abrir chat con el Profesor Oak",
    });
    fireEvent.click(btn);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Cerrar chat con el Profesor Oak",
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "Abrir chat con el Profesor Oak",
      }),
    ).toBeInTheDocument();
  });

  it("responde a tecla Enter para abrir/cerrar", () => {
    renderAvatar();
    const btn = screen.getByRole("button", {
      name: "Abrir chat con el Profesor Oak",
    });
    fireEvent.keyDown(btn, { key: "Enter" });
    expect(
      screen.getByRole("button", {
        name: "Cerrar chat con el Profesor Oak",
      }),
    ).toBeInTheDocument();

    fireEvent.keyDown(
      screen.getByRole("button", {
        name: "Cerrar chat con el Profesor Oak",
      }),
      { key: "Enter" },
    );
    expect(
      screen.getByRole("button", {
        name: "Abrir chat con el Profesor Oak",
      }),
    ).toBeInTheDocument();
  });

  it("responde a tecla Space para abrir/cerrar", () => {
    renderAvatar();
    const btn = screen.getByRole("button", {
      name: "Abrir chat con el Profesor Oak",
    });
    fireEvent.keyDown(btn, { key: " " });
    expect(
      screen.getByRole("button", {
        name: "Cerrar chat con el Profesor Oak",
      }),
    ).toBeInTheDocument();
  });

  it("muestra el title con tooltip", () => {
    renderAvatar();
    const btn = screen.getByRole("button", {
      name: "Abrir chat con el Profesor Oak",
    });
    expect(btn).toHaveAttribute(
      "title",
      "Profesor Oak — ¿Necesitas ayuda?",
    );
  });

  it("tiene la clase CSS del avatar", () => {
    renderAvatar();
    const el = screen
      .getByRole("button", { name: "Abrir chat con el Profesor Oak" })
      .closest(".oak-chat-avatar");
    expect(el).toBeInTheDocument();
  });
});
