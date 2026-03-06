/**
 * Campaign Types
 *
 * Type definitions for campaign data structures.
 * ALIGNED WITH CONTRACT STATUS ENUM:
 * - 0 = ACTIVE
 * - 1 = COMPLETED (we show as SUCCESSFUL)
 * - 2 = CANCELLED (we show as ENDED)
 */

/**
 * CampaignView
 *
 * Normalized campaign model for UI display.
 * Combines on-chain and off-chain data.
 */
export interface CampaignView {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  goal: string;
  raised: string;
  deadline: number;
  isActive: boolean;
  status: "ACTIVE" | "ENDED" | "SUCCESSFUL";
}