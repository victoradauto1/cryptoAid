import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

/**
 * GET /api/fetch-metadata?campaignId={id}
 *
 * Server-side endpoint for fetching campaign metadata from Pinata by campaignId.
 * Uses Pinata's query API to find files by keyvalue.
 */

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export async function GET(req: NextRequest) {
  if (!PINATA_JWT) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId query parameter required" },
        { status: 400 }
      );
    }

    // Query Pinata for files with matching campaignId
    const response = await axios.get(
      `${PINATA_API_URL}/data/pinList`,
      {
        params: {
          status: "pinned",
          metadata: JSON.stringify({
            keyvalues: {
              campaignId: { value: campaignId, op: "eq" },
            },
          }),
        },
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        timeout: 10000,
      }
    );

    if (response.data.count === 0) {
      return NextResponse.json(
        { error: "Metadata not found" },
        { status: 404 }
      );
    }

    // Get the first matching file
    const ipfsHash = response.data.rows[0].ipfs_pin_hash;

    // Fetch the actual metadata content
    const metadataResponse = await axios.get(
      `${PINATA_GATEWAY}/${ipfsHash}`,
      { timeout: 10000 }
    );

    return NextResponse.json({
      success: true,
      ipfsHash,
      ipfsUri: `ipfs://${ipfsHash}`,
      metadata: metadataResponse.data,
    });
  } catch (error: any) {
    console.error("Fetch metadata error:", {
      message: error.message,
      response: error.response?.data,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch metadata",
        details: error.response?.data?.error || error.message,
      },
      { status: 500 }
    );
  }
}