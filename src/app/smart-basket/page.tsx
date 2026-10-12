import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { SmartBasketService } from "@/features/smart-basket/service";
import { getCategories } from "@/features/marketplace/queries";
import { SmartBasketView } from "@/features/smart-basket/components/smart-basket-view";

export const metadata: Metadata = {
  title: "Smart Basket — Farm Produce Recommendations | AgroMarket",
  description:
    "Curate your household and commercial grocery basket efficiently with deterministic farm pricing and location proximity.",
};

export default async function SmartBasketPage() {
  const user = await getCurrentUser();

  const [preferences, latestBasket, categories] = await Promise.all([
    user ? SmartBasketService.getUserPreferences(user.id) : Promise.resolve(null),
    user ? SmartBasketService.getLatestBasket(user.id) : Promise.resolve(null),
    getCategories(),
  ]);

  return (
    <SmartBasketView
      initialPreferences={preferences}
      initialBasket={latestBasket}
      categories={categories}
      isAuthenticated={Boolean(user)}
    />
  );
}
