"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "./loading-pikachu.css";

/**
 * Plan 06.7 — `LoadingPikachu`: animación discreta del gif del
 * pikachu moviéndose de izquierda a derecha mientras hay una
 * carga de datos activa en la Pokédex.
 *
 * **Contrato firme**: la animación SIEMPRE se muestra hasta el
 * final. El pikachu SIEMPRE termina su ciclo saliendo por la
 * derecha de la pantalla, **nunca se corta a mitad**. Esto se
 * cumple aunque `loading` pase a `false` mientras el pikachu
 * aún está cruzando: el componente espera al `animationend` (o
 * al timer de respaldo si la CSS animation no dispara) antes de
 * desmontarse.
 *
 * Comportamiento (alineado con el borrador y el plan):
 *
 *  - Cuando `loading=true` se monta un nodo con un `<img>` que
 *    apunta a `/loading-pikachu.gif`. Se ejecuta una animación
 *    CSS que desplaza el gif de `translateX(0)` a
 *    `translateX(120vw)` con `opacity` yendo de 1 → 0.
 *
 *  - Al disparar `animationend` (la animación siempre termina
 *    con el pikachu fuera de pantalla, nunca a mitad):
 *      · Si `loading` sigue `true` → se reinicia el ciclo. NO se
 *        reinicia si YA está animando (un flag `isAnimatingRef`
 *        lo impide: si entran múltiples cargas durante la
 *        animación actual, el pikachu no se pisa a sí mismo).
 *      · Si `loading` ahora es `false` → se desmonta el
 *        componente para liberar el DOM. **Esto ocurre
 *        exclusivamente tras completar el ciclo de animación
 *        actual**, garantizando que el usuario SIEMPRE ve la
 *        animación completa.
 *
 *  - Si `loading` pasa a `false` DURANTE la animación, el
 *    componente espera a `animationend` para desmontar (el
 *    pikachu sale de pantalla de forma natural, no se corta a
 *    mitad). Como respaldo, un `setTimeout` con la duración
 *    nominal cancelable garantiza el desmontaje aunque el
 *    `animationend` no dispare (caso jsdom, CSS animations
 *    deshabilitadas, `prefers-reduced-motion`, etc.).
 *
 *  - Tamaño pequeño: 28×28 px (≤ 40px en cualquier dimensión).
 *    El tamaño se aplica vía INLINE STYLE en el nodo raíz para
 *    ser independiente del CSS y verificable en tests.
 *
 *  - Accesibilidad: `role="status"` + `aria-live="polite"` para
 *    anunciar a lectores de pantalla que la app está cargando.
 *
 * ¿Por qué NO usa `next/image`? El componente renderiza un GIF
 * animado y `next/image` aplicaría optimización que convierte
 * GIFs animados a estáticos. Usamos `<img>` directamente para
 * preservar la animación nativa del GIF.
 *
 * Implementación:
 *
 *  - El listener de `animationend` se monta con `addEventListener`
 *    directamente (no como prop React) para que su limpieza sea
 *    explícita y verificable. El cleanup del `useEffect` se
 *    encarga de `removeEventListener` al desmontar.
 *
 *  - NO hay rama de "desmontar inmediato". El pikachu SIEMPRE
 *    completa su ciclo actual antes de desaparecer, incluso si
 *    la carga terminó hace mucho. Esto se valida en los tests.
 */

const DEFAULT_DURATION_MS = 2400;

export interface LoadingPikachuProps {
  /** Si es `true`, se muestra la animación. Si es `false`, no se renderiza nada. */
  loading: boolean;
  /** Clase opcional para que el consumidor posicione el pikachu. */
  className?: string;
  /**
   * Estilo inline opcional (para posicionamiento concreto del
   * padre). El consumidor suele pasar `{ position: "fixed",
   * right: "12px", bottom: "12px", pointerEvents: "none" }`.
   */
  style?: CSSProperties;
}

