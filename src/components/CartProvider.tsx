"use client";

import type { CartLine } from "@/types/menu";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cartSubtotal } from "@/lib/pricing";

type CartContextValue = {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  count: number;
  subtotalCents: number;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "loving-cup-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addLine = useCallback((line: CartLine) => {
    setLines((prev) => [...prev, line]);
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      addLine,
      removeLine,
      clear,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotalCents: cartSubtotal(lines),
      hydrated,
    }),
    [lines, addLine, removeLine, clear, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
