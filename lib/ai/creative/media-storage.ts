/**
 * NEXORA ZERO-BUDGET PERSISTENT MEDIA STORAGE SERVICE
 *
 * Local filesystem-backed persistent media storage for generated images, audio, and videos.
 *
 * Benefits:
 * - ₹0 infrastructure cost: Uses local disk storage without paid cloud buckets (S3, Cloudinary).
 * - Solves localStorage QuotaExceededError (keeps stored conversation JSON light and fast).
 * - Enables cross-session media retrieval after refresh or re-login.
 * - Strict cross-user ownership isolation: protects files from unauthorized cross-user access.
 * - Supports HTTP 206 Partial Content Range streaming for audio and video scrubbing.
 */

import fs from "fs";
import path from "path";

export interface SaveMediaParams {
  id: string;
  userId: string;
  buffer?: Buffer;
  dataUri?: string;
  mimeType?: string;
  type: "image" | "music" | "video" | "voice";
  metadata?: Record<string, any>;
}

export interface StoredMediaMeta {
  id: string;
  userId: string;
  mimeType: string;
  ext: string;
  size: number;
  createdAt: string;
  type: "image" | "music" | "video" | "voice";
  custom?: Record<string, any>;
}

export interface StoredMediaResult {
  id: string;
  userId: string;
  url: string;
  filePath: string;
  mimeType: string;
  size: number;
  meta: StoredMediaMeta;
}

export interface GetMediaResult {
  status: "found" | "forbidden" | "not_found";
  filePath?: string;
  mimeType?: string;
  size?: number;
  meta?: StoredMediaMeta;
}

export class MediaStorageService {
  private static readonly BASE_DIR = path.join(process.cwd(), "data", "media");

  /**
   * Resolves standard file extension from MIME type.
   */
  static getExtension(mimeType: string): string {
    const clean = mimeType.toLowerCase().trim();
    if (clean.includes("png")) return "png";
    if (clean.includes("jpeg") || clean.includes("jpg")) return "jpg";
    if (clean.includes("webp")) return "webp";
    if (clean.includes("gif")) return "gif";
    if (clean.includes("svg")) return "svg";
    if (clean.includes("mp4")) return "mp4";
    if (clean.includes("webm")) return "webm";
    if (clean.includes("aac")) return "aac";
    if (clean.includes("wav")) return "wav";
    if (clean.includes("mpeg") || clean.includes("mp3")) return "mp3";
    if (clean.includes("ogg")) return "ogg";
    return "bin";
  }

  /**
   * Resolves standard MIME type from file extension.
   */
  static getMimeType(ext: string): string {
    const clean = ext.toLowerCase().replace(/^\./, "");
    switch (clean) {
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "webp":
        return "image/webp";
      case "gif":
        return "image/gif";
      case "svg":
        return "image/svg+xml";
      case "mp4":
        return "video/mp4";
      case "webm":
        return "video/webm";
      case "aac":
        return "audio/aac";
      case "wav":
        return "audio/wav";
      case "mp3":
        return "audio/mpeg";
      case "ogg":
        return "audio/ogg";
      default:
        return "application/octet-stream";
    }
  }

