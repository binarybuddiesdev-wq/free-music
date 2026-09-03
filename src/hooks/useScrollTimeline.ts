import { useEffect, useRef } from "react";
import { SECTION_COUNT, useAether } from "../store";

export type ScrollState = {
  raw: number;
  damped: number;
  velocity: number;
};

export const scrollState: ScrollState = { raw: 0, damped: 0, velocity: 0 };

const SPACER_VH = 800;

export function useScrollTimeline() {
  const setSection = useAether((s) => s.setSection);
  const lastSection = useRef(-1);

  useEffect(() => {
    const spacer = document.createElement("div");
    spacer.id = "scroll-spacer";
    spacer.style.height = `${SPACER_VH}vh`;
    spacer.style.pointerEvents = "none";
    document.body.appendChild(spacer);

    let raf = 0;
    const onScroll = () => {
      const max = Math.max(1, window.scrollY);
      const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollState.raw = Math.min(1, Math.max(0, max / total));
    };

    const tick = () => {
      const prev = scrollState.damped;
      const target = scrollState.raw;
      scrollState.damped += (target - scrollState.damped) * 0.07;
      scrollState.velocity = scrollState.damped - prev;

      let idx = Math.min(SECTION_COUNT - 1, Math.floor(scrollState.damped * SECTION_COUNT + 0.0001));

      // Free-flight lock: while active, journey progress is pinned to the
      // section-3 band. Releasing the flag (Resume button / dock jump)
      // immediately restores normal scroll -> downstream sections work again.
      const store = useAether.getState();
      if (store.flightLock) {
        const lo = 3 / SECTION_COUNT;
        const hi = 4.99 / SECTION_COUNT;
        if (scrollState.raw < lo) {
          scrollState.raw = lo;
          if (scrollState.damped < lo + 0.001) scrollState.damped = lo + 0.001;
        } else if (scrollState.raw > hi) {
          scrollState.raw = hi;
          if (scrollState.damped > hi - 0.001) scrollState.damped = hi - 0.001;
        }
        idx = 3;
      }

      if (idx !== lastSection.current) {
        lastSection.current = idx;
        setSection(idx);
      }
      raf = requestAnimationFrame(tick);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      spacer.remove();
    };
  }, [setSection]);
}
