/**
 * NEXORA ZERO-BUDGET HUGGING FACE ZEROGPU GRADIO CLIENT
 *
 * Direct zero-dependency client for Hugging Face Spaces running Gradio v4, v5, and v6.
 * Connects to public ZeroGPU Spaces without paid API credits or third-party SDK dependencies.
 *
 * Supported Flow:
 * 1. POST /gradio_api/queue/join (or /queue/join) with payload:
 *    { data: [...], fn_index: number, session_hash: string }
 * 2. GET /gradio_api/queue/data?session_hash=<hash> (SSE stream)
 * 3. Listen for events: estimation, process_starts, process_generating, process_completed
 * 4. Extract generated media FileData, handle HLS/AAC streams, download and return buffer/data URI.
 *
 * Rules:
 * - Server-only execution.
 * - Never log or expose HF_TOKEN in errors, diagnostic messages, or client payloads.
 * - Strict timeout protection with AbortController.
 * - Validate magic bytes on every downloaded binary payload.
 */

import { randomBytes } from "crypto";

export interface ZeroGpuJobOptions {
  spaceId: string;
  fnIndex: number;
  data: any[];
  timeoutMs?: number;
  token?: string;
  onProgress?: (status: string, rank?: number) => void;
}

export interface ZeroGpuFileResult {
  url: string;
  origName?: string;
  mimeType?: string;
  size?: number;
  buffer: Buffer;
  dataUri: string;
}

export class ZeroGpuGradioClient {
  /**
   * Normalizes Hugging Face Space ID to its public hf.space subdomain.
   * e.g. "black-forest-labs/FLUX.1-schnell" -> "black-forest-labs-flux-1-schnell.hf.space"
   */
  static getSpaceHost(spaceId: string): string {
    if (spaceId.includes(".hf.space")) {
      return spaceId.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    }
    const cleanId = spaceId.trim().toLowerCase().replace(/[\._\/]/g, "-");
    return `${cleanId}.hf.space`;
  }

