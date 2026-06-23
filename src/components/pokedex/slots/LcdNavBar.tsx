"use client";

/**
 * Barra de navegación estilo LCD verde monocromo para paneles de stats
 * y evoluciones.
 */
export function LcdNavBar({ title }: { title: string }) {
  return (
    <div
      className="lcd-navbar"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "3px 8px",
        borderBottom: "2px solid #1a3a1a",
        marginBottom: "4px",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px)",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "#33FF33",
          fontFamily: "monospace",
          letterSpacing: "3px",
          textTransform: "uppercase",
          textShadow: "0 0 4px rgba(51,255,51,0.4)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {title}
      </span>
    </div>
  );
}
