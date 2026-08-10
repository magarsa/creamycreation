import { getActiveAddons, getActiveSizes } from "@/lib/db/queries";
import { ReviewForm } from "./review-form";

// Sizes/add-ons are baker-edited and should reflect immediately, same as Details.
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [sizes, addons] = await Promise.all([getActiveSizes(), getActiveAddons()]);

  return <ReviewForm sizes={sizes} addons={addons} />;
}
