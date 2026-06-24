import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { createNavigationHarness, type NavigationHarness } from "@/__tests__/hooks/harness";
import { OakChatProvider } from "@/src/components/chat/OakChatContext";
import { OakChatAvatar } from "@/src/components/chat/OakChatAvatar";
import { OakChatBubble } from "@/src/components/chat/OakChatBubble";
import { usePokedexCommand } from "@/src/components/chat/usePokedexCommand";
import { FiltersProvider } from "@/src/components/filters/FiltersProvider";
import { AppShellProvider } from "@/src/components/app/ViewContext";
import { PokedexPageProvider, usePokedexPage } from "@/src/components/pokedex/PokedexPageProvider";

const harnessRef = globalThis as unknown as { __harness?: NavigationHarness };

vi.mock("@/src/hooks/useNavigation", () => ({
  useNavigation: () => {
    const h = harnessRef.__harness;
    if (!h) {
      throw new Error("harness not initialized");
    }
    const [, setTick] = useState(0);
    useEffect(() => h.subscribe(() => setTick((t) => t + 1)), [h]);
    return {
      pathname: h.pathname,
      searchParams: h.searchParams(),
      router: h.router,
      subscribe: (fn: () => void) => h.subscribe(fn),
    };
  },
}));

function OakChatTest() {
  usePokedexCommand();
  return (
    <>
      <OakChatAvatar />
      <OakChatBubble />
    </>
  );
}

function PokedexStateReader() {
  const { selectedName } = usePokedexPage();
  return <span data-testid="selectedName">{selectedName ?? "(ninguno)"}</span>;
}

function FullTestHarness({ children }: { children: ReactNode }) {
  return (
    <AppShellProvider initialPathname="/pokedex" initialSearch="">
      <FiltersProvider>
        <PokedexPageProvider>
          <OakChatProvider>
            {children}
          </OakChatProvider>
        </PokedexPageProvider>
      </FiltersProvider>
    </AppShellProvider>
  );
}

beforeEach(() => {
  harnessRef.__harness = createNavigationHarness({ pathname: "/pokedex" });
  vi.clearAllMocks();
});

describe("OakChat — integración con la Pokédex (Phase 11.4)", () => {
  it("renderiza el avatar de Oak dentro del árbol de providers", () => {
    render(
      <FullTestHarness>
        <OakChatAvatar />
      </FullTestHarness>,
    );

    const img = screen.getByAltText("Profesor Oak");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/profesor_oak_chat.svg");
  });

  it("el avatar tiene role button y aria-label", () => {
    render(
      <FullTestHarness>
        <OakChatAvatar />
      </FullTestHarness>,
    );

    expect(
      screen.getByRole("button", {
        name: "Abrir chat con el Profesor Oak",
      }),
    ).toBeInTheDocument();
  });

  it("usePokedexCommand y todos los providers coexisten sin errores", () => {
    const replace = vi.fn();
    harnessRef.__harness!.setRouter({ replace });

    render(
      <FullTestHarness>
        <PokedexStateReader />
        <OakChatTest />
      </FullTestHarness>,
    );

    // El hook usePokedexCommand no debe lanzar errores al montarse
    // dentro de OakChatProvider + FiltersProvider + AppShellProvider
    expect(screen.getByTestId("selectedName").textContent).toBe("(ninguno)");
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });

  it("el chat respeta el estado isOpen (cerrado por defecto)", () => {
    render(
      <FullTestHarness>
        <OakChatTest />
      </FullTestHarness>,
    );

    // El bubble no es visible porque isOpen = false
    const bubble = document.querySelector(".oak-chat-bubble");
    expect(bubble).not.toBeInTheDocument();
  });

  it("el chat se abre y cierra mediante el avatar", () => {
    render(
      <FullTestHarness>
        <OakChatTest />
      </FullTestHarness>,
    );

    const avatar = screen.getByRole("button", {
      name: "Abrir chat con el Profesor Oak",
    });

    act(() => {
      avatar.click();
    });

    expect(
      document.querySelector(".oak-chat-bubble"),
    ).toBeInTheDocument();

    act(() => {
      screen
        .getByRole("button", { name: "Cerrar chat con el Profesor Oak" })
        .click();
    });

    expect(
      document.querySelector(".oak-chat-bubble"),
    ).not.toBeInTheDocument();
  });
});