export function LoadingPikachu({
  loading,
  className,
  style,
}: LoadingPikachuProps) {
  // `mounted` se desactiva cuando la carga termina Y la animación
  // actual ha concluido. Mientras tanto permanece montado para
  // que el pikachu salga de pantalla de forma natural.
  const [mounted, setMounted] = useState<boolean>(loading);

  // Refs transitorios (sin re-render):
  // - `isAnimatingRef`: flag que indica si ya hay un ciclo en
  //   curso. Si entran múltiples "loading=true" durante el
  //   mismo ciclo, sólo el primer animationend programa un
  //   reinicio; los siguientes son no-op.
  // - `pendingUnmountRef`: indica si al terminar la animación
  //   actual debemos desmontar (porque `loading` pasó a false).
  // - `unmountTimerRef`: timeout de respaldo para garantizar
  //   el desmontaje aunque `animationend` no dispare.
  // - `imgRef`: referencia al `<img>` para forzar reflow al
  //   reiniciar.
  const isAnimatingRef = useRef<boolean>(false);
  const pendingUnmountRef = useRef<boolean>(false);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Lee la duración de la variable CSS `--loading-pikachu-duration`
  // (exportada como custom property). Por defecto 2400 ms.
  const readDuration = useCallback((): number => {
    if (typeof window === "undefined") return DEFAULT_DURATION_MS;
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--loading-pikachu-duration")
      .trim();
    if (!raw) return DEFAULT_DURATION_MS;
    const ms = Number.parseInt(raw.replace(/ms$/, ""), 10);
    return Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_DURATION_MS;
  }, []);

  // Si `loading` pasa a `true` y no estamos montados → montar.
  if (loading && !mounted) {
    setMounted(true);
  }

  // Cuando entramos en estado "animando" (montaje inicial con
  // loading=true o reset tras fin de animación con carga
  // pendiente), marcamos el ref. Lo hacemos en un effect para
  // cumplir con la regla `react-hooks/refs` que prohíbe
  // actualizar refs durante render.
  useEffect(() => {
    if (mounted && loading) {
      isAnimatingRef.current = true;
    }
  }, [mounted, loading]);

  // Helper: programa el desmontaje tras la duración de la
  // animación actual (respaldo si `animationend` no dispara).
  const scheduleUnmount = useCallback(() => {
    if (unmountTimerRef.current) return;
    const ms = readDuration();
    unmountTimerRef.current = setTimeout(() => {
      unmountTimerRef.current = null;
      pendingUnmountRef.current = false;
      setMounted(false);
    }, ms);
  }, [readDuration]);

  // Helper: cancela el timer de respaldo (cuando `animationend`
  // ya disparó el desmontaje).
  const cancelUnmountTimer = useCallback(() => {
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!loading && mounted && !pendingUnmountRef.current) {
      // La carga terminó. NO desmontamos inmediatamente:
      // programamos el desmontaje para que el pikachu salga
      // de pantalla de forma natural (cumple el contrato "la
      // animación SIEMPRE se muestra hasta el final"). Si la
      // animación CSS dispara `animationend`, el handler
      // desmontará al completarse. Si no (jsdom, reduced
      // motion, CSS no aplicada), el timer de respaldo lo
      // hará tras la duración nominal.
      pendingUnmountRef.current = true;
      scheduleUnmount();
    }
    if (loading) {
      // Cancelamos cualquier unmount pendiente: la carga vuelve
      // a estar activa.
      pendingUnmountRef.current = false;
      cancelUnmountTimer();
    }
  }, [loading, mounted, scheduleUnmount, cancelUnmountTimer]);

  // Handler de animationend. Memorizado para que el listener
  // añadido/eliminado en `useEffect` sea estable.
  const handleAnimationEnd = useCallback(() => {
    isAnimatingRef.current = false;
    cancelUnmountTimer();

    if (pendingUnmountRef.current) {
      pendingUnmountRef.current = false;
      setMounted(false);
      return;
    }

    // Si YA hay un reinicio programado por otro animationend
    // (escenario de cargas múltiples simultáneas), no hacemos
    // nada. Esto evita reinicios redundantes que pisarían la
    // animación en curso.
    if (isAnimatingRef.current) {
      return;
    }

    isAnimatingRef.current = true;
    // Forzar reflow para reiniciar la animación CSS desde el
    // principio. Truco estándar: leer una propiedad geométrica
    // fuerza al navegador a aplicar el layout pendiente.
    const img = imgRef.current;
    if (img) {
      void img.offsetWidth;
      const restartKey = img.style.animation;
      img.style.animation = "none";
      void img.offsetHeight;
      img.style.animation = restartKey;
    }
  }, [cancelUnmountTimer]);

  // Listeners de animationend: addEventListener directo para
  // poder verificar la limpieza en tests.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    img.addEventListener("animationend", handleAnimationEnd);
    return () => {
      img.removeEventListener("animationend", handleAnimationEnd);
    };
  }, [handleAnimationEnd, mounted]);

  // Limpieza al desmontar: cancela timers pendientes.
  useEffect(() => {
    return () => {
      if (unmountTimerRef.current) {
        clearTimeout(unmountTimerRef.current);
        unmountTimerRef.current = null;
      }
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      data-testid="loading-pikachu"
      data-loading={loading ? "true" : "false"}
      data-state="run"
      role="status"
      aria-live="polite"
      aria-label="Cargando datos del Pokémon"
      className={
        className ? `loading-pikachu ${className}` : "loading-pikachu"
      }
      style={{
        width: 28,
        height: 28,
        ...style,
      }}
    >
      {/*
        eslint-disable-next-line @next/next/no-img-element --
        Usamos <img> directamente porque `next/image` rompe la
        animación nativa del GIF (lo convierte a estático). Es
        una decisión intencional y documentada en el bloque JSDoc
        del componente: "Por qué NO usa `next/image`".
      */}
      <img
        ref={imgRef}
        src="/loading-pikachu.gif"
        alt="Cargando datos del Pokémon"
        width={28}
        height={28}
        className="loading-pikachu__img"
        draggable={false}
      />
    </div>
  );
}

/**
 * Duración nominal de la animación (exportada para tests y
 * configuración por CSS). Por defecto 2400 ms. Puede
 * sobreescribirse con la variable CSS
 * `--loading-pikachu-duration` desde fuera (tests lo hacen).
 */
export const LOADING_PIKACHU_DURATION_MS = DEFAULT_DURATION_MS;
