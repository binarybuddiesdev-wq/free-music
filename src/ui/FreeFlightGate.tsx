import { useEffect } from "react";
import { SECTIONS, useAether } from "../store";

/** While the free-flight section (3) is active, scroll is captured by OrbitControls
 *  (wheel = zoom). "Resume journey" releases the lock and skips to section 4. */
export function FreeFlightGate() {
  const section = useAether((s) => s.section);
  const setFlightLock = useAether((s) => s.setFlightLock);
  const locked = section === 3;

  useEffect(() => {
    if (locked) useAether.setState({ flightLock: true });
  }, [locked]);

  useEffect(() => {
    if (!locked && useAether.getState().flightLock) {
      useAether.setState({ flightLock: false });
    }
  }, [locked]);

  if (!locked) return null;

  const resume = () => {
    useAether.setState({ flightLock: false });
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const target = ((4 + 0.5) / SECTIONS.length) * total;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 90,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 60,
          padding: "8px 18px",
          borderRadius: 999,
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          fontFamily: "var(--font-body)",
          fontSize: 11,
          letterSpacing: "0.2em",
          color: "var(--dim)",
          pointerEvents: "none",
        }}
      >
        FREE FLIGHT · click a planet to focus · drag to orbit · scroll to zoom · right-drag to pan
      </div>
      <button
        onClick={resume}
        style={{
          position: "fixed",
          bottom: "6vh",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 60,
          padding: "13px 28px",
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
        }}
      >
        Resume journey →
      </button>
    </>
  );
}
