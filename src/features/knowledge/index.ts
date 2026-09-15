/**
 * Knowledge Domain Boundary
 * Extension guides, good agronomic practices (GAP), pest libraries, and farming calendar.
 */
export interface KnowledgeArticle {
  id: string;
  title: string;
  cropType: string;
  category: "CROP_MANAGEMENT" | "PEST_CONTROL" | "HARVESTING" | "POST_HARVEST";
  publishedAt: string;
}
