import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { MediaStorageService } from "@/lib/ai/creative/media-storage";

describe("NEXORA PERSISTENT MEDIA STORAGE & CROSS-USER ISOLATION", () => {
  const testStorageDir = path.join(process.cwd(), "data", "media");

  beforeEach(() => {
    // Ensure clean state for test user directories
  });

  afterEach(() => {
    // Clean up created test media
    const userDir1 = path.join(testStorageDir, "usr_alice");
    const userDir2 = path.join(testStorageDir, "usr_bob");
    if (fs.existsSync(userDir1)) {
      fs.rmSync(userDir1, { recursive: true, force: true });
    }
    if (fs.existsSync(userDir2)) {
      fs.rmSync(userDir2, { recursive: true, force: true });
    }
  });

  it("successfully persists binary media payload to disk and generates relative URL", async () => {
    const fakeMp4Buffer = Buffer.from("00000018667479706d703432000000006d6f6f76", "hex"); // MP4 signature
    const artifactId = `art_test_${Date.now()}`;

    const result = await MediaStorageService.saveMedia({
      id: artifactId,
      userId: "usr_alice",
      buffer: fakeMp4Buffer,
      type: "video",
      mimeType: "video/mp4",
    });

    expect(result.id).toBe(artifactId);
    expect(result.userId).toBe("usr_alice");
    expect(result.url).toBe(`/api/media/${artifactId}.mp4`);
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.size).toBe(fakeMp4Buffer.length);
  });

  it("persists base64 dataUri payload and generates metadata file", async () => {
    const fakePngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const artifactId = `art_png_${Date.now()}`;

    const result = await MediaStorageService.saveMedia({
      id: artifactId,
      userId: "usr_alice",
      dataUri: fakePngBase64,
      type: "image",
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.url).toBe(`/api/media/${artifactId}.png`);
    expect(fs.existsSync(result.filePath)).toBe(true);

    const metaFile = path.join(testStorageDir, "usr_alice", `${artifactId}.meta.json`);
    expect(fs.existsSync(metaFile)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    expect(meta.userId).toBe("usr_alice");
    expect(meta.ext).toBe("png");
  });

  it("enforces cross-user ownership isolation: User B cannot retrieve User A's media", async () => {
    const fakeBuffer = Buffer.from("RIFF....WAVEfmt ....data....", "utf8");
    const artifactId = `art_track_${Date.now()}`;

    await MediaStorageService.saveMedia({
      id: artifactId,
      userId: "usr_alice",
      buffer: fakeBuffer,
      type: "music",
      mimeType: "audio/wav",
    });

    // 1. User Alice retrieves her own media -> found
    const aliceLookup = MediaStorageService.getMedia(`${artifactId}.wav`, "usr_alice");
    expect(aliceLookup.status).toBe("found");
    expect(aliceLookup.filePath).toBeDefined();

    // 2. User Bob attempts to retrieve Alice's media -> forbidden
    const bobLookup = MediaStorageService.getMedia(`${artifactId}.wav`, "usr_bob");
    expect(bobLookup.status).toBe("forbidden");
    expect(bobLookup.filePath).toBeUndefined();

    // 3. Admin / System can access for moderation
    const adminLookup = MediaStorageService.getMedia(`${artifactId}.wav`, "admin");
    expect(adminLookup.status).toBe("found");
  });

  it("sanitizes path traversal attempts safely", async () => {
    const maliciousId = "../../etc/passwd";
    const lookup = MediaStorageService.getMedia(maliciousId, "usr_alice");
    expect(lookup.status).toBe("not_found");
  });
});
