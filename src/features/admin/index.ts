/**
 * Admin Domain Boundary
 * Internal management, KYC approvals, catalog moderation, dispute resolution, and platform operations.
 */
export interface AdminAuditEntry {
  id: string;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
}
