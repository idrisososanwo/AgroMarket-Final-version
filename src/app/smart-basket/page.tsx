import { Metadata } from "next";
import { requireAuth } from "@/lib/auth/server";
import { SmartBasketService } from "@/features/smart-basket/service";
import { getCategories } from "@/features/marketplace/queries";
import { SmartBasketView } from "@/features/smart-basket/components/smart-basket-view";

export const metadata: Metadata = {
  title: "Smart Basket — Farm Produce Recommendations",
  description:
    "Curate your household and commercial grocery basket efficiently with deterministic farm pricing and location proximity.",
};

export default async function SmartBasketPage() {
  const user = await requireAuth();

  const [preferences, latestBasket, categories] = await Promise.all([
    SmartBasketService.getUserPreferences(user.id),
    SmartBasketService.getLatestBasket(user.id),
    getCategories(),
  ]);

  return (
    <SmartBasketView
      initialPreferences={preferences}
      initialBasket={latestBasket}
      categories={categories}
    />
  );
}