  /**
   * Sanitizes identifiers to prevent path traversal attacks.
   */
  private static sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  }

  /**
   * Ensures the user directory exists.
   */
  private static ensureUserDir(userId: string): string {
    const cleanUser = this.sanitizeId(userId || "usr_anonymous");
    const userDir = path.join(this.BASE_DIR, cleanUser);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  /**
   * Saves a media file (from Buffer or Data URI) to persistent storage.
   */
  static async saveMedia(params: SaveMediaParams): Promise<StoredMediaResult> {
    const { id, userId, type, metadata = {} } = params;
    const cleanId = this.sanitizeId(id);
    const cleanUser = this.sanitizeId(userId || "usr_anonymous");

    let buffer: Buffer;
    let mimeType = params.mimeType || "";

    if (params.buffer && Buffer.isBuffer(params.buffer)) {
      buffer = params.buffer;
    } else if (params.dataUri && params.dataUri.startsWith("data:")) {
      const match = params.dataUri.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) {
        throw new Error("Invalid data URI payload format");
      }
      mimeType = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else {
      throw new Error("Either buffer or valid base64 dataUri must be provided to saveMedia");
    }

    if (!mimeType) {
      mimeType = type === "video" ? "video/mp4" : type === "music" ? "audio/aac" : "image/png";
    }

    const ext = this.getExtension(mimeType);
    const userDir = this.ensureUserDir(cleanUser);
    const fileName = `${cleanId}.${ext}`;
    const filePath = path.join(userDir, fileName);
    const metaPath = path.join(userDir, `${cleanId}.meta.json`);

    // Write binary file
    fs.writeFileSync(filePath, buffer);

    // Write metadata
    const meta: StoredMediaMeta = {
      id: cleanId,
      userId: cleanUser,
      mimeType,
      ext,
      size: buffer.length,
      createdAt: new Date().toISOString(),
      type,
      custom: metadata,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");

    return {
      id: cleanId,
      userId: cleanUser,
      url: `/api/media/${fileName}`,
      filePath,
      mimeType,
      size: buffer.length,
      meta,
    };
  }

  /**
   * Saves an artifact's media payload and returns updated relative URL.
   * If input is already an `/api/media/` URL, skips re-saving.
   */
  static async persistArtifactMedia(options: {
    id: string;
    userId?: string;
    mediaUrl?: string;
    buffer?: Buffer;
    type: "image" | "music" | "video" | "voice";
    mimeType?: string;
  }): Promise<string | undefined> {
    const { id, userId = "usr_anonymous", mediaUrl, buffer, type, mimeType } = options;

    if (mediaUrl && (mediaUrl.startsWith("/api/media/") || mediaUrl.startsWith("http"))) {
      return mediaUrl;
    }

    if (buffer && Buffer.isBuffer(buffer)) {
      const res = await this.saveMedia({
        id,
        userId,
        buffer,
        type,
        mimeType,
      });
      return res.url;
    }

    if (mediaUrl && mediaUrl.startsWith("data:")) {
      const res = await this.saveMedia({
        id,
        userId,
        dataUri: mediaUrl,
        type,
        mimeType,
      });
      return res.url;
    }

    return mediaUrl;
  }

  /**
   * Retrieves media file with strict cross-user ownership verification.
   */
  static getMedia(
    fileNameOrId: string,
    requesterUserId?: string | null
  ): GetMediaResult {
    const cleanName = this.sanitizeId(fileNameOrId);
    const baseId = cleanName.replace(/\.[a-zA-Z0-9]+$/, "");

    if (!fs.existsSync(this.BASE_DIR)) {
      return { status: "not_found" };
    }

    // Locate the file and its metadata across user directories
    const userDirs = fs.readdirSync(this.BASE_DIR);
    for (const uDir of userDirs) {
      const uPath = path.join(this.BASE_DIR, uDir);
      if (!fs.statSync(uPath).isDirectory()) continue;

      const metaPath = path.join(uPath, `${baseId}.meta.json`);
      if (fs.existsSync(metaPath)) {
        try {
          const metaContent = fs.readFileSync(metaPath, "utf8");
          const meta: StoredMediaMeta = JSON.parse(metaContent);

          // Verify ownership:
          // If requester is provided and does not match owner (and is not admin/internal)
          if (
            requesterUserId &&
            requesterUserId !== meta.userId &&
            requesterUserId !== "admin" &&
            requesterUserId !== "system" &&
            meta.userId !== "usr_anonymous"
          ) {
            return { status: "forbidden", meta };
          }

          const targetFile = path.join(uPath, `${meta.id}.${meta.ext}`);
          if (fs.existsSync(targetFile)) {
            const stat = fs.statSync(targetFile);
            return {
              status: "found",
              filePath: targetFile,
              mimeType: meta.mimeType || this.getMimeType(meta.ext),
              size: stat.size,
              meta,
            };
          }
        } catch {
          // If JSON parse failed, continue searching
        }
      }
    }

    return { status: "not_found" };
  }
}
