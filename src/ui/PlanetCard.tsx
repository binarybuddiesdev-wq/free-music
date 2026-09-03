import { useEffect, useState } from "react";
import type { PlanetCfg } from "../scene/sections/SolarSystem";

type Listener = (cfg: PlanetCfg | null) => void;
let listeners = new Set<Listener>();

export const planetInfoBus = {
  set(cfg: PlanetCfg | null) {
    listeners.forEach((fn) => fn(cfg));
  },
};

export function PlanetCard() {
  const [cfg, setCfg] = useState<PlanetCfg | null>(null);

  useEffect(() => {
    const fn: Listener = (c) => setCfg(c);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  if (!cfg) return null;

  return (
    <div
      key={cfg.name}
      style={{
        position: "fixed",
        right: "7vw",
        top: "22vh",
        zIndex: 45,
        width: 300,
        padding: "22px 24px",
        borderRadius: 18,
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        pointerEvents: "none",
        animation: "copyIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both",
      }}
    >
      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.35em", color: "var(--accent-2)", marginBottom: 8 }}>
        PLANETARY DOSSIER
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 34, marginBottom: 4 }}>{cfg.name}</div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--dim)", marginBottom: 12, letterSpacing: "0.05em" }}>
        {cfg.moons?.length ?? 0} moon{(cfg.moons?.length ?? 0) === 1 ? "" : "s"} · orbit {cfg.dist.toFixed(1)} AU-rel
      </div>
      <p style={{ fontFamily: "var(--font-body)", fontWeight: 300, fontSize: 13, lineHeight: 1.65, color: "rgba(238,241,255,0.8)" }}>
        {cfg.info}
      </p>
      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        {cfg.colors.map((c) => (
          <div key={c} style={{ width: 26, height: 6, borderRadius: 3, background: c }} />
        ))}
      </div>
    </div>
  );
}
