import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePokedexCommand } from "@/src/components/chat/usePokedexCommand";

const mockSetFilter = vi.fn();
const mockGoToPokemon = vi.fn();
const mockDismissCommand = vi.fn();
const mockSetExternalCommand = vi.fn();

let mockPendingCommand: {
  action: "apply_filters" | "show_pokemon";
  payload: Record<string, unknown>;
} | null = null;

vi.mock("@/src/components/chat/OakChatContext", () => ({
  useOakChat: () => ({
    messages: [] as unknown[],
    status: "idle" as const,
    isOpen: false,
    isExpanded: false,
    pendingCommand: mockPendingCommand,
    externalCommand: null as string | null,
    sendMessage: vi.fn(),
    openChat: vi.fn(),
    closeChat: vi.fn(),
    clearChat: vi.fn(),
    expandChat: vi.fn(),
    collapseChat: vi.fn(),
    dismissCommand: mockDismissCommand,
    setExternalCommand: mockSetExternalCommand,
  }),
  OakChatProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/src/components/filters/FiltersProvider", () => ({
  useFiltersContext: () => ({
    filters: {} as Record<string, unknown>,
    activeCount: 0,
    setFilter: mockSetFilter,
    removeFilter: vi.fn(),
    clearAll: vi.fn(),
    summary: () => [] as { key: string; label: string; display: string }[],
  }),
  FiltersProvider: ({ children }: { children: React.ReactNode }) => children,
  useActiveFiltersCount: () => 0,
}));

vi.mock("@/src/components/app/ViewContext", () => ({
  useAppShell: () => ({
    view: "pokedex" as const,
    pathname: "/pokedex",
    selectedName: null as string | null,
    goToHome: vi.fn(),
    goToPokedex: vi.fn(),
    goToPokemon: mockGoToPokemon,
  }),
  AppShellProvider: ({ children }: { children: React.ReactNode }) => children,
  useView: () => ({
    view: "pokedex" as const,
    pathname: "/pokedex",
    selectedName: null as string | null,
    goToHome: vi.fn(),
    goToPokedex: vi.fn(),
    goToPokemon: mockGoToPokemon,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPendingCommand = null;
});

describe("usePokedexCommand", () => {
  it("sin comando pendiente no hace nada", () => {
    mockPendingCommand = null;
    renderHook(() => usePokedexCommand());

    expect(mockSetFilter).not.toHaveBeenCalled();
    expect(mockGoToPokemon).not.toHaveBeenCalled();
    expect(mockDismissCommand).not.toHaveBeenCalled();
  });

  it("apply_filters con type1 fire llama a setFilter", () => {
    mockPendingCommand = {
      action: "apply_filters",
      payload: { type1: "fire" },
    };

    renderHook(() => usePokedexCommand());

    expect(mockSetFilter).toHaveBeenCalledWith("type1", "fire");
  });

  it("apply_filters con múltiples filtros llama setFilter por cada uno", () => {
    mockPendingCommand = {
      action: "apply_filters",
      payload: {
        type1: "fire",
        generation: "generation-i",
        habitat: "cave",
      },
    };

    renderHook(() => usePokedexCommand());

    expect(mockSetFilter).toHaveBeenCalledWith("type1", "fire");
    expect(mockSetFilter).toHaveBeenCalledWith("generation", "generation-i");
    expect(mockSetFilter).toHaveBeenCalledWith("habitat", "cave");
    expect(mockSetFilter).toHaveBeenCalledTimes(3);
  });

  it("apply_filters ignora claves no válidas", () => {
    mockPendingCommand = {
      action: "apply_filters",
      payload: {
        type1: "fire",
        unknown_key: "value",
        another_bad: 123,
      },
    };

    renderHook(() => usePokedexCommand());

    expect(mockSetFilter).toHaveBeenCalledWith("type1", "fire");
    expect(mockSetFilter).toHaveBeenCalledTimes(1);
  });

  it("apply_filters ignora valores undefined o null", () => {
    mockPendingCommand = {
      action: "apply_filters",
      payload: {
        type1: "fire",
        type2: null,
        generation: undefined,
      },
    };

    renderHook(() => usePokedexCommand());

    expect(mockSetFilter).toHaveBeenCalledWith("type1", "fire");
    expect(mockSetFilter).toHaveBeenCalledTimes(1);
  });

  it("apply_filters llama a dismissCommand al terminar", () => {
    mockPendingCommand = {
      action: "apply_filters",
      payload: { type1: "fire" },
    };

    renderHook(() => usePokedexCommand());

    expect(mockDismissCommand).toHaveBeenCalledTimes(1);
  });

  it("show_pokemon con nombre válido llama a goToPokemon", () => {
    mockPendingCommand = {
      action: "show_pokemon",
      payload: { name: "pikachu" },
    };

    renderHook(() => usePokedexCommand());

    expect(mockGoToPokemon).toHaveBeenCalledWith("pikachu");
    expect(mockDismissCommand).toHaveBeenCalledTimes(1);
  });

  it("show_pokemon con nombre vacío no llama a goToPokemon", () => {
    mockPendingCommand = {
      action: "show_pokemon",
      payload: { name: "" },
    };

    renderHook(() => usePokedexCommand());

    expect(mockGoToPokemon).not.toHaveBeenCalled();
    expect(mockDismissCommand).toHaveBeenCalledTimes(1);
  });

  it("show_pokemon sin campo name no llama a goToPokemon", () => {
    mockPendingCommand = {
      action: "show_pokemon",
      payload: {},
    };

    renderHook(() => usePokedexCommand());

    expect(mockGoToPokemon).not.toHaveBeenCalled();
    expect(mockDismissCommand).toHaveBeenCalledTimes(1);
  });
});
