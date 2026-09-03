import { useEffect, useRef, useState } from "react";
import { SECTIONS, useAether } from "../store";

export function ProgressRail() {
  const section = useAether((s) => s.section);
  const [p, setP] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const mod = (globalThis as unknown as { __aether_scroll?: { damped: number } }).__aether_scroll;
    void mod;
    const tick = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - window.innerHeight;
      setP(total > 0 ? window.scrollY / total : 0);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        right: 26,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 14,
      }}
    >
      {SECTIONS.map((s, i) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: i === section ? "var(--ink)" : "transparent",
              transition: "color 0.3s ease",
              textTransform: "uppercase",
            }}
          >
            {s.label}
          </span>
          <div
            style={{
              width: i === section ? 30 : 12,
              height: 2,
              borderRadius: 2,
              background: i <= section ? "linear-gradient(90deg, #58e6d9, #8b7bff)" : "rgba(255,255,255,0.2)",
              transition: "all 0.4s cubic-bezier(0.6, 0, 0.3, 1)",
              boxShadow: i === section ? "0 0 8px rgba(139,123,255,0.7)" : "none",
            }}
          />
        </div>
      ))}
      <div style={{ marginTop: 6, height: 60, width: 1, background: "rgba(255,255,255,0.15)", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: -0.5,
            width: 2,
            height: `${p * 100}%`,
            background: "#58e6d9",
            boxShadow: "0 0 6px #58e6d9",
          }}
        />
      </div>
    </div>
  );
}
