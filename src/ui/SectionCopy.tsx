import { SECTIONS, useAether } from "../store";
import { scrollState } from "../hooks/useScrollTimeline";

export function SectionCopy() {
  const section = useAether((s) => s.section);
  const s = SECTIONS[section];
  const isLast = section === SECTIONS.length - 1;
  const isFirst = section === 0;

  const scrollDown = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: ((section + 1) / SECTIONS.length) * total, behavior: "smooth" });
  };

  const replay = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  void scrollState;

  return (
    <div
      key={section}
      style={{
        position: "fixed",
        left: "6vw",
        bottom: "10vh",
        zIndex: 40,
        maxWidth: "min(480px, 80vw)",
        pointerEvents: "none",
        animation: "copyIn 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 11,
          letterSpacing: "0.4em",
          color: "var(--accent-2)",
          marginBottom: 14,
          textShadow: "0 0 20px rgba(88,230,217,0.5)",
        }}
      >
        {s.eyebrow}
      </div>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: "clamp(40px, 6vw, 76px)",
          lineHeight: 1.02,
          letterSpacing: "-0.01em",
          marginBottom: 18,
          textShadow: "0 4px 40px rgba(0,0,0,0.6)",
        }}
      >
        {s.title}
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 300,
          fontSize: 15,
          lineHeight: 1.7,
          color: "var(--dim)",
          maxWidth: 380,
        }}
      >
        {s.body}
      </p>

      {isFirst && (
        <button onClick={scrollDown} style={ctaStyle}>
          Begin the descent ↓
        </button>
      )}
      {isLast && (
        <div style={{ pointerEvents: "auto" }}>
          <button onClick={replay} style={ctaStyle}>
            ↻ Run it back
          </button>
          <div style={{ marginTop: 26, fontSize: 11, letterSpacing: "0.2em", color: "rgba(238,241,255,0.35)", fontFamily: "var(--font-body)" }}>
            AETHER — an interactive journey · built with react-three-fiber
          </div>
        </div>
      )}
      {!isFirst && !isLast && (
        <div style={{ marginTop: 20, fontSize: 11, letterSpacing: "0.25em", color: "rgba(238,241,255,0.3)", fontFamily: "var(--font-body)" }}>
          scroll ↓
        </div>
      )}
    </div>
  );
}

const ctaStyle: React.CSSProperties = {
  pointerEvents: "auto",
  marginTop: 26,
  padding: "13px 26px",
  borderRadius: 999,
  border: "1px solid rgba(139,123,255,0.45)",
  background: "var(--glass)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  letterSpacing: "0.12em",
  cursor: "pointer",
  transition: "all 0.35s ease",
  boxShadow: "0 0 24px rgba(139,123,255,0.18), inset 0 0 18px rgba(139,123,255,0.08)",
};
