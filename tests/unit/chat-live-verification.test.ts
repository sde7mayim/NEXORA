import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";
import { ProviderStatusService } from "@/lib/ai/provider-status";

describe("Live AI Chat Verification", () => {
  it("executes POST /api/chat with test prompt 'Explain what Nexora is in one sentence.'", async () => {
    const configuredProviders = ProviderStatusService.getConfiguredProviders();
    console.log("Configured providers detected:", configuredProviders);

    const startTime = Date.now();
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: "conv_live_verify_001",
        modelSelectionId: "nexora-core",
        messages: [
          {
            role: "user",
            content: "Explain what Nexora is in one sentence.",
          },
        ],
        planTier: "pro",
        userId: "usr_verify",
      }),
    });

    const response = await POST(req);
    const latencyMs = Date.now() - startTime;
    const status = response.status;
    const headers = Object.fromEntries(response.headers.entries());

    let responseText = "";
    if (response.body) {
      responseText = await response.text();
    }

    console.log("--- CHAT EXECUTION RECORD ---");
    console.log("HTTP Status:", status);
    console.log("Latency (ms):", latencyMs);
    console.log("Headers:", headers);
    console.log("Response text length:", responseText.length);
    console.log("Response sample:", responseText.slice(0, 300));

    expect(status).toBe(200);
    if (configuredProviders.length === 0) {
      console.log("Status: NOT_CONFIGURED (Zero AI providers configured)");
      expect(responseText).toContain("[AI Provider Notice: No AI Providers Configured]");
    }
  }, 30000);
});
