import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { TIER_SETTINGS, useAether } from "../store";
import { CameraRig } from "./CameraRig";
import { FadeGroup } from "./FadeGroup";
import { HeroMorph } from "./sections/HeroMorph";
import { WarpTunnel } from "./sections/WarpTunnel";
import { NebulaField } from "./sections/NebulaField";
import { Celestia } from "./sections/Celestia";
import { Singularity } from "./sections/Singularity";
import { AsteroidField } from "./sections/AsteroidField";
import { ConstellationOutro } from "./sections/ConstellationOutro";
import { FlashOverlay } from "./fx/FlashOverlay";
import { PostFX } from "./PostFX";

export function Experience() {
  const tier = useAether((s) => s.tier);
  const phase = useAether((s) => s.phase);
  const settings = TIER_SETTINGS[tier];
  const [glOk, setGlOk] = useState(true);

  useEffect(() => {
    const test = document.createElement("canvas");
    if (!test.getContext("webgl2") && !test.getContext("webgl")) setGlOk(false);
  }, []);

  if (!glOk) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#05060e" }}>
        <p style={{ color: "#eef1ff", fontFamily: "var(--font-body)", opacity: 0.7 }}>
          AETHER needs WebGL to fly. Your browser says no — try a modern desktop browser.
        </p>
      </div>
    );
  }

  return (
    <Canvas
      dpr={settings.dpr}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      camera={{ fov: 60, near: 0.1, far: 400, position: [0, 0, 14] }}
      onCreated={({ gl }) => gl.setClearColor("#05060e", 1)}
      style={{ opacity: phase === "preloader" ? 0 : 1, transition: "opacity 1.2s ease" }}
    >
      <CameraRig />
      <FlashOverlay />

      <FadeGroup index={0}>
        <HeroMorph count={settings.heroParticles} />
      </FadeGroup>
      <FadeGroup index={1}>
        <WarpTunnel count={settings.warpStreaks} />
      </FadeGroup>
      <FadeGroup index={2}>
        <NebulaField layers={settings.nebulaLayers} />
      </FadeGroup>
      <FadeGroup index={3}>
        <Celestia />
      </FadeGroup>
      <FadeGroup index={4}>
        <Singularity />
      </FadeGroup>
      <FadeGroup index={5}>
        <AsteroidField count={settings.asteroids} />
      </FadeGroup>
      <FadeGroup index={6}>
        <ConstellationOutro count={Math.min(settings.heroParticles, 24000)} />
      </FadeGroup>

      <PostFX tier={tier} />
    </Canvas>
  );
}
