import {
  isAkidSoldOut,
  isPresentAtLocation,
  isSharedCatalogBleed,
  looksLikeFroyoCategory,
  looksLikeFroyoItem,
} from "@/lib/catalog-filter";
import { getDemoCatalog } from "@/lib/demo-catalog";
import { getAppMode, getSquareEnv } from "@/lib/env";
import { getNopLocationId, getSquareClient, moneyToCents } from "@/lib/square";
import type {
  CatalogPayload,
  MenuCategory,
  MenuItem,
  MenuModifier,
  MenuModifierList,
  MenuVariation,
} from "@/types/menu";
import type { Square } from "square";

function serializeMoney(amount?: bigint | number | null) {
  return { amount: moneyToCents({ amount }), currency: "USD" as const };
}

async function listAllCatalog(
  types: string[],
): Promise<Square.CatalogObject[]> {
  const client = getSquareClient();
  const objects: Square.CatalogObject[] = [];
  const pager = await client.catalog.list({
    types: types.join(","),
  });
  for await (const obj of pager) {
    objects.push(obj);
  }
  return objects;
}

function mapModifierList(
  modListObj: Square.CatalogObject.ModifierList,
): MenuModifierList | null {
  const data = modListObj.modifierListData;
  if (!data) return null;
  const modifiers: MenuModifier[] = (data.modifiers ?? [])
    .filter((m): m is Square.CatalogObject.Modifier => m.type === "MODIFIER")
    .map((m, i) => ({
      id: m.id!,
      name: m.modifierData?.name ?? "Modifier",
      price: serializeMoney(m.modifierData?.priceMoney?.amount),
      ordinal: m.modifierData?.ordinal ?? i,
    }))
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));

  const selectionType =
    data.selectionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";

  // CYOB sheet: mix-in lists that include 2 in the base price.
  const name = data.name ?? "Modifiers";
  const includedCount = /mix[\s-]*in/i.test(name) && /2|two|included/i.test(name)
    ? 2
    : /cyob/i.test(name)
      ? 2
      : undefined;

  const minRaw = data.minSelectedModifiers;
  const maxRaw = data.maxSelectedModifiers;
  return {
    id: modListObj.id!,
    name,
    selectionType,
    minSelected: minRaw == null ? 0 : Number(minRaw),
    maxSelected: maxRaw == null || Number(maxRaw) <= 0 ? null : Number(maxRaw),
    includedCount,
    modifiers,
  };
}

export async function fetchCatalog(): Promise<CatalogPayload> {
  if (getAppMode() === "demo") {
    return getDemoCatalog();
  }

  const locationId = getNopLocationId();
  const objects = await listAllCatalog([
    "CATEGORY",
    "ITEM",
    "MODIFIER_LIST",
    "MODIFIER",
    "IMAGE",
  ]);

  const categoriesRaw = objects.filter(
    (o): o is Square.CatalogObject.Category => o.type === "CATEGORY",
  );
  const categoryNameById = new Map<string, string>();
  for (const c of categoriesRaw) {
    if (c.id && c.categoryData?.name) {
      categoryNameById.set(c.id, c.categoryData.name);
    }
  }

  const froyoCategoryIds = new Set(
    [...categoryNameById.entries()]
      .filter(([, name]) => looksLikeFroyoCategory(name))
      .map(([id]) => id),
  );

  const modifierListsById = new Map<string, MenuModifierList>();
  for (const o of objects) {
    if (o.type !== "MODIFIER_LIST") continue;
    const mapped = mapModifierList(o);
    if (mapped) modifierListsById.set(mapped.id, mapped);
  }

  const imageUrlById = new Map<string, string>();
  for (const o of objects) {
    if (o.type === "IMAGE" && o.id && o.imageData?.url) {
      imageUrlById.set(o.id, o.imageData.url);
    }
  }

  const items: MenuItem[] = [];
  for (const o of objects) {
    if (o.type !== "ITEM") continue;
    if (!isPresentAtLocation(o, locationId)) continue;
    const data = o.itemData;
    if (!data?.name) continue;
    if (isSharedCatalogBleed(data.name)) continue;

    const catIds = [
      ...(data.categories?.map((c) => c.id!).filter(Boolean) ?? []),
      ...(data.categoryId ? [data.categoryId] : []),
    ];
    const catNames = catIds
      .map((id) => categoryNameById.get(id))
      .filter((n): n is string => Boolean(n));

    // Prefer froyo categories; also keep items that look like froyo by name.
    const inFroyoCat = catIds.some((id) => froyoCategoryIds.has(id));
    if (!inFroyoCat && !looksLikeFroyoItem(data.name, catNames)) continue;

    const variations: MenuVariation[] = (data.variations ?? [])
      .filter(
        (v): v is Square.CatalogObject.ItemVariation =>
          v.type === "ITEM_VARIATION",
      )
      .filter((v) => isPresentAtLocation(v, locationId))
      .map((v, i) => ({
        id: v.id!,
        name: v.itemVariationData?.name ?? "Regular",
        sku: v.itemVariationData?.sku ?? undefined,
        price: serializeMoney(v.itemVariationData?.priceMoney?.amount),
        ordinal: v.itemVariationData?.ordinal ?? i,
      }))
      .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));

    if (variations.length === 0) continue;

    const modifierLists: MenuModifierList[] = (data.modifierListInfo ?? [])
      .filter((info) => !info.enabled || info.enabled === true)
      .map((info) => {
        const list = modifierListsById.get(info.modifierListId!);
        if (!list) return null;
        const minInfo = info.minSelectedModifiers;
        const maxInfo = info.maxSelectedModifiers;
        return {
          ...list,
          minSelected:
            minInfo == null || Number(minInfo) < 0
              ? list.minSelected
              : Number(minInfo),
          maxSelected:
            maxInfo == null || Number(maxInfo) < 0
              ? list.maxSelected
              : Number(maxInfo) === 0
                ? null
                : Number(maxInfo),
        };
      })
      .filter((l): l is MenuModifierList => Boolean(l));

    const soldOut = isAkidSoldOut({
      name: data.name,
      abbreviation: data.abbreviation,
      sku: variations.map((v) => v.sku).join(" "),
      variationNames: variations.map((v) => v.name),
    });

    const imageId = data.imageIds?.[0];
    items.push({
      id: o.id!,
      name: data.name,
      description: data.description ?? undefined,
      categoryIds: catIds,
      categoryNames: catNames,
      variations,
      modifierLists,
      soldOut,
      imageUrl: imageId ? imageUrlById.get(imageId) : undefined,
    });
  }

  // If froyo category filter yielded nothing but we got ITEMs, fail closed on bleed only.
  // Empty catalog is acceptable — never invent prices.
  const categories: MenuCategory[] = [...categoryNameById.entries()]
    .filter(([id]) => froyoCategoryIds.has(id))
    .map(([id, name], i) => ({ id, name, ordinal: i }));

  return {
    mode: "square",
    locationId,
    categories,
    items,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchCatalogItem(
  itemId: string,
): Promise<MenuItem | null> {
  const catalog = await fetchCatalog();
  return catalog.items.find((i) => i.id === itemId) ?? null;
}

export function getCatalogModeInfo() {
  const mode = getAppMode();
  const { environment, locationId } = getSquareEnv();
  return {
    mode,
    environment: mode === "square" ? environment : null,
    locationId: mode === "square" ? locationId : "DEMO_NOPA",
  };
}
