import { DEMO_CATALOG_DISCOUNT } from "@/lib/demo-catalog";
import { getAppMode } from "@/lib/env";
import { getSquareClient } from "@/lib/square";
import type { LoyaltyPreview } from "@/types/menu";

/**
 * Rewards: Square Loyalty when available, else a catalog/demo discount on the order.
 * No homemade points ledger.
 */
export async function lookupLoyalty(
  phone?: string,
): Promise<LoyaltyPreview> {
  if (getAppMode() === "demo") {
    return {
      available: true,
      mode: "demo",
      message:
        "Demo rewards: apply a $2.00 sample discount (mirrors catalog discount redeem).",
      balance: 10,
      rewardTiers: [
        {
          id: DEMO_CATALOG_DISCOUNT.id,
          name: DEMO_CATALOG_DISCOUNT.name,
          points: 10,
          discountCents: DEMO_CATALOG_DISCOUNT.discountCents,
        },
      ],
      catalogDiscount: DEMO_CATALOG_DISCOUNT,
    };
  }

  const client = getSquareClient();
  try {
    const programs = await client.loyalty.programs.list();
    const program = programs.programs?.[0];
    if (!program?.id) {
      return {
        available: true,
        mode: "square",
        message:
          "No Loyalty program found — catalog discount redeem still available if configured.",
        catalogDiscount: undefined,
      };
    }

    let accountId: string | undefined;
    let balance: number | undefined;
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
      const search = await client.loyalty.accounts.search({
        query: { mappings: [{ phoneNumber: e164 }] },
      });
      const account = search.loyaltyAccounts?.[0];
      accountId = account?.id;
      balance = account?.balance;
    }

    const tiers =
      program.rewardTiers?.map((t) => ({
        id: t.id!,
        name: t.name ?? "Reward",
        points: t.points ?? 0,
      })) ?? [];

    return {
      available: true,
      mode: "square",
      message: accountId
        ? "Loyalty account found."
        : "Loyalty program active — enter phone to look up balance.",
      accountId,
      balance,
      rewardTiers: tiers,
    };
  } catch (err) {
    return {
      available: false,
      mode: "square",
      message:
        err instanceof Error
          ? err.message
          : "Loyalty lookup failed.",
    };
  }
}
