import { useEffect, useRef } from "react";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, type ChromaticAberrationEffect } from "postprocessing";
import * as THREE from "three";
import { scrollState } from "../hooks/useScrollTimeline";
import type { Tier } from "../store";

export function PostFX({ tier }: { tier: Tier }) {
  const caRef = useRef<ChromaticAberrationEffect>(null);

  useEffect(() => {
    if (tier !== "high") return;
    let raf = 0;
    const tick = () => {
      if (caRef.current) {
        const v = Math.abs(scrollState.velocity);
        const s = 0.0004 + Math.min(v * 0.05, 0.004);
        caRef.current.offset.set(s, s);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tier]);

  if (tier === "low") {
    return (
      <EffectComposer>
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer>
      <Bloom
        mipmapBlur
        intensity={tier === "high" ? 1.15 : 0.8}
        luminanceThreshold={tier === "high" ? 0.25 : 0.35}
        luminanceSmoothing={0.2}
      />
      {tier === "high" ? (
        <ChromaticAberration
          ref={caRef as never}
          offset={new THREE.Vector2(0.0006, 0.0006)}
          radialModulation={false}
          modulationOffset={0}
          blendFunction={BlendFunction.NORMAL}
        />
      ) : null}
      <Vignette eskil={false} offset={0.2} darkness={0.75} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.12} />
    </EffectComposer>
  );
}
