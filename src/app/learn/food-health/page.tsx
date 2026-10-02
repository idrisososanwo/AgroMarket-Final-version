import LearnPage from "../page";

export const metadata = {
  title: "Food Hygiene, Safe Storage & Nutrition Information | AgroMarket",
  description:
    "Evidence-based guidelines on produce washing, food storage, spoilage prevention, and balanced nutrition for Nigerian consumers and food businesses.",
};

interface CategoryPageProps {
  searchParams: Promise<{
    search?: string;
    state?: string;
    topic?: string;
    page?: string;
  }>;
}

export default async function FoodHealthCategoryPage({
  searchParams,
}: CategoryPageProps) {
  const resolved = await searchParams;
  return (
    <LearnPage
      searchParams={Promise.resolve({
        ...resolved,
        type: "FOOD_HEALTH",
      })}
    />
  );
}
