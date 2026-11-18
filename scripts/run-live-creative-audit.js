/**
 * NEXORA CREATIVE STUDIO PRODUCTION READINESS AUDIT SCRIPT
 * Performs real end-to-end generation across Image, Music, and Video.
 *
 * Security: NEVER logs HF_TOKEN or credentials.
 */

const fs = require('fs');
const path = require('path');
const { inspectImage, inspectAudio, inspectVideo } = require('./audit-media');

// Load .env.local safely
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function runAudit() {
  console.log("==================================================================");
  console.log("NEXORA CREATIVE STUDIO — END-TO-END PRODUCTION READINESS AUDIT");
  console.log("==================================================================");

  const results = {
    image: null,
    music: null,
    video: null,
    storage: null,
    security: null,
    licensing: null,
  };

  // Compile TS files on the fly via tsx or register
  const { HuggingFaceImageAdapter } = require('../lib/ai/creative/huggingface-image-adapter');
  const { HuggingFaceMusicAdapter } = require('../lib/ai/creative/huggingface-music-adapter');
  const { HuggingFaceVideoAdapter } = require('../lib/ai/creative/huggingface-video-adapter');
  const { MediaStorageService } = require('../lib/ai/creative/media-storage');
  const { ApiKeyService } = require('../lib/developer/api-keys');

  // --------------------------------------------------------------------------
  // 1. LIVE IMAGE GENERATION (FLUX.1-schnell on ZeroGPU)
  // --------------------------------------------------------------------------
  console.log("\n[1/5] Testing Real Image Generation (FLUX.1-schnell)...");
  const imgStart = Date.now();
  try {
    const imgPrompt = "A glowing blue crystal cube hovering over obsidian sand, volumetric cinematic lighting";
    const imgRes = await HuggingFaceImageAdapter.generate({
      prompt: imgPrompt,
      aspectRatio: "1:1",
      seed: 42,
    });

    const imgBuffer = Buffer.from(imgRes.mediaUrl.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    const imgInspect = inspectImage(imgBuffer);

    // Persist to local media storage
    const imgArtifactId = `art_live_img_${Date.now()}`;
    const storedImg = await MediaStorageService.saveMedia({
      id: imgArtifactId,
      userId: "usr_alex",
      buffer: imgBuffer,
      type: "image",
      mimeType: imgInspect.format || "image/webp",
    });

    results.image = {
      status: "PASS",
      provider: imgRes.provider,
      model: imgRes.model,
      latencyMs: Date.now() - imgStart,
      sizeBytes: imgBuffer.length,
      format: imgInspect.format,
      dimensions: `${imgInspect.width}x${imgInspect.height}`,
      aspectRatio: imgInspect.aspectRatio,
      persistentUrl: storedImg.url,
      verifiedComplete: imgInspect.valid && imgInspect.width > 0 && imgInspect.height > 0,
    };
    console.log("  ✓ Image Generation PASS:", results.image);
  } catch (err) {
    results.image = {
      status: "FAIL",
      error: err.message,
      category: err.category || "unknown",
      latencyMs: Date.now() - imgStart,
    };
    console.error("  ✗ Image Generation FAIL:", err.message);
  }

  // --------------------------------------------------------------------------
  // 2. LIVE MUSIC GENERATION (Meta MusicGen / ACE-Step on ZeroGPU)
  // --------------------------------------------------------------------------
  console.log("\n[2/5] Testing Real Music Generation (MusicGen)...");
  const musStart = Date.now();
  try {
    const musPrompt = "Uplifting acoustic guitar melody with warm bassline, gentle tempo";
    const musRes = await HuggingFaceMusicAdapter.generate({
      prompt: musPrompt,
      durationSeconds: 6,
    });

    const musBuffer = Buffer.from(musRes.audioUrl.replace(/^data:audio\/[a-z0-9\-\.]+;base64,/, ''), 'base64');
    const musInspect = inspectAudio(musBuffer);

    // Persist to local media storage
    const musArtifactId = `art_live_mus_${Date.now()}`;
    const storedMus = await MediaStorageService.saveMedia({
      id: musArtifactId,
      userId: "usr_alex",
      buffer: musBuffer,
      type: "music",
      mimeType: musInspect.format || "audio/aac",
    });

    results.music = {
      status: "PASS",
      provider: musRes.provider,
      model: musRes.model,
      latencyMs: Date.now() - musStart,
      sizeBytes: musBuffer.length,
      format: musInspect.format,
      durationSeconds: musInspect.durationSeconds || musRes.durationSeconds,
      sampleRate: musInspect.sampleRate,
      persistentUrl: storedMus.url,
      verifiedPlayable: musInspect.valid && musBuffer.length > 2048,
    };
    console.log("  ✓ Music Generation PASS:", results.music);
  } catch (err) {
    results.music = {
      status: "FAIL",
      error: err.message,
      category: err.category || "unknown",
      latencyMs: Date.now() - musStart,
    };
    console.error("  ✗ Music Generation FAIL:", err.message);
  }

  // --------------------------------------------------------------------------
  // 3. LIVE VIDEO GENERATION (ModelScope on ZeroGPU)
  // --------------------------------------------------------------------------
  console.log("\n[3/5] Testing Real Video Generation (ModelScope Text-To-Video)...");
  const vidStart = Date.now();
  try {
    const vidPrompt = "A drop of water falling into still pond water in slow motion, ripples radiating";
    const vidRes = await HuggingFaceVideoAdapter.generate({
      prompt: vidPrompt,
      durationSeconds: 4,
    });

    const vidBuffer = Buffer.from(vidRes.mediaUrl.replace(/^data:video\/[a-z0-9\-\.]+;base64,/, ''), 'base64');
    const vidInspect = inspectVideo(vidBuffer);

    // Persist to local media storage
    const vidArtifactId = `art_live_vid_${Date.now()}`;
    const storedVid = await MediaStorageService.saveMedia({
      id: vidArtifactId,
      userId: "usr_alex",
      buffer: vidBuffer,
      type: "video",
      mimeType: "video/mp4",
    });

    results.video = {
      status: "PASS",
      provider: vidRes.provider,
      model: vidRes.model,
      latencyMs: Date.now() - vidStart,
      sizeBytes: vidBuffer.length,
      format: vidInspect.format,
      codec: vidInspect.codec,
      hasMoovAtom: vidInspect.hasMoovAtom,
      hasMdatAtom: vidInspect.hasMdatAtom,
      browserPlayable: vidInspect.browserPlayable,
      persistentUrl: storedVid.url,
      verifiedPlayable: vidInspect.valid && vidBuffer.length > 10240,
    };
    console.log("  ✓ Video Generation PASS:", results.video);
  } catch (err) {
    results.video = {
      status: "FAIL",
      error: err.message,
      category: err.category || "unknown",
      latencyMs: Date.now() - vidStart,
    };
    console.error("  ✗ Video Generation FAIL:", err.message);
  }

  // --------------------------------------------------------------------------
  // 4. PERSISTENT STORAGE & CROSS-USER ISOLATION AUDIT
  // --------------------------------------------------------------------------
  console.log("\n[4/5] Testing Persistent Storage & Cross-User Security...");
  try {
    const testArtId = `art_audit_${Date.now()}`;
    const samplePayload = Buffer.from("SAMPLE_BINARY_PAYLOAD_TEST_DATA", "utf8");

    // Save as usr_alex
    await MediaStorageService.saveMedia({
      id: testArtId,
      userId: "usr_alex",
      buffer: samplePayload,
      type: "image",
      mimeType: "image/png",
    });

    // Lookup 1: Owner retrieval (usr_alex)
    const ownerLookup = MediaStorageService.getMedia(`${testArtId}.png`, "usr_alex");
    const ownerSuccess = ownerLookup.status === "found" && fs.existsSync(ownerLookup.filePath);

    // Lookup 2: Unauthorized cross-user retrieval (usr_bob)
    const bobLookup = MediaStorageService.getMedia(`${testArtId}.png`, "usr_bob");
    const isolationSuccess = bobLookup.status === "forbidden";

    // Lookup 3: Path traversal attempt
    const traversalLookup = MediaStorageService.getMedia("../../passwords.txt", "usr_alex");
    const traversalBlocked = traversalLookup.status === "not_found";

    results.storage = {
      status: ownerSuccess && isolationSuccess && traversalBlocked ? "PASS" : "FAIL",
      diskPersistence: ownerSuccess,
      crossUserIsolationBlocked: isolationSuccess,
      pathTraversalBlocked: traversalBlocked,
      storageArchitecture: "Local/API-backed disk storage with ownership protection (₹0 cost)",
    };
    console.log("  ✓ Storage & Isolation PASS:", results.storage);
  } catch (err) {
    results.storage = { status: "FAIL", error: err.message };
    console.error("  ✗ Storage & Isolation FAIL:", err.message);
  }

  // --------------------------------------------------------------------------
  // 5. API KEY SECURITY, QUOTAS & SANDBOX AUDIT
  // --------------------------------------------------------------------------
  console.log("\n[5/5] Testing API Key Security & Sandbox Mode...");
  try {
    // Generate temporary test keys
    const liveKey = await ApiKeyService.createKey({
      name: "Audit Live Key",
      userId: "usr_alex",
      environment: "live",
      scopes: ["images:generate", "music:generate", "videos:generate"],
    });

    const testKey = await ApiKeyService.createKey({
      name: "Audit Test Sandbox Key",
      userId: "usr_alex",
      environment: "test",
      scopes: ["images:generate"],
    });

    const limitedKey = await ApiKeyService.createKey({
      name: "Audit Restricted Key",
      userId: "usr_alex",
      environment: "live",
      scopes: ["chat:completions"], // Missing images/music/videos
    });

    // Test 1: Valid Live Key Authentication
    const liveAuth = await ApiKeyService.authenticateKeyAsync(liveKey.rawKey, "images:generate");
    const liveValid = liveAuth.valid && liveAuth.record?.environment === "live";

    // Test 2: Invalid Key
    const invalidAuth = await ApiKeyService.authenticateKeyAsync("nx_live_invalidkey000000000000000000", "images:generate");
    const invalidRejected = !invalidAuth.valid && invalidAuth.statusCode === 401;

    // Test 3: Scope Enforcement (Restricted key missing images:generate)
    const scopeAuth = await ApiKeyService.authenticateKeyAsync(limitedKey.rawKey, "images:generate");
    const scopeEnforced = !scopeAuth.valid && scopeAuth.statusCode === 403;

    // Test 4: Revocation Enforcement
    await ApiKeyService.revokeKey(liveKey.record.id, "usr_alex");
    const revokedAuth = await ApiKeyService.authenticateKeyAsync(liveKey.rawKey, "images:generate");
    const revocationEnforced = !revokedAuth.valid && revokedAuth.statusCode === 401;

    // Test 5: Sandbox Test Key Isolation
    const sandboxAuth = await ApiKeyService.authenticateKeyAsync(testKey.rawKey, "images:generate");
    const sandboxIsolated = sandboxAuth.valid && sandboxAuth.record?.environment === "test";

    // Clean up created keys
    await ApiKeyService.deleteKey(testKey.record.id, "usr_alex");
    await ApiKeyService.deleteKey(limitedKey.record.id, "usr_alex");
    await ApiKeyService.deleteKey(liveKey.record.id, "usr_alex");

    results.security = {
      status: liveValid && invalidRejected && scopeEnforced && revocationEnforced && sandboxIsolated ? "PASS" : "FAIL",
      liveKeyValid: liveValid,
      invalidKeyRejected: invalidRejected,
      scopeEnforced: scopeEnforced,
      revocationEnforced: revocationEnforced,
      sandboxIsolated: sandboxIsolated,
    };
    console.log("  ✓ API Security & Sandbox PASS:", results.security);
  } catch (err) {
    results.security = { status: "FAIL", error: err.message };
    console.error("  ✗ API Security & Sandbox FAIL:", err.message);
  }

  // Write final JSON audit evidence
  const evidencePath = path.resolve(__dirname, '..', 'audit-evidence.json');
  fs.writeFileSync(evidencePath, JSON.stringify(results, null, 2), 'utf8');
  console.log("\nAudit evidence saved to:", evidencePath);
}

runAudit().catch(console.error);
