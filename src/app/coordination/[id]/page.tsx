import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getCoordinationOpportunityById,
  getOpportunityRequirements,
  getOpportunityParticipants,
  getOpportunityCommitments,
  getOpportunityEvents,
  getEvidenceForOpportunity,
  sanitizeSupplyCommitmentForViewer,
  sanitizeEvidenceForViewer,
} from "@/features/agricultural-coordination";
import { CoordinationDetailView } from "@/features/agricultural-coordination/components";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const opportunity = await getCoordinationOpportunityById(id);
  if (!opportunity) {
    return {
      title: "Opportunity Not Found | AgroMarket",
    };
  }

  return {
    title: `${opportunity.title} | Coordination Hub | AgroMarket`,
    description: `Multi-producer coordination for ${opportunity.commodity} in ${opportunity.targetState}. Required: ${opportunity.requiredQuantity} ${opportunity.unit}.`,
  };
}

export default async function CoordinationDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  const opportunity = await getCoordinationOpportunityById(id);
  if (!opportunity) {
    notFound();
  }

  const isCoordinatorOrAdmin = Boolean(
    user && (user.id === opportunity.creatorId || user.roles.includes("ADMIN"))
  );

  const [requirements, participants, rawCommitments, events, rawEvidence] =
    await Promise.all([
      getOpportunityRequirements(opportunity.id),
      getOpportunityParticipants(opportunity.id),
      getOpportunityCommitments(opportunity.id),
      getOpportunityEvents(opportunity.id),
      getEvidenceForOpportunity(opportunity.id),
    ]);

  // Privacy isolation: Sanitize peer commitments and evidence
  const commitments = rawCommitments.map((c) =>
    sanitizeSupplyCommitmentForViewer(c, user?.id, isCoordinatorOrAdmin)
  );

  const evidenceList = rawEvidence.map((e) =>
    sanitizeEvidenceForViewer(e, user?.id, isCoordinatorOrAdmin)
  );

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link
            href="/coordination"
            className="inline-flex items-center text-xs font-semibold text-emerald-800 hover:text-emerald-900 mb-2"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Coordination Opportunities
          </Link>
        </div>

        <CoordinationDetailView
          opportunity={opportunity}
          requirements={requirements}
          participants={participants}
          commitments={commitments}
          events={events}
          evidenceList={evidenceList}
          currentUserId={user?.id}
          currentUserRole={user?.roles[0]}
        />
      </div>
    </div>
  );
}
