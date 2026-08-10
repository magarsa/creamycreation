import { getActiveAddons, getActiveSizes } from "@/lib/db/queries";
import { DetailsForm } from "./details-form";

// Sizes/add-ons are baker-edited and should reflect immediately, same as the
// date page's config/blocked-dates reads.
export const dynamic = "force-dynamic";

export default async function DetailsPage() {
  const [sizes, addons] = await Promise.all([getActiveSizes(), getActiveAddons()]);

  return <DetailsForm sizes={sizes} addons={addons} />;
}
