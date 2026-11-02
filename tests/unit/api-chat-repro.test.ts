import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

describe("API CHAT ROUTE REPRODUCTION", () => {
  it("calls POST /api/chat with 'i want to create a image of a sports car'", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: "test_conv_123",
        modelSelectionId: "nexora-core",
        messages: [
          {
            role: "user",
            content: "i want to create a image of a sports car",
          },
        ],
        planTier: "pro",
        userId: "usr_test",
      }),
    });

    console.log("Invoking POST /api/chat...");
    const response = await POST(req);
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (response.status !== 200) {
      const errJson = await response.json();
      console.log("Error JSON:", errJson);
    } else {
      const text = await response.text();
      console.log("Response stream length:", text.length);
      console.log("Response stream preview:", text.slice(0, 500));
    }

    expect(response.status).toBe(200);
  }, 45000);
});

