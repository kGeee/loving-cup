"use client";

/** One 11px preview line under the sticky bar when running without Square secrets. */
export function DemoBanner({ mode }: { mode: "demo" | "square" }) {
  if (mode !== "demo") return null;
  return (
    <p className="preview-line" role="status">
      Preview catalog · fake-pay · no Square secrets
    </p>
  );
}
