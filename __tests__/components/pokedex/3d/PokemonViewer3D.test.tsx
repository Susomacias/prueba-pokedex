import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { PokemonViewer3D } from "@/src/components/pokedex/3d/PokemonViewer3D";

/*
 * Plan 09.2-09.4 — TDD del PokemonViewer3D.
 *
 * Cobertura:
 *  - Monta un contenedor con data-testid.
 *  - Crea un WebGLRenderer con alpha:true.
 *  - Al desmontar, limpia recursos (dispose).
 *  - Auto-escala: Box3.setFromObject es llamado.
 *  - visible prop controla opacity.
 *  - Teclado: ArrowLeft/ArrowRight rotan.
 *  - Drag: pointer events actualizan rotation.y.
 */

const mockDispose = vi.fn();
const mockSetClearColor = vi.fn();
const mockRender = vi.fn();
const mockSetFromObject = vi.fn();
const mockGetSize = vi.fn();
const mockGetCenter = vi.fn();
const mockSetScalar = vi.fn();
const mockPositionSet = vi.fn();

vi.mock("three", () => ({
  Vector3: class {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  },
  Scene: vi.fn(function (this: Record<string, unknown>) {
    this.add = vi.fn();
    return this;
  }),
  WebGLRenderer: vi.fn(function (this: Record<string, unknown>) {
    this.setPixelRatio = vi.fn();
    this.setSize = vi.fn();
    this.setClearColor = mockSetClearColor;
    this.domElement = document.createElement("canvas");
    this.render = mockRender;
    this.dispose = mockDispose;
    return this;
  }),
  PerspectiveCamera: vi.fn(function (this: Record<string, unknown>) {
    this.aspect = 1;
    this.updateProjectionMatrix = vi.fn();
    this.position = { set: vi.fn() };
    this.lookAt = vi.fn();
    return this;
  }),
  AmbientLight: vi.fn(function (this: Record<string, unknown>) { return this; }),
  DirectionalLight: vi.fn(function (this: Record<string, unknown>) {
    this.position = { set: vi.fn() };
    return this;
  }),
  Box3: vi.fn(function (this: Record<string, unknown>) {
    this.setFromObject = function () { mockSetFromObject(); return this; };
    this.getSize = function () { mockGetSize(); return { x: 1, y: 2, z: 1 }; };
    this.getCenter = function () { mockGetCenter(); return { x: 0, y: 0.5, z: 0 }; };
    return this;
  }),
  Color: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // ResizeObserver mock como clase (necesita 'function' para new)
  vi.stubGlobal("ResizeObserver", function (this: Record<string, unknown>) {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
    return this;
  });
  // Mock devicePixelRatio
  vi.stubGlobal("devicePixelRatio", 2);
});

function createMockModel() {
  return {
    type: "Group",
    name: "mock-model",
    rotation: { x: 0, y: 0, z: 0 },
    scale: { setScalar: mockSetScalar },
    position: { set: mockPositionSet },
  };
}

describe("PokemonViewer3D (Plan 09.2-09.4)", () => {
  it("monta un elemento contenedor con data-testid", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    expect(viewer.tagName).toBe("DIV");
    expect(viewer.getAttribute("role")).toBe("img");
    expect(viewer.getAttribute("aria-label")).toBe("Visor 3D del pokemon");
  });

  it("aplica setClearColor con alpha 0 (fondo transparente)", () => {
    const model = createMockModel();
    render(<PokemonViewer3D model={model} visible={true} />);

    expect(mockSetClearColor).toHaveBeenCalledWith(0x000000, 0);
  });

  it("al desmontar, llama a dispose del renderer", () => {
    const model = createMockModel();
    const { unmount } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    expect(mockDispose).not.toHaveBeenCalled();
    unmount();
    expect(mockDispose).toHaveBeenCalled();
  });

  it("aplica auto-escala al modelo (Box3.setFromObject)", () => {
    const model = createMockModel();
    render(<PokemonViewer3D model={model} visible={true} />);

    expect(mockSetFromObject).toHaveBeenCalled();
    expect(mockGetSize).toHaveBeenCalled();
    expect(mockGetCenter).toHaveBeenCalled();
    expect(mockSetScalar).toHaveBeenCalled();
  });

  it("visible=false refleja opacity 0", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={false} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    expect(viewer.style.opacity).toBe("0");
  });

  it("visible=true refleja opacity 1", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    expect(viewer.style.opacity).toBe("1");
  });

  it("tiene tabIndex=0 para accesibilidad por teclado", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    expect(viewer.getAttribute("tabindex")).toBe("0");
  });

  it("responde a ArrowRight rotando el modelo", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    const initialY = model.rotation.y;

    fireEvent.focus(viewer);
    fireEvent.keyDown(viewer, { key: "ArrowRight" });

    expect(model.rotation.y).toBeGreaterThan(initialY);
  });

  it("responde a ArrowLeft rotando el modelo en sentido contrario", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    const initialY = model.rotation.y;

    fireEvent.focus(viewer);
    fireEvent.keyDown(viewer, { key: "ArrowLeft" });

    expect(model.rotation.y).toBeLessThan(initialY);
  });

  it("drag hacia la derecha aumenta rotation.y", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    const initialY = model.rotation.y;

    fireEvent.pointerDown(viewer, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(viewer, { clientX: 200, pointerId: 1 });

    expect(model.rotation.y).toBeGreaterThan(initialY);

    fireEvent.pointerUp(viewer, { clientX: 200, pointerId: 1 });
  });

  it("drag hacia la izquierda disminuye rotation.y", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    const initialY = model.rotation.y;

    fireEvent.pointerDown(viewer, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(viewer, { clientX: 100, pointerId: 1 });

    expect(model.rotation.y).toBeLessThan(initialY);

    fireEvent.pointerUp(viewer, { clientX: 100, pointerId: 1 });
  });

  it("sin foco, las teclas no rotan el modelo", () => {
    const model = createMockModel();
    const { getByTestId } = render(
      <PokemonViewer3D model={model} visible={true} />,
    );

    const viewer = getByTestId("pokemon-viewer-3d");
    const before = model.rotation.y;

    fireEvent.keyDown(viewer, { key: "ArrowRight" });

    expect(model.rotation.y).toBe(before);
  });
});
