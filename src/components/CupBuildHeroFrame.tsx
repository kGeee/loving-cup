"use client";

import type { ReactNode } from "react";

/** Hero-cones product photo + bottom brand overlay (matches site hero). */
export function CupBuildHeroFrame({
  stage,
  footer,
  showTagline = true,
}: {
  stage: ReactNode;
  footer?: ReactNode;
  showTagline?: boolean;
}) {
  return (
    <div className="cup-build-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="cup-build-hero__bg"
        src="/hero-cones.webp"
        alt=""
        width={2500}
        height={1121}
        decoding="async"
      />
      <div className="cup-build-hero__scrim" aria-hidden />
      <div className="cup-build-hero__stage">{stage}</div>
      <div className="cup-build-hero__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="cup-build-hero__logo"
          src="/logo.webp"
          alt="Loving Cup"
          width={320}
          height={133}
        />
        {showTagline ? (
          <p className="cup-build-hero__tagline">Frozen Yogurt Made Right™</p>
        ) : null}
        {footer}
      </div>
    </div>
  );
}
