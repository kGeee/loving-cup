import Link from "next/link";
import type { MenuItem } from "@/types/menu";
import { formatUsd } from "@/lib/pricing";

/** Menu row price = cup variation base ($4.99). Sold-out printed rows show no price. */
function basePriceCents(item: MenuItem): number {
  return Math.min(...item.variations.map((v) => v.price.amount));
}

export function MenuGrid({ items }: { items: MenuItem[] }) {
  if (items.length === 0) {
    return (
      <p className="empty-state">
        No froyo items available. When Square secrets are set, the live catalog
        loads here.
      </p>
    );
  }

  return (
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
              <Link className="menu-row__body" href={`/menu/${item.id}`}>
                {row}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