  /**
   * Invokes a ZeroGPU Gradio endpoint and awaits completion.
   */
  static async runJob(options: ZeroGpuJobOptions): Promise<any> {
    const {
      spaceId,
      fnIndex,
      data,
      timeoutMs = 60000,
      token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "",
      onProgress,
    } = options;

    const host = this.getSpaceHost(spaceId);
    const session_hash = randomBytes(8).toString("hex");

    const payload = JSON.stringify({
      data,
      event_data: null,
      fn_index: fnIndex,
      trigger_id: null,
      session_hash,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Nexora/1.0 (ZeroGPU-Client)",
    };

    const cleanToken = token.trim();
    const hasValidToken =
      cleanToken &&
      !cleanToken.includes("placeholder") &&
      !cleanToken.includes("your-hf-token");

    if (hasValidToken) {
      headers["Authorization"] = `Bearer ${cleanToken}`;
    }

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Step 1: Join Gradio Queue (try /gradio_api/queue/join then /queue/join)
      let joinEndpoint = `https://${host}/gradio_api/queue/join`;
      let joinRes = await fetch(joinEndpoint, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      }).catch(async () => {
        // Fallback to legacy path
        joinEndpoint = `https://${host}/queue/join`;
        return fetch(joinEndpoint, {
          method: "POST",
          headers,
          body: payload,
          signal: controller.signal,
        });
      });

      if (!joinRes.ok) {
        // Retry legacy path if gradio_api returned 404
        if (joinRes.status === 404 && !joinEndpoint.endsWith("/queue/join")) {
          joinEndpoint = `https://${host}/queue/join`;
          joinRes = await fetch(joinEndpoint, {
            method: "POST",
            headers,
            body: payload,
            signal: controller.signal,
          });
        }
      }

      if (!joinRes.ok) {
        const status = joinRes.status;
        const errText = await joinRes.text().catch(() => "");
        if (status === 401) {
          const err: any = new Error(
            `Hugging Face Error: Invalid access token (HTTP 401). Please verify your HF_TOKEN in .env.local.`
          );
          err.category = "invalid_credentials";
          throw err;
        }
        if (status === 429) {
          const err: any = new Error("Hugging Face ZeroGPU Space is currently rate-limited or busy. Rate limit exceeded.");
          err.category = "rate_limited";
          throw err;
        }
        if (status === 503 || status === 504) {
          let waitMsg = "";
          try {
            const j = JSON.parse(errText);
            if (j.estimated_time) {
              waitMsg = ` (estimated loading time: ${Math.round(j.estimated_time)}s)`;
            }
          } catch {}
          const err: any = new Error(
            `Hugging Face Space is currently sleeping or restarting. Please try again in 30 seconds.${waitMsg}`
          );
          err.category = "provider_unavailable";
          throw err;
        }
        const err: any = new Error(`Hugging Face Space queue error (HTTP ${status}): ${errText.slice(0, 150)}`);
        err.category = "provider_error";
        throw err;
      }

      // Step 2: Connect to SSE stream
      let sseEndpoint = `https://${host}/gradio_api/queue/data?session_hash=${session_hash}`;
      const sseHeaders: Record<string, string> = {
        Accept: "text/event-stream",
        "User-Agent": "Nexora/1.0",
      };
      if (hasValidToken) {
        sseHeaders["Authorization"] = `Bearer ${cleanToken}`;
      }

      let sseRes = await fetch(sseEndpoint, {
        headers: sseHeaders,
        signal: controller.signal,
      }).catch(async () => {
        sseEndpoint = `https://${host}/queue/data?session_hash=${session_hash}`;
        return fetch(sseEndpoint, {
          headers: sseHeaders,
          signal: controller.signal,
        });
      });

      if (!sseRes.ok && sseRes.status === 404) {
        sseEndpoint = `https://${host}/queue/data?session_hash=${session_hash}`;
        sseRes = await fetch(sseEndpoint, {
          headers: sseHeaders,
          signal: controller.signal,
        });
      }

      if (!sseRes.ok || !sseRes.body) {
        const err: any = new Error(`Failed to open Gradio event stream (HTTP ${sseRes.status})`);
        err.category = "provider_unavailable";
        throw err;
      }

      // Step 3: Stream and parse SSE messages
      const reader = sseRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const rawJson = line.slice(6).trim();
            if (!rawJson) continue;

            let msg: any;
            try {
              msg = JSON.parse(rawJson);
            } catch {
              continue;
            }

            if (msg.msg === "estimation" && onProgress) {
              onProgress("queued", msg.rank);
            } else if (msg.msg === "process_starts" && onProgress) {
              onProgress("generating");
            } else if (msg.msg === "process_generating" && onProgress) {
              onProgress("generating");
            } else if (msg.msg === "process_completed") {
              if (msg.success === false || (msg.output && msg.output.error)) {
                const errMsg =
                  msg.output?.error ||
                  msg.title ||
                  "Hugging Face ZeroGPU computation failed.";
                const err: any = new Error(`ZeroGPU execution error: ${errMsg}`);
                if (/quota|rate.*limit/i.test(errMsg)) {
                  err.category = "quota_exhausted";
                } else {
                  err.category = "provider_error";
                }
                throw err;
              }

              // Return completed output data
              return msg.output?.data;
            } else if (msg.msg === "unexpected_error") {
              const err: any = new Error(`Hugging Face Space error: ${msg.message || "Unknown error"}`);
              err.category = "provider_error";
              throw err;
            }
          }
        }
      }

      throw new Error("Gradio event stream closed unexpectedly before process_completed.");
    } catch (err: any) {
      if (err.name === "AbortError" || /timed out|aborted/i.test(err.message)) {
        const timeoutErr: any = new Error(
          `ZeroGPU inference timed out after ${Math.round(timeoutMs / 1000)}s. The public GPU queue may be congested.`
        );
        timeoutErr.category = "provider_timeout";
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  /**
   * Downloads a media file or HLS/AAC stream produced by Gradio and returns a validated buffer.
   */
  static async downloadGradioMedia(
    spaceHost: string,
    fileData: any,
    token?: string
  ): Promise<ZeroGpuFileResult> {
    const cleanToken = (token || process.env.HF_TOKEN || "").trim();
    const headers: Record<string, string> = {
      "User-Agent": "Nexora/1.0",
    };
    if (cleanToken && !cleanToken.includes("placeholder")) {
      headers["Authorization"] = `Bearer ${cleanToken}`;
    }

    let targetUrl: string;

    if (typeof fileData === "string") {
      targetUrl = fileData.startsWith("http")
        ? fileData
        : `https://${spaceHost}/file=${fileData}`;
    } else if (fileData && typeof fileData === "object" && fileData.url) {
      targetUrl = fileData.url.startsWith("http")
        ? fileData.url
        : `https://${spaceHost}${fileData.url}`;
    } else if (fileData && typeof fileData === "object" && fileData.path) {
      targetUrl = fileData.path.startsWith("http")
        ? fileData.path
        : `https://${spaceHost}/gradio_api/file=${fileData.path}`;
    } else {
      throw new Error("Invalid Gradio FileData output: no path or URL provided.");
    }

    // Special handling for HLS (.m3u8) audio playlist
    if (targetUrl.includes(".m3u8") || fileData?.is_stream) {
      return this.downloadAndAssembleHlsStream(targetUrl, headers);
    }

    // Direct download
    const res = await fetch(targetUrl, { headers });
    if (!res.ok) {
      // Try fallback URL format
      const fallbackUrl = `https://${spaceHost}/file=${fileData.path || fileData}`;
      const fallbackRes = await fetch(fallbackUrl, { headers }).catch(() => null);
      if (fallbackRes && fallbackRes.ok) {
        const buf = Buffer.from(await fallbackRes.arrayBuffer());
        return this.formatBufferResult(buf, fileData, fallbackUrl);
      }
      throw new Error(`Failed to download generated media from Hugging Face (HTTP ${res.status}).`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    return this.formatBufferResult(buffer, fileData, targetUrl);
  }

  /**
   * Downloads all segments of an HLS/AAC stream and concatenates them into a single audio file.
   */
  private static async downloadAndAssembleHlsStream(
    m3u8Url: string,
    headers: Record<string, string>
  ): Promise<ZeroGpuFileResult> {
    const playlistRes = await fetch(m3u8Url, { headers });
    if (!playlistRes.ok) {
      throw new Error(`Failed to fetch HLS audio playlist (HTTP ${playlistRes.status})`);
    }
    const playlistText = await playlistRes.text();
    const segmentNames = playlistText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    if (segmentNames.length === 0) {
      throw new Error("HLS audio playlist contained no playable segments.");
    }

    const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);
    const chunkBuffers: Buffer[] = [];

    for (const seg of segmentNames) {
      const segUrl = seg.startsWith("http") ? seg : `${baseUrl}${seg}`;
      const segRes = await fetch(segUrl, { headers });
      if (segRes.ok) {
        chunkBuffers.push(Buffer.from(await segRes.arrayBuffer()));
      }
    }

    const combined = Buffer.concat(chunkBuffers);
    if (combined.length < 1024) {
      throw new Error("Assembled audio file is empty or truncated (< 1KB).");
    }

    const mimeType = "audio/aac";
    const dataUri = `data:${mimeType};base64,${combined.toString("base64")}`;

    return {
      url: m3u8Url,
      origName: "generated_music.aac",
      mimeType,
      size: combined.length,
      buffer: combined,
      dataUri,
    };
  }

  private static formatBufferResult(
    buffer: Buffer,
    fileData: any,
    url: string
  ): ZeroGpuFileResult {
    let mimeType = fileData?.mime_type;

    // Detect MIME type from magic bytes if missing or generic
    if (!mimeType || mimeType === "application/octet-stream") {
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        mimeType = "image/png";
      } else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        mimeType = "image/jpeg";
      } else if (buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WEBP") {
        mimeType = "image/webp";
      } else if (buffer.toString("utf8", 4, 8) === "ftyp" || buffer.includes(Buffer.from("ftyp"))) {
        mimeType = "video/mp4";
      } else if (buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) {
        mimeType = "audio/aac";
      } else if (buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WAVE") {
        mimeType = "audio/wav";
      }
    }

    if (!mimeType || mimeType === "application/octet-stream") {
      const name = (fileData?.orig_name || fileData?.path || url).toLowerCase();
      if (name.endsWith(".webp")) mimeType = "image/webp";
      else if (name.endsWith(".png")) mimeType = "image/png";
      else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (name.endsWith(".mp4")) mimeType = "video/mp4";
      else if (name.endsWith(".aac")) mimeType = "audio/aac";
      else if (name.endsWith(".wav")) mimeType = "audio/wav";
      else if (name.endsWith(".mp3")) mimeType = "audio/mp3";
      else mimeType = "application/octet-stream";
    }

    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return {
      url,
      origName: fileData?.orig_name || "output",
      mimeType,
      size: buffer.length,
      buffer,
      dataUri,
    };
  }
}
