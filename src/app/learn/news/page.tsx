import LearnPage from "../page";

export const metadata = {
  title: "Nigerian Agricultural News & Commodity Market Updates | AgroMarket",
  description:
    "Timely news, harvest reports, supply-chain logistics bulletins, and commodity trade analysis across Nigerian farming states.",
};

interface CategoryPageProps {
  searchParams: Promise<{
    search?: string;
    state?: string;
    topic?: string;
    page?: string;
  }>;
}

export default async function NewsCategoryPage({ searchParams }: CategoryPageProps) {
  const resolved = await searchParams;
  return (
    <LearnPage
      searchParams={Promise.resolve({
        ...resolved,
        type: "NEWS",
      })}
    />
  );
}
