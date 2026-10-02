import LearnPage from "../page";

export const metadata = {
  title: "Expert Agronomy Advice & Extension Guides | AgroMarket",
  description:
    "Practical crop management, soil health, pest control, and livestock care guides from verified Nigerian agricultural experts.",
};

interface CategoryPageProps {
  searchParams: Promise<{
    search?: string;
    state?: string;
    topic?: string;
    page?: string;
  }>;
}

export default async function ExpertAdviceCategoryPage({
  searchParams,
}: CategoryPageProps) {
  const resolved = await searchParams;
  return (
    <LearnPage
      searchParams={Promise.resolve({
        ...resolved,
        type: "EXPERT_ADVICE",
      })}
    />
  );
}
