import Link from "next/link";
import type { MenuItem } from "@/types/menu";
import { formatUsd } from "@/lib/pricing";

export function MenuGrid({ items }: { items: MenuItem[] }) {
  if (items.length === 0) {
    return (
      <p className="empty-state">
        No froyo items available. When Square secrets are set, the live catalog
        loads here (fail-closed — no fake prices in live mode).
      </p>
    );
  }

  return (
    <ul className="menu-grid">
      {items.map((item, i) => {
        const from = Math.min(...item.variations.map((v) => v.price.amount));
        return (
          <li
            key={item.id}
            className="menu-row"
            style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          >
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
              <p className="menu-row__price">
                {item.soldOut ? "—" : `from ${formatUsd(from)}`}
              </p>
            </div>
            {item.soldOut ? (
              <span className="btn btn--ghost" aria-disabled>
                Unavailable
              </span>
            ) : (
              <Link className="btn btn--primary" href={`/menu/${item.id}`}>
                Customize
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
