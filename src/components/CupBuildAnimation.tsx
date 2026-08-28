"use client";

import { CupBuildHeroFrame } from "@/components/CupBuildHeroFrame";
import type { AppOrder } from "@/types/menu";
import {
  CUP_BUILD_MS,
  baseYogurtForOrder,
  blendedYogurtForOrder,
  expandToppingBits,
  phaseAt,
  toppingsForOrder,
  type BuildPhase,
} from "@/lib/cup-build-order";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  footer,
  /** Force full play even when OS prefers reduced motion (dev / QA). */
  forceMotion = false,
  /** Product-photo hero frame (default) vs compact dev card. */
  presentation = "hero",
}: {
  order: AppOrder;
  reducedMotion: boolean;
  onFinished: () => void;
  footer?: ReactNode;
  forceMotion?: boolean;
  presentation?: "hero" | "card";
}) {
  const basePalette = useMemo(() => baseYogurtForOrder(order), [order]);
  const blendedPalette = useMemo(() => blendedYogurtForOrder(order), [order]);
  const bits = useMemo(
    () => expandToppingBits(toppingsForOrder(order)),
    [order],
  );
  const skipMotion = reducedMotion && !forceMotion;
  const [phase, setPhase] = useState<BuildPhase>(skipMotion ? "reveal" : "cup");
  const [sceneReady, setSceneReady] = useState(false);
  const [finished, setFinished] = useState(skipMotion);
  /** Wall-clock 0–1 progress — read from R3F useFrame (avoids React thrash). */
  const progressRef = useRef(skipMotion ? 1 : 0);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const transparentStage = presentation === "hero";

  useEffect(() => {
    if (skipMotion) {
      setPhase("reveal");
      setFinished(true);
      progressRef.current = 1;
      finishedRef.current();
      return;
    }
    if (sceneReady) return;
    const t = window.setTimeout(() => setSceneReady(true), 400);
    return () => window.clearTimeout(t);
  }, [skipMotion, sceneReady]);

  useEffect(() => {
    if (skipMotion) return;
    if (!sceneReady) return;

    setPhase("cup");
    setFinished(false);
    progressRef.current = 0;
    const start = performance.now();
    let raf = 0;
    let cancelled = false;
    let lastPhase: BuildPhase = "cup";
    const tick = (now: number) => {
      if (cancelled) return;
      const e = Math.min(CUP_BUILD_MS, now - start);
      progressRef.current = Math.min(1, Math.max(0, e / CUP_BUILD_MS));
      const next = phaseAt(e);
      if (next !== lastPhase) {
        lastPhase = next;
        setPhase(next);
      }
      if (e >= CUP_BUILD_MS) {
        setPhase("reveal");
        setFinished(true);
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
  }, [skipMotion, sceneReady]);

  const buildFooter =
    footer ??
    (presentation === "hero" && !finished ? (
      <p className="cup-build-hero__status">Making your cup…</p>
    ) : null);

  const stage = (
    <div
      className={`cup-build cup-build--r3f${skipMotion ? " cup-build--reduced" : ""}${forceMotion ? " cup-build--force" : ""}${transparentStage ? " cup-build--hero-stage" : ""}`}
      data-phase={phase}
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      <div
        className={`cup-build__counter cup-build__counter--r3f${transparentStage ? " cup-build__counter--hero" : ""}`}
      >
        {forceMotion ? (
          <span className="cup-build__phase-label">{phase}</span>
        ) : null}
        <CupBuildScene
          progressRef={progressRef}
          basePalette={basePalette}
          blendedPalette={blendedPalette}
          bits={bits}
          onReady={onSceneReady}
          transparentStage={transparentStage}
        />
      </div>
    </div>
  );

  if (presentation === "hero") {
    return (
      <CupBuildHeroFrame stage={stage} footer={buildFooter} showTagline />
    );
  }

  return stage;
}
