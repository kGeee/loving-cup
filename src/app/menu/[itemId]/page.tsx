import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Old `/menu/[id]` links die — named cups open as a sheet on the home board. */
export default async function MenuItemPage() {
  permanentRedirect("/#menu");
}
