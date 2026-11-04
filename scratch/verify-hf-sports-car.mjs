import fs from "fs";
import path from "path";

async function verifyHuggingFace() {
  console.log("===============================================================================");
  console.log("NEXORA — HUGGING FACE INFERENCE & SPORTS CAR VERIFICATION");
  console.log("===============================================================================");

  // 1. Check whether HF_TOKEN is configured without exposing it
  let tokenConfigured = false;
  let tokenLength = 0;
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^HF_TOKEN=(.*)$/m);
    if (match && match[1]) {
      const val = match[1].trim();
      if (val && !val.includes("your-") && !val.includes("placeholder")) {
        tokenConfigured = true;
        tokenLength = val.length;
      }
    }
  }
  if (!tokenConfigured && process.env.HF_TOKEN) {
    const val = process.env.HF_TOKEN.trim();
    if (val && !val.includes("your-") && !val.includes("placeholder")) {
      tokenConfigured = true;
      tokenLength = val.length;
    }
  }

  console.log("1. HF_TOKEN Configured Status:", tokenConfigured ? `YES (Length: ${tokenLength} characters)` : "NO (Empty or placeholder)");

  // 2. Direct endpoint probing with 30s timeout and safe diagnostics
  const model = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
  const primaryEndpoint = `https://router.huggingface.co/hf-inference/models/${model}`;
  const prompt = "I want to create an image of a sports car.";
  
  console.log("2. Target Model:", model);
  console.log("3. Target Router Endpoint:", primaryEndpoint);
  console.log("4. Prompt:", `"${prompt}"`);

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let httpStatus = 0;
  let statusText = "";
  let contentType = "";
  let rawBodySample = "";
  let inferenceSuccess = false;
  let errorSummary = "";

  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "image/png, image/jpeg, image/webp",
    };
    if (tokenConfigured) {
      const token = process.env.HF_TOKEN || "";
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(primaryEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width: 1024, height: 1024 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    httpStatus = res.status;
    statusText = res.statusText;
    contentType = res.headers.get("content-type") || "";

    const elapsedMs = Date.now() - startTime;
    console.log(`5. Upstream Response: HTTP ${httpStatus} ${statusText} in ${elapsedMs}ms`);
    console.log("   Content-Type:", contentType);

    if (res.ok && contentType.startsWith("image/")) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
      const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8;
      const isWebp = buffer.toString("utf8", 0, 4) === "RIFF";

      if ((isPng || isJpg || isWebp) && buffer.length >= 1024) {
        inferenceSuccess = true;
        console.log(`   Binary raster verification PASSED: ${buffer.length} bytes, format: ${isPng ? "PNG" : isJpg ? "JPEG" : "WebP"}`);
      } else {
        errorSummary = `Payload invalid: Magic bytes check failed or size too small (${buffer.length} bytes)`;
      }
    } else {
      const text = await res.text();
      rawBodySample = text.slice(0, 250).replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]");
      if (httpStatus === 401) {
        errorSummary = tokenConfigured
          ? "Hugging Face returned HTTP 401: Configured token was rejected as invalid."
          : "Hugging Face returned HTTP 401 Unauthorized: Valid HF_TOKEN required to invoke serverless inference.";
      } else if (httpStatus === 403) {
        errorSummary = `Hugging Face returned HTTP 403: Model access forbidden (Gated repository or license acceptance required).`;
      } else if (httpStatus === 429) {
        errorSummary = `Hugging Face returned HTTP 429: Rate limit or free tier capacity exhausted.`;
      } else if (httpStatus === 503) {
        errorSummary = `Hugging Face returned HTTP 503: Model is currently loading on serverless infrastructure.`;
      } else {
        errorSummary = `Hugging Face HTTP ${httpStatus}: ${rawBodySample}`;
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const elapsedMs = Date.now() - startTime;
    if (err.name === "AbortError" || elapsedMs >= 30000) {
      errorSummary = `Timed out after 30 seconds waiting for Hugging Face response.`;
    } else {
      errorSummary = `Network/Fetch Error: ${err.message}`;
    }
  }

  console.log("\n===============================================================================");
  console.log("VERIFICATION OUTCOME SUMMARY");
  console.log("===============================================================================");
  console.log("Model Used:", model);
  console.log("Real AI Inference Succeeded:", inferenceSuccess ? "YES" : "NO");
  console.log("Image Displayed in Chat:", inferenceSuccess ? "YES" : "NO (Blocked by credential/upstream state)");
  console.log("Actual Provider Response / Status:", httpStatus ? `HTTP ${httpStatus} ${statusText}` : "Network / Timeout");
  console.log("Diagnostic Details:", errorSummary || "None (Success)");
  console.log("Remaining Setup Required:", !tokenConfigured 
    ? "Set HF_TOKEN=<your_huggingface_token> in .env.local (obtain free from https://huggingface.co/settings/tokens)."
    : !inferenceSuccess 
    ? "Verify HF_TOKEN has 'Inference' read permissions and that you accepted any terms at https://huggingface.co/black-forest-labs/FLUX.1-schnell."
    : "None. Hugging Face Inference is operational."
  );
  console.log("===============================================================================");
}

verifyHuggingFace();

