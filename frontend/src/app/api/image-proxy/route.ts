import { NextRequest, NextResponse } from "next/server";

/**
 * Image Proxy Route
 *
 * This route securely fetches and proxies external campaign images.
 *
 * Why this exists:
 * - Allows users to provide external image URLs (better UX)
 * - Prevents unsafe or malicious requests
 * - Enforces file size and MIME type restrictions
 * - Adds caching headers for performance
 *
 * Security measures:
 * - HTTPS-only enforcement
 * - Request timeout protection
 * - Allowed MIME type validation
 * - Maximum file size limitation (5MB)
 */

const MAX_SIZE = 5 * 1024 * 1024; // 5MB maximum allowed image size
const TIMEOUT = 10000; // 10 seconds timeout for external requests
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Missing URL parameter" },
        { status: 400 }
      );
    }

    /**
     * 1. Enforce HTTPS
     * Prevents insecure requests and reduces SSRF risks.
     */
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "HTTPS required" },
        { status: 403 }
      );
    }

    /**
     * 2. Fetch with timeout protection
     * Avoids hanging requests to slow or malicious servers.
     */
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url, { signal: controller.signal });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("External fetch failed");
    }

    /**
     * 3. Validate MIME type
     * Ensures the resource is actually an allowed image type.
     */
    const contentType = response.headers.get("content-type");

    if (
      !contentType ||
      !ALLOWED_TYPES.some((type) => contentType.includes(type))
    ) {
      return NextResponse.json(
        { error: "Invalid image type" },
        { status: 400 }
      );
    }

    /**
     * 4. Validate file size (via Content-Length header)
     * Protects against large file downloads that could impact performance.
     */
    const size = response.headers.get("content-length");

    if (size && parseInt(size) > MAX_SIZE) {
      return NextResponse.json(
        { error: "Image too large (max 5MB)" },
        { status: 413 }
      );
    }

    /**
     * 5. Read image buffer and return proxied response
     * Adds aggressive caching for performance optimization.
     */
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (error: any) {
    /**
     * Generic fallback error
     * Avoids leaking internal implementation details.
     */
    return NextResponse.json(
      { error: "Image proxy failed" },
      { status: 500 }
    );
  }
}