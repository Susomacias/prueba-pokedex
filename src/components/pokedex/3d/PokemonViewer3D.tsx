"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";

const TARGET_SIZE = 2;
const AUTO_ROTATE_SPEED = 0.005;
const DRAG_SENSITIVITY = 0.005;
const ROTATION_RESUME_DELAY = 500;

export interface PokemonViewer3DProps {
  model: object;
  visible: boolean;
}

export function PokemonViewer3D({ model, visible }: PokemonViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Drag state
  const isDragging = useRef(false);
  const prevX = useRef(0);
  const autoRotatePaused = useRef(false);
  const rotateResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  // Keyboard focus state
  const isFocused = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100,
    );
    camera.position.set(0, 2, 4);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 5, 3);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4488cc, 0.4);
    fillLight.position.set(-2, 0, -2);
    scene.add(fillLight);

    // Auto-escala y posicionamiento del modelo
    const modelGroup = model as THREE.Group;
    modelRef.current = modelGroup;

    const box = new THREE.Box3().setFromObject(modelGroup);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? TARGET_SIZE / maxDim : 1;
    modelGroup.scale.setScalar(scale);

    const center = box.getCenter(new THREE.Vector3());
    modelGroup.position.set(-center.x * scale, -center.y * scale + 0.5, -center.z * scale);

    scene.add(modelGroup);

    // Animación
    function animate() {
      rafRef.current = requestAnimationFrame(animate);

      // Auto-rotación (solo si no está arrastrando y no está pausada)
      if (!isDragging.current && !autoRotatePaused.current) {
        modelGroup.rotation.y += AUTO_ROTATE_SPEED;
      }

      renderer.render(scene, camera);
    }

    rafRef.current = requestAnimationFrame(animate);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (rotateResumeTimer.current) {
        clearTimeout(rotateResumeTimer.current);
      }
    };
  }, [model]);

  // ===== Drag horizontal =====

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    prevX.current = e.clientX;
    autoRotatePaused.current = true;
    setGrabbing(true);
    if (rotateResumeTimer.current) {
      clearTimeout(rotateResumeTimer.current);
    }
    const target = e.target as HTMLElement;
    if (typeof target.setPointerCapture === "function") {
      target.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !modelRef.current) return;
    const deltaX = e.clientX - prevX.current;
    prevX.current = e.clientX;
    modelRef.current.rotation.y += deltaX * DRAG_SENSITIVITY;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    setGrabbing(false);
    const target = e.target as HTMLElement;
    if (typeof target.releasePointerCapture === "function") {
      target.releasePointerCapture(e.pointerId);
    }
    // Reanudar auto-rotación tras delay
    rotateResumeTimer.current = setTimeout(() => {
      autoRotatePaused.current = false;
    }, ROTATION_RESUME_DELAY);
  }, []);

  // Prevenir scroll vertical en el viewer durante drag
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging.current) {
      e.preventDefault();
    }
  }, []);

  // ===== Teclado (accesibilidad) =====

  const KEY_ROTATION_STEP = 0.1;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isFocused.current || !modelRef.current) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      modelRef.current.rotation.y -= KEY_ROTATION_STEP;
      autoRotatePaused.current = true;
      if (rotateResumeTimer.current) clearTimeout(rotateResumeTimer.current);
      rotateResumeTimer.current = setTimeout(() => {
        autoRotatePaused.current = false;
      }, ROTATION_RESUME_DELAY);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      modelRef.current.rotation.y += KEY_ROTATION_STEP;
      autoRotatePaused.current = true;
      if (rotateResumeTimer.current) clearTimeout(rotateResumeTimer.current);
      rotateResumeTimer.current = setTimeout(() => {
        autoRotatePaused.current = false;
      }, ROTATION_RESUME_DELAY);
    }
  }, []);

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="pokemon-viewer-3d"
      role="img"
      aria-label="Visor 3D del pokemon"
      tabIndex={0}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchMove={handleTouchMove}
      onKeyDown={handleKeyDown}
      style={{
        position: "absolute",
        inset: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 400ms ease-out",
        cursor: grabbing ? "grabbing" : "grab",
        outline: "none",
        pointerEvents: visible ? "auto" : "none",
      }}
    />
  );
}
