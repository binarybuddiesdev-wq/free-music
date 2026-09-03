import { SECTIONS, useAether } from "../store";

export function Dock() {
  const section = useAether((s) => s.section);

  const jump = (i: number) => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: ((i + 0.5) / SECTIONS.length) * total, behavior: "smooth" });
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        gap: 4,
        padding: "6px 8px",
        borderRadius: 999,
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
      }}
    >
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => jump(i)}
          style={{
            padding: "7px 14px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: i === section ? "#0a0b16" : "var(--dim)",
            background: i === section ? "linear-gradient(90deg, #58e6d9, #8b7bff)" : "transparent",
            transition: "all 0.35s ease",
          }}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
