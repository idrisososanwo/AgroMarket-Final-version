import LearnPage from "../page";

export const metadata = {
  title: "Agricultural Training, Workshops & Farmer Certification | AgroMarket",
  description:
    "Enhance farm productivity with verified training workshops, mechanization certification, and agribusiness management masterclasses.",
};

interface CategoryPageProps {
  searchParams: Promise<{
    search?: string;
    state?: string;
    topic?: string;
    page?: string;
  }>;
}

export default async function TrainingCategoryPage({
  searchParams,
}: CategoryPageProps) {
  const resolved = await searchParams;
  return (
    <LearnPage
      searchParams={Promise.resolve({
        ...resolved,
        type: "TRAINING",
      })}
    />
  );
}
