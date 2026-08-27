"use client";

import type { AppOrder } from "@/types/menu";
import {
  CUP_BUILD_MS,
  buildProgress,
  expandToppingBits,
  phaseAt,
  toppingsForOrder,
  yogurtForOrder,
  type BuildPhase,
} from "@/lib/cup-build-order";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

export { CUP_BUILD_MS };
export type { BuildPhase };

const CupBuildScene = dynamic(
  () =>
    import("@/components/CupBuildScene").then((m) => m.CupBuildScene),
  {
    ssr: false,
    loading: () => <div className="cup-build__canvas-fallback" />,
  },
);

export function CupBuildAnimation({
  order,
  reducedMotion,
  onFinished,
  /** Force full play even when OS prefers reduced motion (dev / QA). */
  forceMotion = false,
}: {
  order: AppOrder;
  reducedMotion: boolean;
  onFinished: () => void;
  forceMotion?: boolean;
}) {
  const yogurt = useMemo(() => yogurtForOrder(order), [order]);
  const bits = useMemo(
    () => expandToppingBits(toppingsForOrder(order)),
    [order],
  );
  const skipMotion = reducedMotion && !forceMotion;
  const [phase, setPhase] = useState<BuildPhase>(skipMotion ? "reveal" : "cup");
  const [progress, setProgress] = useState(skipMotion ? 1 : 0);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (skipMotion) {
      setPhase("reveal");
      setProgress(1);
      finishedRef.current();
      return;
    }
    setPhase("cup");
    setProgress(0);
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;
    let cancelled = false;
    const tick = (now: number) => {
      if (cancelled) return;
      elapsed += Math.min(Math.max(now - last, 0), 48);
      last = now;
      const e = Math.min(CUP_BUILD_MS, elapsed);
      setProgress(buildProgress(e));
      setPhase(phaseAt(e));
      if (e >= CUP_BUILD_MS) {
        finishedRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [skipMotion]);

  return (
    <div
      className={`cup-build cup-build--r3f${skipMotion ? " cup-build--reduced" : ""}${forceMotion ? " cup-build--force" : ""}`}
      data-phase={phase}
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      <div className="cup-build__counter cup-build__counter--r3f">
        {forceMotion ? (
          <span className="cup-build__phase-label">{phase}</span>
        ) : null}
        <CupBuildScene
          progress={progress}
          palette={yogurt}
          bits={bits}
        />
      </div>
    </div>
  );
}
