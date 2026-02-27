/**
 * Campaign Types
 *
 * Type definitions for campaign data structures used throughout the application.
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
  status: "ACTIVE" | "ENDED";
}