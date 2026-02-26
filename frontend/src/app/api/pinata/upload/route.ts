import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

/**
 * POST /api/upload-metadata
 *
 * Server-side endpoint for uploading campaign metadata to Pinata IPFS.
 *
 * Security:
 * - Keeps Pinata JWT secret on the server
 * - Validates input data before upload
 * - Returns IPFS hash to client
 *
 * Architecture:
 * Client → API Route → Pinata → IPFS
 */

/* ============================================================
   CONFIGURATION
============================================================ */

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_URL = "https://api.pinata.cloud";

/* ============================================================
   TYPES
============================================================ */

interface UploadRequest {
  campaignId: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  goal: string;
  deadline: number;
}

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/* ============================================================
   API HANDLER
============================================================ */

export async function POST(req: NextRequest) {
  // Validate JWT configuration
  if (!PINATA_JWT) {
    console.error("PINATA_JWT not configured in environment variables");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body: UploadRequest = await req.json();

    // Validate required fields
    if (!body.campaignId || !body.title) {
      return NextResponse.json(
        { error: "Missing required fields: campaignId, title" },
        { status: 400 }
      );
    }

    // Enrich metadata with timestamp
    const metadata = {
      ...body,
      createdAt: Date.now(),
    };

    // Upload to Pinata
    const response = await axios.post<PinataResponse>(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: `campaign-${body.campaignId}`,
          keyvalues: {
            campaignId: body.campaignId,
            type: "campaign-metadata",
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        timeout: 30000,
      }
    );

    // Return IPFS URI
    return NextResponse.json({
      success: true,
      ipfsHash: response.data.IpfsHash,
      ipfsUri: `ipfs://${response.data.IpfsHash}`,
    });
  } catch (error: any) {
    console.error("Pinata upload error:", {
      message: error.message,
      response: error.response?.data,
    });

    return NextResponse.json(
      {
        error: "Failed to upload to IPFS",
        details: error.response?.data?.error || error.message,
      },
      { status: 500 }
    );
  }
}