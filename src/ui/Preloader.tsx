import { useEffect, useRef, useState } from "react";
import { useAether } from "../store";

const LOG_LINES = [
  "link established · deep-field relay 7",
  "calibrating particle lattice … 100k nodes",
  "seeding simplex fields · 5 octaves",
  "charging accretion shaders",
  "pressurizing warp manifold",
  "aligning constellation glyphs",
  "all systems nominal — welcome to AETHER",
];

export function Preloader() {
  const setPhase = useAether((s) => s.setPhase);
  const [pct, setPct] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(100, p + 1.4 + Math.random() * 2.4);
      setPct(p);
      const lineCount = Math.floor((p / 100) * LOG_LINES.length);
      setLogs(LOG_LINES.slice(0, Math.max(1, lineCount)));
      if (p >= 100 && !done.current) {
        done.current = true;
        clearInterval(iv);
        setTimeout(() => setLeaving(true), 400);
        setTimeout(() => {
          window.scrollTo(0, 0);
          setPhase("experience");
          useAether.setState({ startedAt: performance.now() });
        }, 1400);
      }
    }, 90);
    return () => clearInterval(iv);
  }, [setPhase]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        background: "#05060e",
        clipPath: leaving ? "circle(0% at 50% 50%)" : "circle(150% at 50% 50%)",
        transition: "clip-path 1s cubic-bezier(0.7, 0, 0.3, 1)",
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(44px, 8vw, 96px)", letterSpacing: "0.04em" }}>
        AETHER
      </div>
      <div style={{ width: "min(360px, 70vw)", height: 1, background: "rgba(255,255,255,0.12)", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -0.5,
            height: 2,
            width: `${pct}%`,
            background: "linear-gradient(90deg, #58e6d9, #8b7bff)",
            boxShadow: "0 0 12px rgba(139,123,255,0.8)",
            transition: "width 0.12s linear",
          }}
        />
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, letterSpacing: "0.35em", color: "var(--dim)" }}>
        {Math.floor(pct).toString().padStart(3, "0")}%
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 40,
          right: 40,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontFamily: "var(--font-body)",
          fontSize: 11,
          color: "rgba(238,241,255,0.4)",
          letterSpacing: "0.08em",
        }}
      >
        {logs.map((l, i) => (
          <div key={i} style={{ opacity: i === logs.length - 1 ? 1 : 0.45 }}>
            <span style={{ color: "#58e6d9" }}>›</span> {l}
          </div>
        ))}
      </div>
    </div>
  );
}
