"use client";

import { CupCustomizer } from "@/components/CupCustomizer";
import type { MenuItem } from "@/types/menu";
import { formatUsd } from "@/lib/pricing";
import { useEffect, useId, useState } from "react";

/** Menu row price = cup variation base ($4.99). Sold-out printed rows show no price. */
function basePriceCents(item: MenuItem): number {
  return Math.min(...item.variations.map((v) => v.price.amount));
}

export function MenuGrid({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState<MenuItem | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (items.length === 0) {
    return (
      <p className="empty-state">
        No froyo items available. When Square secrets are set, the live catalog
        loads here.
      </p>
    );
  }

  return (
    <>
      <ul className="menu-grid">
        {items.map((item, i) => {
          const price = basePriceCents(item);
          const row = (
            <>
              <div className="menu-row__photo" aria-hidden={!item.imageUrl}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" width={72} height={72} />
                ) : null}
              </div>
              <div className="menu-row__text">
                <h3 className="menu-row__name">
                  {item.name}
                  {item.soldOut ? (
                    <span className="sold-out">Sold out</span>
                  ) : null}
                </h3>
                {item.description ? (
                  <p className="menu-row__desc">{item.description}</p>
                ) : null}
                {!item.soldOut ? (
                  <p className="menu-row__price">{formatUsd(price)}</p>
                ) : null}
              </div>
            </>
          );

          return (
            <li
              key={item.id}
              className={`menu-row ${item.soldOut ? "menu-row--soldout" : ""}`}
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              {item.soldOut ? (
                <div className="menu-row__body" aria-disabled>
                  {row}
                </div>
              ) : (
                <button
                  type="button"
                  className="menu-row__body menu-row__body--btn"
                  onClick={() => setOpen(item)}
                >
                  {row}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {open ? (
        <div
          className="board-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="board-sheet__backdrop"
            aria-label="Close"
            onClick={() => setOpen(null)}
          />
          <div className="board-sheet__panel">
            <div className="board-sheet__head">
              <div>
                <h2 id={titleId} className="board-sheet__title">
                  {open.name}
                </h2>
                {open.description ? (
                  <p className="board-sheet__recipe">{open.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setOpen(null)}
              >
                Close
              </button>
            </div>
            <CupCustomizer
              key={open.id}
              item={open}
              onAdded={() => setOpen(null)}
              onCancel={() => setOpen(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
