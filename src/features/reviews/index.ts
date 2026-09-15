/**
 * Reviews Domain Boundary
 * Verified buyer reviews, farmer ratings, and delivery feedback.
 */
export interface ReviewRecord {
  id: string;
  orderId: string;
  authorId: string;
  targetId: string;
  rating: number; // 1-5
  comment?: string;
}
