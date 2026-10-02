import LearnPage from "../page";

export const metadata = {
  title: "Nigerian Agricultural Events, Expos & Field Demonstrations | AgroMarket",
  description:
    "Discover upcoming agricultural exhibitions, field demonstration days, grower summits, and agricultural trade fairs across Nigeria.",
};

interface CategoryPageProps {
  searchParams: Promise<{
    search?: string;
    state?: string;
    topic?: string;
    page?: string;
  }>;
}

export default async function EventsCategoryPage({
  searchParams,
}: CategoryPageProps) {
  const resolved = await searchParams;
  return (
    <LearnPage
      searchParams={Promise.resolve({
        ...resolved,
        type: "EVENT",
      })}
    />
  );
}
