/**
 * Pinata Service
 *
 * Client-side service for interacting with IPFS via Pinata.
 * Routes requests through secure API endpoints to protect credentials.
 *
 * Architecture:
 * This service calls /api/pinata/* endpoints instead of Pinata directly.
 * JWT remains secure on the server.
 */

import axios from "axios";

/* ============================================================
   CONFIGURATION
============================================================ */

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/* ============================================================
   TYPES
============================================================ */

export interface CampaignMetadata {
  campaignId: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  goal: string;
  deadline: number;
  createdAt: number;
}

interface UploadResponse {
  success: boolean;
  ipfsHash: string;
  ipfsUri: string;
}

/* ============================================================
   UPLOAD METADATA
============================================================ */

/**
 * uploadMetadataToPinata
 *
 * Uploads campaign metadata to IPFS via server-side API route.
 * Returns IPFS URI for storage or reference.
 *
 * Security: JWT never exposed to client.
 */
export async function uploadMetadataToPinata(
  metadata: Omit<CampaignMetadata, "createdAt">
): Promise<string> {
  try {
    const response = await fetch("/api/pinata/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || "Upload failed");
    }

    const data: UploadResponse = await response.json();
    return data.ipfsUri;
  } catch (error: any) {
    console.error("Upload metadata error:", error.message);
    throw new Error("Failed to upload metadata to IPFS");
  }
}

/* ============================================================
   FETCH METADATA
============================================================ */

/**
 * fetchMetadataFromIPFS
 *
 * Retrieves campaign metadata from IPFS via public gateway.
 * Supports both ipfs:// URIs and raw hashes.
 *
 * Note: This uses public gateway (no auth needed for reads).
 */
export async function fetchMetadataFromIPFS(
  ipfsUri: string
): Promise<CampaignMetadata> {
  try {
    const hash = ipfsUri.replace("ipfs://", "");

    const response = await axios.get<CampaignMetadata>(
      `${PINATA_GATEWAY}/${hash}`,
      {
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Fetch metadata error:", error.message);
    throw new Error("Failed to fetch metadata from IPFS");
  }
}

/* ============================================================
   BATCH OPERATIONS
============================================================ */

/**
 * fetchMetadataBatch
 *
 * Retrieves multiple campaign metadata objects in parallel.
 * Returns a Map with campaignId as key and metadata as value.
 * Failed fetches are logged but do not throw errors.
 */
export async function fetchMetadataBatch(
  ipfsUris: Map<string, string>
): Promise<Map<string, CampaignMetadata>> {
  const results = new Map<string, CampaignMetadata>();

  await Promise.allSettled(
    Array.from(ipfsUris.entries()).map(async ([campaignId, uri]) => {
      try {
        const metadata = await fetchMetadataFromIPFS(uri);
        results.set(campaignId, metadata);
      } catch (err) {
        console.warn(
          `Failed to fetch metadata for campaign ${campaignId}:`,
          err
        );
      }
    })
  );

  return results;
}