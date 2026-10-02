import LearnPage from "../page";

export const metadata = {
  title: "Official Government Agricultural Notices & Support Schemes | AgroMarket",
  description:
    "Official bulletins, farmer input subsidies, concessionary loan schemes, and policy updates from Nigerian federal and state ministries of agriculture.",
};

interface CategoryPageProps {
  searchParams: Promise<{
    search?: string;
    state?: string;
    topic?: string;
    page?: string;
  }>;
}

export default async function GovernmentUpdatesCategoryPage({
  searchParams,
}: CategoryPageProps) {
  const resolved = await searchParams;
  return (
    <LearnPage
      searchParams={Promise.resolve({
        ...resolved,
        type: "GOVERNMENT_UPDATE",
      })}
    />
  );
}
