import { notFound } from "next/navigation";
import { getSharedPurchaseById, getSharedPurchaseParticipants } from "@/features/shared-purchase/queries";
import { SharedPurchaseDetailView } from "@/features/shared-purchase/components/shared-purchase-detail-view";
import { createClient } from "@/lib/supabase/server";

interface SharedPurchasePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function SharedPurchasePage({ params }: SharedPurchasePageProps) {
  const { id } = await params;

  const pool = await getSharedPurchaseById(id);
  if (!pool) {
    notFound();
  }

  const participants = await getSharedPurchaseParticipants(id);

  // Optional user fetch
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUser: { id: string; fullName?: string; phone?: string } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone_number")
      .eq("id", user.id)
      .maybeSingle();

    currentUser = {
      id: user.id,
      fullName: profile?.full_name || undefined,
      phone: profile?.phone_number || undefined,
    };
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SharedPurchaseDetailView
        pool={pool}
        participants={participants}
        currentUser={currentUser}
      />
    </div>
  );
}
