import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { MediaStorageService } from "@/lib/ai/creative/media-storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiKeyService } from "@/lib/developer/api-keys";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params.id;
    if (!rawId) {
      return NextResponse.json({ error: "Media identifier is required." }, { status: 400 });
    }

    // 1. Resolve requester identity
    let requesterUserId: string | null = null;

    // Check Supabase Auth session first
    try {
      const supabase = createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        requesterUserId = user.id;
      }
    } catch {
      // Supabase session unconfigured or absent
    }

    // Check Bearer API key in Authorization header if not authenticated via session
    if (!requesterUserId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer nx_")) {
        const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
        try {
          const authResult = await ApiKeyService.authenticateKeyAsync(apiKey);
          if (authResult.valid && authResult.record?.userId) {
            requesterUserId = authResult.record.userId;
          }
        } catch {
          // API key validation failed
        }
      }
    }

    // In development or test environments, allow fallback userId query param or cookie
    if (!requesterUserId && process.env.NODE_ENV !== "production") {
      const { searchParams } = new URL(req.url);
      const queryUser = searchParams.get("userId");
      if (queryUser) {
        requesterUserId = queryUser;
      }
    }

    // 2. Fetch media from persistent storage with cross-user ownership verification
    const mediaResult = MediaStorageService.getMedia(rawId, requesterUserId);

    if (mediaResult.status === "not_found" || !mediaResult.filePath) {
      return NextResponse.json(
        { error: "Media artifact not found." },
        { status: 404 }
      );
    }

    if (mediaResult.status === "forbidden") {
      return NextResponse.json(
        { error: "Forbidden. You do not own this media artifact." },
        { status: 403 }
      );
    }

    const { filePath, mimeType = "application/octet-stream", size = 0 } = mediaResult;
    const stat = fs.statSync(filePath);
    const totalSize = stat.size;

    // 3. Handle HTTP 206 Range requests for audio/video scrub and buffer
    const rangeHeader = req.headers.get("range");

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType,
          "Cache-Control": "private, max-age=86400",
        },
      });
    }

    // 4. Full file response
    const fileStream = fs.createReadStream(filePath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": totalSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve media." },
      { status: 500 }
    );
  }
}
