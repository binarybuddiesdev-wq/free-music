import { useEffect } from "react";
import { pickTier, useAether } from "./store";
import { useScrollTimeline } from "./hooks/useScrollTimeline";
import { Experience } from "./scene/Experience";
import { Preloader } from "./ui/Preloader";
import { Dock } from "./ui/Dock";
import { ProgressRail } from "./ui/ProgressRail";
import { SectionCopy } from "./ui/SectionCopy";
import { PlanetCard } from "./ui/PlanetCard";

export default function App() {
  const phase = useAether((s) => s.phase);
  useScrollTimeline();

  useEffect(() => {
    useAether.setState({ tier: pickTier() });
  }, []);

  return (
    <>
      <div style={{ position: "fixed", inset: 0 }}>
        <Experience />
      </div>
      {phase === "preloader" ? <Preloader /> : (
        <>
          <Dock />
          <ProgressRail />
          <SectionCopy />
          <PlanetCard />
        </>
      )}
    </>
  );
}
